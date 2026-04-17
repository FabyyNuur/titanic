from __future__ import annotations

from mlops.application.retrain_use_case import retrain_with_new_data


if __name__ == "__main__":
    # Exemple: python -m mlops.retrain
    result = retrain_with_new_data("train.csv")
    print(result)
