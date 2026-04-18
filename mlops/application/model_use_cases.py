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

_LEGACY_MODELS_BOOTSTRAPPED = False


def resolve_artifact_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def _legacy_model_path(filename: str) -> Path:
    return LEGACY_MODELS_DIR / filename


def _build_legacy_estimator(model_key: str):
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.svm import SVC
    from sklearn.tree import DecisionTreeClassifier

    try:
        from xgboost import XGBClassifier
    except Exception:
        XGBClassifier = None

    if model_key == "logistic_regression":
        return LogisticRegression(max_iter=1000, random_state=42)
    if model_key == "knn":
        return KNeighborsClassifier(n_neighbors=5)
    if model_key == "decision_tree":
        return DecisionTreeClassifier(random_state=42)
    if model_key == "random_forest":
        return RandomForestClassifier(n_estimators=300, random_state=42)
    if model_key == "gradient_boosting":
        return GradientBoostingClassifier(random_state=42)
    if model_key == "svm":
        return SVC(probability=True, random_state=42)
    if model_key == "naive_bayes":
        return GaussianNB()
    if model_key == "xgboost" and XGBClassifier is not None:
        return XGBClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=3,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            eval_metric="logloss",
        )
    if model_key == "xgboost":
        return GradientBoostingClassifier(random_state=42)
    raise ValueError(f"Modèle legacy inconnu: {model_key}")


def _legacy_model_artifact_is_valid(path: Path, expected_features: list[str]) -> bool:
    if not path.exists():
        return False
    try:
        payload = joblib.load(path)
    except Exception:
        return False

    model = payload.get("model", payload) if isinstance(payload, dict) else payload
    features = payload.get("features", []) if isinstance(payload, dict) else []
    if features and features != expected_features:
        return False

    sample = pd.DataFrame([{
        "Pclass": 3,
        "Age": 28,
        "SibSp": 0,
        "Parch": 0,
        "Fare": 7.25,
        "Sex_male": 1,
        "Embarked_Q": 0,
        "Embarked_S": 1,
    }])
    try:
        model.predict(sample[expected_features])
        return True
    except Exception:
        return False


def ensure_legacy_models_bootstrapped() -> None:
    global _LEGACY_MODELS_BOOTSTRAPPED
    if _LEGACY_MODELS_BOOTSTRAPPED:
        return

    expected_features = ["Pclass", "Age", "SibSp", "Parch", "Fare", "Sex_male", "Embarked_Q", "Embarked_S"]
    if all(_legacy_model_artifact_is_valid(_legacy_model_path(filename), expected_features) for _, _, filename in ASSIGNMENT_MODELS):
        _LEGACY_MODELS_BOOTSTRAPPED = True
        return

    train_dataset_path = PROJECT_ROOT / "train.csv"
    if not train_dataset_path.exists():
        _LEGACY_MODELS_BOOTSTRAPPED = True
        return

    from sklearn.base import clone
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.svm import SVC
    from sklearn.tree import DecisionTreeClassifier

    try:
        from xgboost import XGBClassifier
    except Exception:
        XGBClassifier = None

    data = pd.read_csv(train_dataset_path)
    if "Survived" not in data.columns:
        _LEGACY_MODELS_BOOTSTRAPPED = True
        return

    model_factories = {
        "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
        "knn": KNeighborsClassifier(n_neighbors=5),
        "decision_tree": DecisionTreeClassifier(random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=300, random_state=42),
        "gradient_boosting": GradientBoostingClassifier(random_state=42),
        "svm": SVC(probability=True, random_state=42),
        "naive_bayes": GaussianNB(),
        "xgboost": XGBClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=3,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            eval_metric="logloss",
        ) if XGBClassifier is not None else GradientBoostingClassifier(random_state=42),
    }

    features = expected_features
    prepared = preprocess_for_legacy(data, features)
    X = prepared[features]
    y = data["Survived"].astype(int)

    LEGACY_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for model_key, _, filename in ASSIGNMENT_MODELS:
        path = _legacy_model_path(filename)
        try:
            estimator = clone(model_factories[model_key])
            estimator.fit(X, y)
            joblib.dump({"model": estimator, "features": features}, path)
        except Exception:
            if path.exists():
                try:
                    path.unlink()
                except Exception:
                    pass

    _LEGACY_MODELS_BOOTSTRAPPED = True


def select_model_record(version: str | None = None) -> dict:
    ensure_compatible_runtime_model()
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
                            break
                    except Exception:
                        break
                return record
        version = None

    compatible_models = _compatible_model_records(models)

    if not compatible_models:
        raise ValueError("Aucun modèle compatible disponible sur cette instance.")

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


_RUNTIME_MODEL_BOOTSTRAPPED = False


def _compatible_model_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    compatible_records: list[dict[str, Any]] = []
    for record in records:
        model_path = record.get("model_path")
        pipeline_path = record.get("pipeline_path")
        if not model_path or not pipeline_path:
            if record.get("available"):
                compatible_records.append(record)
            continue
        try:
            model, pipeline_bundle = _load_runtime_artifacts_from_record(record)
        except Exception:
            continue
        if _registry_artifacts_are_compatible(model, pipeline_bundle):
            compatible_records.append(record)
    return compatible_records


def ensure_compatible_runtime_model() -> None:
    global _RUNTIME_MODEL_BOOTSTRAPPED
    if _RUNTIME_MODEL_BOOTSTRAPPED:
        return

    ensure_legacy_models_bootstrapped()

    if _compatible_model_records(legacy_catalog() + discover_runtime_models_catalog()):
        _RUNTIME_MODEL_BOOTSTRAPPED = True
        return

    train_dataset_path = PROJECT_ROOT / "train.csv"
    if train_dataset_path.exists():
        try:
            from mlops.application.retrain_use_case import retrain_with_new_data

            retrain_with_new_data(str(train_dataset_path), min_f1_to_promote=0.0)
        except Exception:
            pass

    _RUNTIME_MODEL_BOOTSTRAPPED = True


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

    records = list(reversed(records))
    for record in records:
        if not record.get("available"):
            continue
        try:
            model, pipeline_bundle = _load_runtime_artifacts_from_record(record)
            record["available"] = _registry_artifacts_are_compatible(model, pipeline_bundle)
        except Exception:
            record["available"] = False
    return records


def load_runtime_artifacts(version: str | None = None):
    _ensure_sklearn_pickle_compat()
    model_record = select_model_record(version=version)
    model, pipeline_bundle = _load_runtime_artifacts_from_record(model_record)
    return model, pipeline_bundle, model_record


def legacy_catalog() -> list[dict[str, Any]]:
    ensure_legacy_models_bootstrapped()
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
    ensure_legacy_models_bootstrapped()
    ensure_compatible_runtime_model()
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
    ensure_legacy_models_bootstrapped()
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

