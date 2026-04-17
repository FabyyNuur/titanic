from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import joblib

from mlops.config.settings import MODELS_DIR, PROJECT_ROOT, REGISTRY_PATH


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_version_tag() -> str:
    # Timestamp + entropy suffix ensures strict uniqueness even for rapid successive saves.
    return datetime.now(timezone.utc).strftime("v%Y%m%d_%H%M%S_%f") + f"_{uuid4().hex[:6]}"


def _normalize_artifact_path(path_value: str) -> str:
    path = Path(path_value)
    if path.is_absolute():
        try:
            return path.relative_to(PROJECT_ROOT).as_posix()
        except ValueError:
            return path.as_posix()
    return path.as_posix()


def _validate_models_unique(models: list[dict]) -> None:
    versions = [str(model.get("version", "")) for model in models]
    duplicates = sorted({version for version in versions if version and versions.count(version) > 1})
    if duplicates:
        dup_list = ", ".join(duplicates)
        raise ValueError(f"Registry invalide: versions dupliquees detectees ({dup_list}).")


def load_registry(path: Path = REGISTRY_PATH) -> Dict[str, Any]:
    if not path.exists():
        return {"models": []}
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    models = payload.get("models", [])
    if not isinstance(models, list):
        raise ValueError("Registry invalide: 'models' doit etre une liste.")

    _validate_models_unique(models)
    return payload


def save_registry(registry: Dict[str, Any], path: Path = REGISTRY_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)


def register_model(
    model: Any,
    pipeline_artifacts_path: str,
    metrics: Dict[str, float] | None = None,
    features: list | None = None,
    registry_path: Path = REGISTRY_PATH,
    models_dir: Path = MODELS_DIR,
) -> Dict[str, Any]:
    models_dir.mkdir(parents=True, exist_ok=True)
    registry = load_registry(registry_path)

    version = _new_version_tag()
    existing_versions = {record.get("version") for record in registry.get("models", [])}
    while version in existing_versions:
        version = _new_version_tag()

    model_filename = f"model_{version}.joblib"
    model_path = models_dir / model_filename
    joblib.dump(model, model_path)

    record = {
        "version": version,
        "created_at": _now_iso(),
        "model_path": _normalize_artifact_path(str(model_path)),
        "pipeline_path": _normalize_artifact_path(str(pipeline_artifacts_path)),
        "metrics": metrics or {},
        "features": features or [],
        "stage": "staging",
    }

    registry.setdefault("models", []).append(record)
    _validate_models_unique(registry["models"])
    save_registry(registry, registry_path)
    return record


def get_latest_model(registry_path: Path = REGISTRY_PATH, stage: str | None = None) -> Dict[str, Any]:
    registry = load_registry(registry_path)
    models = registry.get("models", [])
    if stage is not None:
        models = [m for m in models if m.get("stage") == stage]
    if not models:
        raise ValueError("Aucun modèle enregistré dans le registre.")
    return models[-1]


def promote_model(version: str, stage: str = "production", registry_path: Path = REGISTRY_PATH) -> Dict[str, Any]:
    registry = load_registry(registry_path)
    for model_record in registry.get("models", []):
        if model_record.get("version") == version:
            model_record["stage"] = stage
            model_record["promoted_at"] = _now_iso()
            save_registry(registry, registry_path)
            return model_record
    raise ValueError(f"Version introuvable: {version}")

