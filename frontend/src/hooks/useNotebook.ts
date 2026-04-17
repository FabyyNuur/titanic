/**
 * useNotebook.ts
 *
 * Hook React qui consomme l'endpoint /api/notebook (Flask) lequel lit
 * dynamiquement train.ipynb et retourne les données structurées.
 */
import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MissingValue {
  variable: string;
  nb_manquants: number;
  pct_manquants: number;
}

export interface TargetDistribution {
  n_0: number;
  pct_0: number;
  n_1: number;
  pct_1: number;
}

export interface ModelMetric {
  name: string;
  accuracy: number;
  f1: number;
  precision: number;
  recall: number;
  score_moyen: number;
  rang: number;
}

export interface OverfittingLR {
  train_accuracy: number;
  test_accuracy: number;
  ecart_accuracy: number;
  train_f1: number;
  test_f1: number;
  ecart_f1: number;
  conclusion: string;
}

export interface LearningCurve {
  sizes: number[];
  train_scores: number[];
  val_scores: number[];
}

export interface CVScore {
  model: string;
  score: number;
}

export interface ConfusionMatrix {
  vn: number;
  fp: number;
  fn: number;
  vp: number;
}

export interface DatasetInfo {
  lignes: number | null;
  colonnes: number | null;
  variables_numeriques: number | null;
  variables_categorielles: number | null;
  lignes_dupliquees: number | null;
  total_manquants: number;
}

export interface NotebookData {
  notebook_path: string;
  nb_cells: number;
  dataset: DatasetInfo;
  missing_values: MissingValue[];
  target_distribution: TargetDistribution;
  models: ModelMetric[];
  overfitting: { 
    logistic_regression: OverfittingLR;
    learning_curve: LearningCurve;
  };
  cv_scores: CVScore[];
  confusion_matrix_logreg: ConfusionMatrix;
  accuracy_logreg: number;
  optimization: {
    best_params: string;
    best_score: number;
    models: Array<{ name: string; params: string; score: number }>;
  };
  ensemble: {
    name: string;
    accuracy: number;
    f1: number;
    precision: number;
    recall: number;
    confusion_matrix: ConfusionMatrix;
  };
  preprocessing: {
    steps: string[];
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseNotebookReturn {
  data: NotebookData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNotebook(): UseNotebookReturn {
  const [data, setData] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/notebook")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<NotebookData>;
      })
      .then((json) => {
        if (!cancelled) {
          if ("error" in json) {
            throw new Error((json as { error: string }).error);
          }
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
