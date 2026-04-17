from __future__ import annotations

import unittest

import pandas as pd

from mlops.domain.pipeline_domain import validate_schema


class ValidateSchemaTests(unittest.TestCase):
    def test_validate_schema_drops_extra_and_respects_order(self) -> None:
        df = pd.DataFrame(
            [
                {"Fare": 7.25, "Age": 22, "Noise": 123, "Pclass": 3},
            ]
        )

        validated = validate_schema(df, ["Pclass", "Age", "Fare"])

        self.assertEqual(validated.columns.tolist(), ["Pclass", "Age", "Fare"])
        self.assertEqual(validated.iloc[0].to_dict(), {"Pclass": 3, "Age": 22, "Fare": 7.25})

    def test_validate_schema_raises_on_missing_feature(self) -> None:
        df = pd.DataFrame([{"Pclass": 3, "Age": 22}])

        with self.assertRaises(ValueError) as ctx:
            validate_schema(df, ["Pclass", "Age", "Fare"])

        self.assertIn("Colonnes manquantes", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
