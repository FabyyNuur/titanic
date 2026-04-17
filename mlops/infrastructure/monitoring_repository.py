from __future__ import annotations

import json
import os
from pathlib import Path

from mlops.config.settings import MONITORING_LOG_PATH


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except ValueError:
        return default


MAX_LATENCY_POINTS = _int_env("MLOPS_MONITORING_MAX_LATENCY_POINTS", 5000)
MAX_PREDICTION_POINTS = _int_env("MLOPS_MONITORING_MAX_PREDICTION_POINTS", 5000)
MAX_FEATURE_SNAPSHOTS = _int_env("MLOPS_MONITORING_MAX_FEATURE_SNAPSHOTS", 2000)
MAX_ALERTS = _int_env("MLOPS_MONITORING_MAX_ALERTS", 1000)


def _default_payload() -> dict:
    return {
        "requests": 0,
        "latency_ms": [],
        "predictions": [],
        "feature_snapshots": [],
        "alerts": [],
        "aggregates": {
            "latency_sum_ms": 0.0,
            "prediction_counts": {},
        },
    }


def _trim_sequence(values: list, max_len: int) -> list:
    if len(values) <= max_len:
        return values
    return values[-max_len:]


def _normalize_payload(payload: dict) -> dict:
    normalized = _default_payload()
    normalized["requests"] = int(payload.get("requests", 0))
    normalized["latency_ms"] = list(payload.get("latency_ms", []))
    normalized["predictions"] = list(payload.get("predictions", []))
    normalized["feature_snapshots"] = list(payload.get("feature_snapshots", []))
    normalized["alerts"] = list(payload.get("alerts", []))

    aggregates = payload.get("aggregates", {}) if isinstance(payload.get("aggregates"), dict) else {}
    prediction_counts = aggregates.get("prediction_counts", {})
    if not isinstance(prediction_counts, dict):
        prediction_counts = {}
    normalized["aggregates"] = {
        "latency_sum_ms": float(aggregates.get("latency_sum_ms", sum(normalized["latency_ms"]))),
        "prediction_counts": {str(k): int(v) for k, v in prediction_counts.items()},
    }
    return normalized


def load_monitoring_log(path: Path = MONITORING_LOG_PATH) -> dict:
    if not path.exists():
        return _default_payload()
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    return _normalize_payload(payload)


def save_monitoring_log(payload: dict, path: Path = MONITORING_LOG_PATH) -> None:
    normalized = _normalize_payload(payload)
    normalized["latency_ms"] = _trim_sequence(normalized["latency_ms"], MAX_LATENCY_POINTS)
    normalized["predictions"] = _trim_sequence(normalized["predictions"], MAX_PREDICTION_POINTS)
    normalized["feature_snapshots"] = _trim_sequence(normalized["feature_snapshots"], MAX_FEATURE_SNAPSHOTS)
    normalized["alerts"] = _trim_sequence(normalized["alerts"], MAX_ALERTS)

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)

