from __future__ import annotations

import joblib

from mlops.infrastructure.registry_repository import *  # noqa: F401,F403
from mlops.infrastructure.registry_repository import get_latest_model, load_registry


def load_model_by_version(version: str | None = None):
    if version is None:
        model_record = get_latest_model()
    else:
        registry = load_registry()
        matches = [m for m in registry.get("models", []) if m.get("version") == version]
        if not matches:
            raise ValueError(f"Version introuvable: {version}")
        model_record = matches[0]
    return joblib.load(model_record["model_path"]), model_record
