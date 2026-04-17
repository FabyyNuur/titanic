from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from mlops.infrastructure.monitoring_repository import load_monitoring_log, save_monitoring_log


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_prediction(latency_ms: float, prediction: int | float | str, feature_dict: dict) -> None:
    log_payload = load_monitoring_log()
    log_payload["requests"] += 1
    latency_value = float(latency_ms)
    prediction_value = str(prediction)

    log_payload["latency_ms"].append(latency_value)
    log_payload["predictions"].append(prediction_value)
    log_payload["feature_snapshots"].append(feature_dict)

    aggregates = log_payload.setdefault("aggregates", {"latency_sum_ms": 0.0, "prediction_counts": {}})
    aggregates["latency_sum_ms"] = float(aggregates.get("latency_sum_ms", 0.0)) + latency_value
    pred_counts = aggregates.setdefault("prediction_counts", {})
    pred_counts[prediction_value] = int(pred_counts.get(prediction_value, 0)) + 1

    save_monitoring_log(log_payload)


def summarize_metrics() -> dict:
    log_payload = load_monitoring_log()
    latencies = log_payload.get("latency_ms", [])
    aggregates = log_payload.get("aggregates", {})

    pred_counts = aggregates.get("prediction_counts", {}) if isinstance(aggregates, dict) else {}
    pred_counter = Counter({str(k): int(v) for k, v in pred_counts.items()})

    total_requests = int(log_payload.get("requests", 0))
    total_preds = sum(pred_counter.values())
    if total_preds == 0:
        predictions = log_payload.get("predictions", [])
        pred_counter = Counter([str(p) for p in predictions])
        total_preds = sum(pred_counter.values())

    denominator = total_preds or 1

    latency_sum_ms = float(aggregates.get("latency_sum_ms", 0.0)) if isinstance(aggregates, dict) else 0.0
    avg_latency_ms = (latency_sum_ms / total_requests) if total_requests else (float(np.mean(latencies)) if latencies else 0.0)

    return {
        "requests": total_requests,
        "avg_latency_ms": avg_latency_ms,
        "p95_latency_ms": float(np.percentile(latencies, 95)) if latencies else 0.0,
        "class_distribution": pred_counter,
        "class_ratio": {k: v / denominator for k, v in pred_counter.items()},
        "alerts_count": len(log_payload.get("alerts", [])),
    }


def _psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]
    if expected.size == 0 or actual.size == 0:
        return 0.0

    quantiles = np.linspace(0, 100, bins + 1)
    breakpoints = np.percentile(expected, quantiles)
    breakpoints = np.unique(breakpoints)
    if len(breakpoints) < 3:
        return 0.0

    expected_counts, _ = np.histogram(expected, bins=breakpoints)
    actual_counts, _ = np.histogram(actual, bins=breakpoints)
    expected_pct = expected_counts / max(expected_counts.sum(), 1)
    actual_pct = actual_counts / max(actual_counts.sum(), 1)

    epsilon = 1e-6
    expected_pct = np.where(expected_pct == 0, epsilon, expected_pct)
    actual_pct = np.where(actual_pct == 0, epsilon, actual_pct)
    return float(np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct)))


def detect_drift(
    reference_df: pd.DataFrame,
    recent_df: pd.DataFrame,
    numeric_columns: list[str] | None = None,
    psi_threshold: float = 0.2,
) -> list[dict]:
    numeric_columns = numeric_columns or reference_df.select_dtypes(include=["number"]).columns.tolist()
    alerts: list[dict] = []
    for col in numeric_columns:
        if col not in recent_df.columns:
            continue
        score = _psi(reference_df[col].to_numpy(), recent_df[col].to_numpy())
        if score >= psi_threshold and not math.isnan(score):
            alerts.append(
                {
                    "timestamp": _now_iso(),
                    "type": "drift",
                    "feature": col,
                    "psi": score,
                    "threshold": psi_threshold,
                }
            )
    if alerts:
        log_payload = load_monitoring_log()
        log_payload.setdefault("alerts", []).extend(alerts)
        save_monitoring_log(log_payload)
    return alerts

