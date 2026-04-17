from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from mlops.config.settings import (
    LEGACY_MODELS_DIR,
    MODELS_DIR,
    PIPELINE_ARTIFACT_PATH,
    PROJECT_ROOT,
    REGISTRY_PATH,
)
from mlops.domain.pipeline_domain import validate_schema
from mlops.infrastructure.registry_repository import load_registry

ASSIGNMENT_MODELS = [
    ("logistic_regression", "Régression Logistique", "Logistic_Regression.joblib"),
    ("knn", "KNN", "KNN.joblib"),
    ("decision_tree", "Arbre de décision", "Decision_Tree.joblib"),
    ("random_forest", "Random Forest", "Random_Forest.joblib"),
    ("gradient_boosting", "Gradient Boosting", "Gradient_Boosting.joblib"),
    ("svm", "SVM", "SVM.joblib"),
    ("naive_bayes", "Naive Bayes", "Naive_Bayes.joblib"),
    ("xgboost", "XGBoost", "XGBoost.joblib"),
]


def resolve_artifact_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def select_model_record(version: str | None = None) -> dict:
    registry = load_registry(REGISTRY_PATH)
    models = registry.get("models", [])
    if not models:
        models = discover_runtime_models_catalog()
    if not models:
        raise ValueError("Aucun modele enregistre dans le registre.")
    if version:
        for record in models:
            if record.get("version") == version:
                return record
        raise ValueError(f"Version de modele introuvable: {version}")
    production_models = [record for record in models if record.get("stage") == "production"]
    return production_models[-1] if production_models else models[-1]


def _iso_from_mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def _model_version_from_path(path: Path) -> str:
    stem = path.stem
    if stem.startswith("model_"):
        return stem.replace("model_", "", 1)
    return stem


def discover_runtime_models_catalog() -> list[dict[str, Any]]:
    model_paths = sorted(MODELS_DIR.glob("model_*.joblib"), key=lambda p: p.stat().st_mtime)
    if not model_paths:
        return []

    pipeline_exists = PIPELINE_ARTIFACT_PATH.exists()
    records: list[dict[str, Any]] = []
    for index, model_path in enumerate(model_paths):
        version = _model_version_from_path(model_path)
        records.append(
            {
                "version": version,
                "created_at": _iso_from_mtime(model_path),
                "model_path": str(model_path.relative_to(PROJECT_ROOT)),
                "pipeline_path": str(PIPELINE_ARTIFACT_PATH.relative_to(PROJECT_ROOT)),
                "metrics": {},
                "features": [],
                "stage": "production" if index == len(model_paths) - 1 else "staging",
                "source": "runtime_fallback",
                "display_name": f"Version MLOps {version}",
                "available": model_path.exists() and pipeline_exists,
            }
        )

    return list(reversed(records))


def load_runtime_artifacts(version: str | None = None):
    model_record = select_model_record(version=version)
    model = joblib.load(resolve_artifact_path(model_record["model_path"]))
    pipeline_bundle = joblib.load(resolve_artifact_path(model_record["pipeline_path"]))
    return model, pipeline_bundle, model_record


def legacy_catalog() -> list[dict[str, Any]]:
    catalog = []
    for model_key, label, filename in ASSIGNMENT_MODELS:
        path = LEGACY_MODELS_DIR / filename
        catalog.append(
            {
                "version": f"legacy::{model_key}",
                "model_key": model_key,
                "display_name": label,
                "stage": "assignment",
                "source": "legacy_file",
                "metrics": {},
                "available": path.exists(),
            }
        )
    return catalog


def registry_catalog() -> list[dict[str, Any]]:
    registry_models = sorted(
        load_registry(REGISTRY_PATH).get("models", []),
        key=lambda record: record.get("created_at", ""),
        reverse=True,
    )
    if not registry_models:
        return discover_runtime_models_catalog()

    for record in registry_models:
        record["display_name"] = f"Version MLOps {record.get('version', '-')}"
        record["source"] = "registry"
        model_path = resolve_artifact_path(record.get("model_path", ""))
        pipeline_path = resolve_artifact_path(record.get("pipeline_path", ""))
        record["available"] = model_path.exists() and pipeline_path.exists()
    return registry_models


def list_available_models() -> list[dict[str, Any]]:
    return legacy_catalog() + registry_catalog()


def preprocess_for_legacy(df: pd.DataFrame, expected_features: list[str]) -> pd.DataFrame:
    data = df.copy()
    for col in ["Age", "Fare", "SibSp", "Parch", "Pclass"]:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors="coerce")
    if "Age" in data.columns:
        data["Age"] = data["Age"].fillna(data["Age"].median())
    if "Fare" in data.columns:
        data["Fare"] = data["Fare"].fillna(data["Fare"].median())
    if "Sex" in data.columns and "Sex_male" in expected_features:
        data["Sex"] = data["Sex"].fillna("male").astype(str).str.lower()
        data["Sex_male"] = (data["Sex"] == "male").astype(int)
    if "Embarked" in data.columns:
        data["Embarked"] = data["Embarked"].fillna("S").astype(str).str.upper()
        if "Embarked_Q" in expected_features:
            data["Embarked_Q"] = (data["Embarked"] == "Q").astype(int)
        if "Embarked_S" in expected_features:
            data["Embarked_S"] = (data["Embarked"] == "S").astype(int)
    return validate_schema(data, expected_features)


def load_legacy_model_from_version(version: str):
    model_key = version.replace("legacy::", "", 1)
    for key, label, filename in ASSIGNMENT_MODELS:
        if key != model_key:
            continue
        path = LEGACY_MODELS_DIR / filename
        if not path.exists():
            raise ValueError(f"Modèle indisponible: {label}.")
        try:
            payload = joblib.load(path)
            model = payload["model"] if isinstance(payload, dict) and "model" in payload else payload
            features = payload.get("features", []) if isinstance(payload, dict) else []
            return model, features, {"version": version, "display_name": label, "source": "legacy_file"}
        except Exception as exc:
            raise ValueError(f"Impossible de charger le modèle {label}: {exc}") from exc
    raise ValueError(f"Modèle inconnu: {version}")

