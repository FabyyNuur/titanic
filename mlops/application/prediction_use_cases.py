from __future__ import annotations

import io
import time
from collections import Counter
from pathlib import Path

import pandas as pd

from mlops.application.model_use_cases import (
    load_legacy_model_from_version,
    load_runtime_artifacts,
    preprocess_for_legacy,
)
from mlops.domain.monitoring_domain import log_prediction
from mlops.domain.pipeline_domain import validate_schema

ALLOWED_EXTENSIONS = {".csv", ".txt", ".json", ".xlsx"}


def load_dataframe_from_upload(file_storage) -> pd.DataFrame:
    filename = file_storage.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise ValueError(f"Extension non supportee: {extension or 'inconnue'}. Extensions autorisees: {allowed}")
    if extension == ".csv":
        return pd.read_csv(file_storage)
    if extension == ".txt":
        content = file_storage.stream.read()
        text = content.decode("utf-8", errors="ignore")
        if not text.strip():
            raise ValueError("Le fichier texte est vide.")
        try:
            import csv

            sep = csv.Sniffer().sniff(text[:1024], delimiters=",;\t|").delimiter
        except Exception:
            sep = ","
        return pd.read_csv(io.StringIO(text), sep=sep)
    if extension == ".json":
        return pd.read_json(file_storage)
    if extension == ".xlsx":
        try:
            return pd.read_excel(file_storage)
        except ImportError as exc:
            raise ValueError("Lecture .xlsx indisponible: installe 'openpyxl'.") from exc
    raise ValueError("Format de fichier non pris en charge.")


def _extract_probabilities(model, transformed) -> list[float] | None:
    if not hasattr(model, "predict_proba"):
        return None
    raw_proba = model.predict_proba(transformed)
    if getattr(raw_proba, "shape", (0, 0))[1] > 1:
        return raw_proba[:, 1].astype(float).tolist()
    return raw_proba[:, 0].astype(float).tolist()


def predict_with_registry_model(df: pd.DataFrame, requested_version: str | None):
    model, pipeline_bundle, model_record = load_runtime_artifacts(version=requested_version)
    df_valid = validate_schema(df, pipeline_bundle["features"])
    transformed = pipeline_bundle["pipeline"].transform(df_valid)
    predictions = model.predict(transformed).tolist()
    probabilities = _extract_probabilities(model, transformed)
    return predictions, probabilities, model_record, df_valid


def predict_with_legacy_model(df: pd.DataFrame, requested_version: str):
    model, expected_features, model_record = load_legacy_model_from_version(requested_version)
    if not expected_features:
        raise ValueError("Le modèle sélectionné ne contient pas de schéma de features.")
    df_valid = preprocess_for_legacy(df, expected_features)
    predictions = model.predict(df_valid).tolist()
    probabilities = _extract_probabilities(model, df_valid)
    return predictions, probabilities, model_record, df_valid


def build_predictions_payload(predictions: list, probabilities: list[float] | None, latency_ms: float) -> dict:
    total_rows = len(predictions)
    distribution = Counter([str(p) for p in predictions])
    ratios = {label: count / total_rows for label, count in distribution.items()} if total_rows else {}
    interpretation = []
    if distribution:
        major_class, major_count = distribution.most_common(1)[0]
        interpretation.append(
            f"Classe majoritaire: {major_class} ({major_count}/{total_rows}, soit {major_count / max(total_rows, 1):.1%})."
        )
        if major_count / max(total_rows, 1) >= 0.9:
            interpretation.append("Alerte: distribution tres asymetrique, verifier la derive des donnees.")
    if probabilities:
        interpretation.append(f"Confiance moyenne (classe positive): {sum(probabilities) / len(probabilities):.2%}.")
    return {
        "total_rows": total_rows,
        "distribution": dict(distribution),
        "ratios": ratios,
        "latency_total_ms": latency_ms,
        "latency_avg_ms": (latency_ms / total_rows) if total_rows else 0.0,
        "interpretation": interpretation or ["Aucune interpretation disponible."],
    }


def predict_file(df: pd.DataFrame, requested_version: str | None):
    start = time.perf_counter()
    if requested_version and requested_version.startswith("legacy::"):
        predictions, probabilities, model_record, df_valid = predict_with_legacy_model(df, requested_version)
    else:
        predictions, probabilities, model_record, df_valid = predict_with_registry_model(df, requested_version)
    latency_ms = (time.perf_counter() - start) * 1000
    for row, pred in zip(df_valid.to_dict(orient="records"), predictions):
        log_prediction(latency_ms=latency_ms / max(len(predictions), 1), prediction=pred, feature_dict=row)
    return predictions, probabilities, model_record, df_valid, latency_ms

