from __future__ import annotations

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
import pandas as pd

from mlops.config.settings import PIPELINE_ARTIFACT_PATH
from mlops.domain.pipeline_domain import fit_preprocessing_pipeline, save_pipeline_artifacts
from mlops.infrastructure.registry_repository import get_latest_model, promote_model, register_model


def retrain_with_dataframe(
    df: pd.DataFrame,
    target_column: str = "Survived",
    model=None,
    min_f1_to_promote: float | None = None,
):
    if target_column not in df.columns:
        raise ValueError(f"Colonne cible introuvable: {target_column}")

    # Handle small datasets gracefully
    if len(df) < 10:
        raise ValueError(f"Ensemble d'entraînement trop petit ({len(df)} lignes). Minimum: 10 lignes.")
    
    # Adjust test_size for small datasets to ensure minimum test set size
    test_size = 0.2 if len(df) >= 50 else max(0.1, 2 / len(df))

    X = df.drop(columns=[target_column])
    y = df[target_column]
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=test_size, random_state=42, stratify=y)

    artifacts = fit_preprocessing_pipeline(X_train)
    X_train_t = artifacts.pipeline.transform(X_train)
    X_val_t = artifacts.pipeline.transform(X_val)

    model = model or RandomForestClassifier(n_estimators=300, random_state=42)
    model.fit(X_train_t, y_train)
    preds = model.predict(X_val_t)

    metrics = {
        "accuracy": float(accuracy_score(y_val, preds)),
        "f1": float(f1_score(y_val, preds)),
    }

    save_pipeline_artifacts(artifacts, PIPELINE_ARTIFACT_PATH)
    record = register_model(
        model=model,
        pipeline_artifacts_path=str(PIPELINE_ARTIFACT_PATH),
        metrics=metrics,
        features=artifacts.features,
    )

    if min_f1_to_promote is not None:
        should_promote = metrics["f1"] >= min_f1_to_promote
    else:
        try:
            current_prod = get_latest_model(stage="production")
            baseline = float(current_prod.get("metrics", {}).get("f1", 0.0))
            should_promote = metrics["f1"] >= baseline
        except Exception:
            should_promote = True

    if should_promote:
        record = promote_model(record["version"], stage="production")

    return {"record": record, "metrics": metrics, "promoted": should_promote}


def retrain_with_new_data(
    dataset_path: str,
    target_column: str = "Survived",
    model=None,
    min_f1_to_promote: float | None = None,
):
    df = pd.read_csv(dataset_path)
    return retrain_with_dataframe(
        df=df,
        target_column=target_column,
        model=model,
        min_f1_to_promote=min_f1_to_promote,
    )

