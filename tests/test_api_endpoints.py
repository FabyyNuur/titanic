"""Minimal API endpoint tests for health, predict, retrain and drift."""

from __future__ import annotations

from io import BytesIO
import unittest
from unittest.mock import patch

from mlops.api.app_factory import create_app


class ApiEndpointsTests(unittest.TestCase):
    """Contract tests for the main Flask API endpoints."""

    def setUp(self) -> None:
        """Create an isolated Flask test client."""
        app = create_app()
        app.testing = True
        self.client = app.test_client()

    def test_health_returns_model_version(self) -> None:
        """The health endpoint should expose current model version."""
        with patch("mlops.api.app_factory.load_runtime_artifacts") as mocked_runtime:
            mocked_runtime.return_value = (object(), object(), {"version": "v-test"})
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["model_version"], "v-test")

    def test_predict_returns_predictions(self) -> None:
        """Predict endpoint should return predictions and metadata."""
        with patch("mlops.api.app_factory.run_predict_file") as mocked_predict:
            mocked_predict.return_value = (
                [1],
                [0.92],
                {"version": "v-test", "display_name": "Model Test"},
                object(),
                7.5,
            )

            response = self.client.post(
                "/api/predict",
                json={
                    "model_version": "v-test",
                    "features": {
                        "Pclass": 3,
                        "Sex": "male",
                        "Age": 22,
                        "SibSp": 1,
                        "Parch": 0,
                        "Fare": 7.25,
                        "Embarked": "S",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["model_version"], "v-test")
        self.assertEqual(payload["predictions"], [1])
        self.assertIn("latency_ms", payload)

    def test_retrain_returns_metrics(self) -> None:
        """Retrain endpoint should return model record and metrics."""
        with (
            patch("mlops.api.app_factory.load_dataframe_from_upload") as mocked_loader,
            patch("mlops.api.app_factory.retrain_with_dataframe") as mocked_retrain,
        ):
            mocked_loader.return_value = object()
            mocked_retrain.return_value = {
                "record": {"version": "v-new", "stage": "staging"},
                "metrics": {"accuracy": 0.8, "f1": 0.75},
                "promoted": False,
            }

            response = self.client.post(
                "/api/retrain",
                data={
                    "file": (BytesIO(b"Pclass,Age,Survived\n3,22,0\n1,38,1\n"), "train.csv"),
                    "target_column": "Survived",
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["record"]["version"], "v-new")
        self.assertEqual(payload["metrics"]["f1"], 0.75)

    def test_drift_returns_alerts(self) -> None:
        """Drift endpoint should report detected alerts."""
        with (
            patch("mlops.api.app_factory.load_dataframe_from_upload") as mocked_loader,
            patch("mlops.api.app_factory.detect_drift") as mocked_drift,
        ):
            mocked_loader.side_effect = [object(), object()]
            mocked_drift.return_value = [
                {
                    "timestamp": "2026-04-17T00:00:00+00:00",
                    "type": "drift",
                    "feature": "Age",
                    "psi": 0.31,
                    "threshold": 0.2,
                }
            ]

            response = self.client.post(
                "/api/drift",
                data={
                    "reference_file": (BytesIO(b"Age\n22\n30\n"), "ref.csv"),
                    "recent_file": (BytesIO(b"Age\n40\n44\n"), "recent.csv"),
                    "psi_threshold": "0.2",
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["drift_detected"])
        self.assertEqual(payload["alerts_count"], 1)


if __name__ == "__main__":
    unittest.main()
