from __future__ import annotations

import json

import pandas as pd
from flask import Blueprint, Flask, jsonify, request, send_file

from mlops.notebook_parser import parse_notebook

from mlops.application.model_use_cases import list_available_models, load_runtime_artifacts
from mlops.application.prediction_use_cases import (
    build_predictions_payload,
    load_dataframe_from_upload,
    predict_file as run_predict_file,
)
from mlops.application.retrain_use_case import retrain_with_dataframe
from mlops.config.settings import FRONTEND_DIST_DIR
from mlops.domain.monitoring_domain import detect_drift, summarize_metrics
from mlops.infrastructure.result_repository import resolve_result_file, save_prediction_results


def _dataframe_preview_records(df: pd.DataFrame, n: int = 100) -> list:
    """Records JSON-safe (null au lieu de NaN) pour le client navigateur."""
    chunk = df.head(n)
    if chunk.empty:
        return []
    return json.loads(chunk.to_json(orient="records", date_format="iso"))


def create_app() -> Flask:
    app = Flask(
        __name__,
        static_folder=str(FRONTEND_DIST_DIR / "assets"),
        static_url_path="/assets",
    )
    api = Blueprint("api", __name__, url_prefix="/api")

    @api.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @api.get("/ready")
    def ready():
        try:
            _, _, model_record = load_runtime_artifacts()
            return jsonify({"status": "ready", "model_version": model_record["version"]})
        except Exception as exc:  # pragma: no cover
            return jsonify({"status": "error", "message": str(exc)}), 500

    @api.post("/predict")
    def predict():
        payload = request.get_json(force=True)
        rows = [payload] if isinstance(payload, dict) else payload
        requested_version = None
        if isinstance(payload, dict):
            requested_version = payload.get("model_version")
            rows = [payload.get("features", payload)]
        df = pd.DataFrame(rows)
        predictions, probabilities, model_record, _, latency_ms = run_predict_file(df, requested_version)
        response = {
            "model_version": model_record.get("version"),
            "model_display_name": model_record.get("display_name", model_record.get("version")),
            "predictions": predictions,
            "latency_ms": latency_ms,
        }
        if probabilities is not None:
            response["probabilities"] = probabilities
        return jsonify(response)

    @api.get("/metrics")
    def metrics():
        return jsonify(summarize_metrics())

    @api.post("/drift")
    def drift():
        if "reference_file" not in request.files or "recent_file" not in request.files:
            return jsonify({"error": "Fichiers requis: reference_file et recent_file."}), 400

        reference_file = request.files["reference_file"]
        recent_file = request.files["recent_file"]
        if not reference_file or not reference_file.filename or not recent_file or not recent_file.filename:
            return jsonify({"error": "Fichier(s) invalide(s)."}), 400

        try:
            psi_threshold = float(request.form.get("psi_threshold", "0.2"))
        except ValueError:
            return jsonify({"error": "psi_threshold doit être un nombre."}), 400

        try:
            reference_df = load_dataframe_from_upload(reference_file)
            recent_df = load_dataframe_from_upload(recent_file)
            alerts = detect_drift(reference_df=reference_df, recent_df=recent_df, psi_threshold=psi_threshold)
            return jsonify(
                {
                    "drift_detected": bool(alerts),
                    "alerts_count": len(alerts),
                    "alerts": alerts,
                    "psi_threshold": psi_threshold,
                }
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:  # pragma: no cover
            return jsonify({"error": f"Erreur interne: {exc}"}), 500

    @api.get("/notebook")
    def notebook_data():
        """Retourne les données extraites dynamiquement de train.ipynb."""
        try:
            data = parse_notebook()
            return jsonify(data)
        except Exception as exc:  # pragma: no cover
            return jsonify({"error": f"Erreur lecture notebook: {exc}"}), 500

    @app.get("/notebook")
    def notebook_compat():
        return notebook_data()

    @api.get("/models")
    def models():
        return jsonify({"models": list_available_models()})

    @api.post("/predict-file")
    def predict_file():
        if "file" not in request.files:
            return jsonify({"error": "Aucun fichier envoye."}), 400
        file_storage = request.files["file"]
        if not file_storage or not file_storage.filename:
            return jsonify({"error": "Fichier invalide."}), 400

        requested_version = request.form.get("model_version") or None
        try:
            df = load_dataframe_from_upload(file_storage)
            predictions, probabilities, model_record, _, latency_ms = run_predict_file(df, requested_version)
            result_df = df.copy()
            result_df["prediction"] = predictions
            if probabilities is not None:
                result_df["score_positive_class"] = probabilities
            run_id, _ = save_prediction_results(result_df)
            return jsonify(
                {
                    "run_id": run_id,
                    "download_url": f"/api/download/{run_id}",
                    "model_version": model_record.get("version"),
                    "model_display_name": model_record.get("display_name", model_record.get("version")),
                    "filename": file_storage.filename,
                    "stats": build_predictions_payload(predictions, probabilities, latency_ms),
                    "preview_rows": _dataframe_preview_records(result_df, 100),
                    "preview_count": min(len(result_df), 100),
                    "total_count": len(result_df),
                }
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:  # pragma: no cover
            return jsonify({"error": f"Erreur interne: {exc}"}), 500

    @api.post("/retrain")
    def retrain():
        if "file" not in request.files:
            return jsonify({"error": "Aucun fichier envoye."}), 400
        file_storage = request.files["file"]
        if not file_storage or not file_storage.filename:
            return jsonify({"error": "Fichier invalide."}), 400

        target_column = (request.form.get("target_column") or "Survived").strip() or "Survived"
        min_f1_raw = (request.form.get("min_f1_to_promote") or "").strip()
        min_f1_to_promote = None
        if min_f1_raw:
            try:
                min_f1_to_promote = float(min_f1_raw)
            except ValueError:
                return jsonify({"error": "min_f1_to_promote doit être un nombre."}), 400

        try:
            df = load_dataframe_from_upload(file_storage)
            result = retrain_with_dataframe(
                df=df,
                target_column=target_column,
                min_f1_to_promote=min_f1_to_promote,
            )
            return jsonify(result)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:  # pragma: no cover
            return jsonify({"error": f"Erreur interne: {exc}"}), 500

    @api.get("/download/<run_id>")
    def download(run_id: str):
        output_path = resolve_result_file(run_id)
        if not output_path.exists():
            return jsonify({"error": "Resultat introuvable pour ce run_id."}), 404
        return send_file(output_path, as_attachment=True, download_name=output_path.name, mimetype="text/csv")

    # Compatibilité avec les routes sans préfixe API
    @app.get("/models")
    def models_compat():
        return models()

    @app.post("/predict-file")
    def predict_file_compat():
        return predict_file()

    @app.get("/download/<run_id>")
    def download_compat(run_id: str):
        return download(run_id)

    @app.get("/health")
    def health_compat():
        return health()

    @app.get("/metrics")
    def metrics_compat():
        return metrics()

    @app.post("/drift")
    def drift_compat():
        return drift()

    @app.post("/retrain")
    def retrain_compat():
        return retrain()

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "Endpoint API introuvable."}), 404
        index_path = FRONTEND_DIST_DIR / "index.html"
        if index_path.exists():
            return send_file(index_path)
        return jsonify({"error": "Frontend non buildé. Vérifie `frontend/dist/index.html`."}), 503

    app.register_blueprint(api)
    return app

