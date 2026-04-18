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


def _ensure_sklearn_pickle_compat() -> None:
    # Fix: _RemainderColsList missing in newer sklearn versions
    try:
        import sklearn.compose._column_transformer as column_transformer_module
    except Exception:
        pass
    else:
        if not hasattr(column_transformer_module, "_RemainderColsList"):
            class _RemainderColsList(list):
                pass
            column_transformer_module._RemainderColsList = _RemainderColsList

    # Fix: SimpleImputer._fill_dtype missing + signature issues from old pickled models
    try:
        from sklearn.impute import SimpleImputer
    except Exception:
        pass
    else:
        # Patch __setstate__ to handle unpickling and add missing attributes
        original_setstate = SimpleImputer.__setstate__ if hasattr(SimpleImputer, '__setstate__') else None
        
        def patched_setstate(self, state):
            if state is None:
                state = {}
            if callable(original_setstate):
                try:
                    original_setstate(self, state)
                except Exception:
                    self.__dict__.update(state)
            else:
                self.__dict__.update(state)
            
            # Ensure all required attributes exist
            if not hasattr(self, '_fill_dtype'):
                self._fill_dtype = None
            if not hasattr(self, 'missing_values'):
                self.missing_values = float('nan')
            if not hasattr(self, 'strategy'):
                self.strategy = 'mean'
        
        SimpleImputer.__setstate__ = patched_setstate
        
        # Also patch __reduce_ex__ to handle pickling gracefully
        if hasattr(SimpleImputer, '__reduce_ex__'):
            original_reduce_ex = SimpleImputer.__reduce_ex__
            
            def patched_reduce_ex(self, protocol):
                try:
                    return original_reduce_ex(self, protocol)
                except Exception:
                    # Fallback to basic pickle
                    return (SimpleImputer, (), self.__getstate__())
            
            SimpleImputer.__reduce_ex__ = patched_reduce_ex

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
                if record.get("model_path") and record.get("pipeline_path"):
                    try:
                        model, pipeline_bundle = _load_runtime_artifacts_from_record(record)
                        if not _registry_artifacts_are_compatible(model, pipeline_bundle):
                            return select_model_record(None)
                    except Exception:
                        return select_model_record(None)
                return record
        raise ValueError(f"Version de modele introuvable: {version}")

    compatible_models = []
    for record in models:
        try:
            model, pipeline_bundle = _load_runtime_artifacts_from_record(record)
        except Exception:
            continue
        if _registry_artifacts_are_compatible(model, pipeline_bundle):
            compatible_models.append(record)

    if not compatible_models:
        production_models = [record for record in models if record.get("stage") == "production"]
        return production_models[-1] if production_models else models[-1]

    production_models = [record for record in compatible_models if record.get("stage") == "production"]
    return production_models[-1] if production_models else compatible_models[-1]


def _iso_from_mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def _model_version_from_path(path: Path) -> str:
    stem = path.stem
    if stem.startswith("model_"):
        return stem.replace("model_", "", 1)
    return stem


def _build_registry_sample_frame(
    features: list[str],
    numeric_features: list[str],
    categorical_features: list[str],
) -> pd.DataFrame:
    sample_row: dict[str, Any] = {}
    for feature in features:
        if feature in numeric_features:
            sample_row[feature] = 0
        elif feature in categorical_features:
            if feature == "Sex":
                sample_row[feature] = "male"
            elif feature == "Embarked":
                sample_row[feature] = "S"
            else:
                sample_row[feature] = ""
        else:
            sample_row[feature] = 0
    return pd.DataFrame([sample_row])


def _registry_artifacts_are_compatible(model, pipeline_bundle: dict[str, Any]) -> bool:
    features = list(pipeline_bundle.get("features", []))
    if not features:
        return False

    numeric_features = list(pipeline_bundle.get("numeric_features", []))
    categorical_features = list(pipeline_bundle.get("categorical_features", []))
    sample_frame = _build_registry_sample_frame(features, numeric_features, categorical_features)

    try:
        transformed = pipeline_bundle["pipeline"].transform(sample_frame[features])
    except Exception:
        return False

    expected_features = getattr(model, "n_features_in_", None)
    if expected_features is None:
        return True
    return getattr(transformed, "shape", (0, 0))[1] == expected_features


def _load_runtime_artifacts_from_record(model_record: dict[str, Any]):
    model = joblib.load(resolve_artifact_path(model_record["model_path"]))
    pipeline_bundle = joblib.load(resolve_artifact_path(model_record["pipeline_path"]))
    return model, pipeline_bundle


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
    _ensure_sklearn_pickle_compat()
    model_record = select_model_record(version=version)
    model, pipeline_bundle = _load_runtime_artifacts_from_record(model_record)
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
        if record["available"]:
            try:
                model, pipeline_bundle = _load_runtime_artifacts_from_record(record)
                record["available"] = _registry_artifacts_are_compatible(model, pipeline_bundle)
            except Exception:
                record["available"] = False
    return registry_models


def list_available_models() -> list[dict[str, Any]]:
    return legacy_catalog() + registry_catalog()


def default_prediction_version() -> str:
    legacy_models = legacy_catalog()
    for record in legacy_models:
        if record.get("available"):
            return record["version"]

    model_record = select_model_record(None)
    return model_record["version"]


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

