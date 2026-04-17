from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Frontend build artefacts are served from the React project dist folder.
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

# Runtime artifacts must stay outside source modules.
VAR_DIR = PROJECT_ROOT / "var"
MODELS_DIR = VAR_DIR / "models"
RUNS_DIR = VAR_DIR / "runs"
LOGS_DIR = VAR_DIR / "logs"
REGISTRY_PATH = VAR_DIR / "registry.json"
MONITORING_LOG_PATH = LOGS_DIR / "monitoring_log.json"

# Legacy assignment models directory kept for compatibility.
LEGACY_MODELS_DIR = PROJECT_ROOT / "modeles"

# Transitional path for old pipeline artifact consumers.
PIPELINE_ARTIFACT_PATH = VAR_DIR / "pipeline.joblib"
