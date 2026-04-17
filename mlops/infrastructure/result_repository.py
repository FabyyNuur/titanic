from __future__ import annotations

from pathlib import Path
import uuid

import pandas as pd

from mlops.config.settings import RUNS_DIR


def save_prediction_results(result_df: pd.DataFrame) -> tuple[str, Path]:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    run_id = uuid.uuid4().hex[:12]
    output_path = RUNS_DIR / f"predictions_{run_id}.csv"
    result_df.to_csv(output_path, index=False)
    return run_id, output_path


def resolve_result_file(run_id: str) -> Path:
    return RUNS_DIR / f"predictions_{run_id}.csv"

