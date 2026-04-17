from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DEFAULT_RANDOM_STATE = 42


@dataclass
class PipelineArtifacts:
    pipeline: Pipeline
    features: list[str]
    numeric_features: list[str]
    categorical_features: list[str]


def infer_feature_types(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    numeric_features = df.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_features = [col for col in df.columns if col not in numeric_features]
    return numeric_features, categorical_features


def build_preprocessing_pipeline(numeric_features: list[str], categorical_features: list[str]) -> Pipeline:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )

    return Pipeline(steps=[("preprocessor", preprocessor)])


def fit_preprocessing_pipeline(X_train: pd.DataFrame) -> PipelineArtifacts:
    numeric_features, categorical_features = infer_feature_types(X_train)
    pipeline = build_preprocessing_pipeline(numeric_features, categorical_features)
    pipeline.fit(X_train)
    return PipelineArtifacts(
        pipeline=pipeline,
        features=X_train.columns.tolist(),
        numeric_features=numeric_features,
        categorical_features=categorical_features,
    )


def validate_schema(df: pd.DataFrame, expected_features: list[str]) -> pd.DataFrame:
    missing_features = [feature for feature in expected_features if feature not in df.columns]
    if missing_features:
        raise ValueError(f"Colonnes manquantes: {missing_features}")

    extra_features = [feature for feature in df.columns if feature not in expected_features]
    if extra_features:
        df = df.drop(columns=extra_features)

    return df[expected_features].copy()


def save_pipeline_artifacts(artifacts: PipelineArtifacts, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": artifacts.pipeline,
            "features": artifacts.features,
            "numeric_features": artifacts.numeric_features,
            "categorical_features": artifacts.categorical_features,
            "random_state": DEFAULT_RANDOM_STATE,
        },
        path,
    )
    return path


def load_pipeline_artifacts(path: str | Path) -> dict:
    return joblib.load(path)

