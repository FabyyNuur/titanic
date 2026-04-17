import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ActivitySquare,
  AlertCircle,
  Brain,
  GitBranch,
  PlayCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import ModuleShell from "../components/ModuleShell";
import {
  fetchJson,
  postDriftCheck,
  postRetrain,
  type DriftResponse,
  type HealthResponse,
  type ModelOption,
  type RetrainResponse,
} from "../api/client";

const conceptCards = [
  {
    title: "1. Versioning du modèle",
    icon: GitBranch,
    items: [
      "Sauvegarde (pickle, joblib, ONNX)",
      "Gestion des versions (MLflow, DVC)",
      "Registre de modèles",
    ],
  },
  {
    title: "2. Pipeline de données",
    icon: RefreshCw,
    items: [
      "Automatiser le preprocessing",
      "Garantir la reproductibilité",
      "Airflow, Kubeflow, Prefect",
    ],
  },
  {
    title: "3. Déploiement",
    icon: Server,
    items: [
      "API REST (Flask, FastAPI)",
      "Conteneurisation (Docker, Kubernetes)",
      "Interface utilisateur (React)",
    ],
  },
  {
    title: "4. Monitoring",
    icon: ActivitySquare,
    items: [
      "Suivre la performance en production",
      "Détecter la dérive des données (Data Drift)",
      "Prometheus, Grafana, Evidently",
    ],
  },
  {
    title: "5. Réentraînement",
    icon: PlayCircle,
    items: [
      "Mettre à jour avec de nouvelles données",
      "CI/CD pour le Machine Learning",
      "Déclenchement automatique",
    ],
  },
];

export default function MlopsPage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsErr, setModelsErr] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [metricsErr, setMetricsErr] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [recentFile, setRecentFile] = useState<File | null>(null);
  const [psiThreshold, setPsiThreshold] = useState("0.2");
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftErr, setDriftErr] = useState<string | null>(null);
  const [driftResult, setDriftResult] = useState<DriftResponse | null>(null);

  const [retrainFile, setRetrainFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState("Survived");
  const [minF1ToPromote, setMinF1ToPromote] = useState("");
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [retrainErr, setRetrainErr] = useState<string | null>(null);
  const [retrainResult, setRetrainResult] = useState<RetrainResponse | null>(
    null,
  );

  const refreshApi = useCallback(async () => {
    setLoading(true);
    setModelsErr(null);
    setMetricsErr(null);
    setHealthErr(null);
    try {
      const m = await fetchJson<{ models: ModelOption[] }>("/api/models");
      setModels(m.models || []);
    } catch (e) {
      setModelsErr(e instanceof Error ? e.message : String(e));
    }
    try {
      setMetrics(await fetchJson<Record<string, unknown>>("/api/metrics"));
    } catch (e) {
      setMetricsErr(e instanceof Error ? e.message : String(e));
    }
    try {
      setHealth(await fetchJson<HealthResponse>("/api/health"));
    } catch (e) {
      setHealthErr(e instanceof Error ? e.message : String(e));
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshApi();
  }, [refreshApi]);

  const onDriftSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setDriftErr(null);
      setDriftResult(null);
      if (!referenceFile || !recentFile) {
        setDriftErr(
          "Sélectionne un fichier de référence et un fichier récent.",
        );
        return;
      }

      setDriftLoading(true);
      try {
        const payload = new FormData();
        payload.append("reference_file", referenceFile);
        payload.append("recent_file", recentFile);
        payload.append("psi_threshold", psiThreshold);
        const result = await postDriftCheck(payload);
        setDriftResult(result);
        await refreshApi();
      } catch (e) {
        setDriftErr(e instanceof Error ? e.message : String(e));
      } finally {
        setDriftLoading(false);
      }
    },
    [psiThreshold, recentFile, referenceFile, refreshApi],
  );

  const onRetrainSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRetrainErr(null);
      setRetrainResult(null);
      if (!retrainFile) {
        setRetrainErr("Sélectionne un fichier pour le réentraînement.");
        return;
      }

      setRetrainLoading(true);
      try {
        const payload = new FormData();
        payload.append("file", retrainFile);
        payload.append("target_column", targetColumn);
        if (minF1ToPromote.trim()) {
          payload.append("min_f1_to_promote", minF1ToPromote.trim());
        }
        const result = await postRetrain(payload);
        setRetrainResult(result);
        await refreshApi();
      } catch (e) {
        setRetrainErr(e instanceof Error ? e.message : String(e));
      } finally {
        setRetrainLoading(false);
      }
    },
    [minF1ToPromote, refreshApi, retrainFile, targetColumn],
  );

  const productionModel = models.find((m) => m.stage === "production");

  return (
    <ModuleShell
      icon={Brain}
      title="8. MLOPS (MACHINE LEARNING OPERATIONS)"
      subtitle="Industrialisation, déploiement et maintien en conditions opérationnelles"
    >
      <p className="hud-prose hud-prose-tight">
        Cette page est organisée en deux zones opérationnelles : observabilité
        (santé, métriques, drift) et lifecycle modèle (registre,
        réentraînement).
      </p>

      <div className="hud-info-card hud-mb-section">
        <h3>
          <Brain size={16} aria-hidden />
          Cockpit MLOps
        </h3>
        <p className="hud-meta">
          Modèle en production :{" "}
          <strong>
            {productionModel?.display_name ||
              productionModel?.version ||
              "indisponible"}
          </strong>
        </p>
        <button
          type="button"
          className="hud-btn"
          onClick={() => void refreshApi()}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden />
          {loading ? "Actualisation…" : "Actualiser les données API"}
        </button>
      </div>

      <div className="hud-split-2">
        <div>
          <h2 className="hud-h2">OBSERVABILITÉ</h2>

          <div className="hud-info-card hud-mb-section">
            <h3>
              <Server size={16} aria-hidden />
              Santé API
            </h3>
            {healthErr ? <div className="hud-error">{healthErr}</div> : null}
            {health ? (
              <div
                className={
                  health.status === "ok" ? "hud-health-ok" : "hud-health-bad"
                }
              >
                <p className="hud-meta hud-meta-tight">
                  Statut : <strong>{health.status}</strong>
                </p>
                {health.model_version ? (
                  <p className="hud-meta">
                    Modèle : <strong>{health.model_version}</strong>
                  </p>
                ) : null}
                {health.message ? (
                  <p className="hud-error">{health.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hud-info-card hud-mb-section">
            <h3>
              <ActivitySquare size={16} aria-hidden />
              Monitoring runtime
            </h3>
            {metricsErr ? <div className="hud-error">{metricsErr}</div> : null}
            {metrics ? (
              <pre className="hud-pre">{JSON.stringify(metrics, null, 2)}</pre>
            ) : null}
          </div>

          <div className="hud-info-card hud-mb-section">
            <h3>
              <ActivitySquare size={16} aria-hidden />
              Détection de dérive
            </h3>
            <form onSubmit={onDriftSubmit}>
              <label className="hud-label" htmlFor="drift-reference-file">
                Fichier de référence
              </label>
              <input
                id="drift-reference-file"
                className="hud-file"
                type="file"
                accept=".csv,.txt,.json,.xlsx"
                onChange={(event) =>
                  setReferenceFile(event.target.files?.[0] ?? null)
                }
              />

              <label className="hud-label" htmlFor="drift-recent-file">
                Fichier récent
              </label>
              <input
                id="drift-recent-file"
                className="hud-file"
                type="file"
                accept=".csv,.txt,.json,.xlsx"
                onChange={(event) =>
                  setRecentFile(event.target.files?.[0] ?? null)
                }
              />

              <label className="hud-label" htmlFor="psi-threshold">
                Seuil PSI
              </label>
              <input
                id="psi-threshold"
                className="hud-input"
                type="number"
                step="0.01"
                min="0"
                value={psiThreshold}
                onChange={(event) => setPsiThreshold(event.target.value)}
              />

              <button type="submit" className="hud-btn" disabled={driftLoading}>
                <ActivitySquare size={14} aria-hidden />
                {driftLoading
                  ? "Analyse en cours…"
                  : "Lancer la détection de dérive"}
              </button>
            </form>

            {driftErr ? <div className="hud-error">{driftErr}</div> : null}
            {driftResult ? (
              <div>
                <p className="hud-meta">
                  Dérive détectée :{" "}
                  <strong>{driftResult.drift_detected ? "Oui" : "Non"}</strong>{" "}
                  | Alertes : <strong>{driftResult.alerts_count}</strong>
                </p>
                {driftResult.alerts.length > 0 ? (
                  <div className="hud-table-wrap">
                    <table className="hud-table">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th>PSI</th>
                          <th>Seuil</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driftResult.alerts.map((alert) => (
                          <tr key={`${alert.feature}-${alert.timestamp}`}>
                            <td>{alert.feature}</td>
                            <td>{alert.psi.toFixed(4)}</td>
                            <td>{alert.threshold.toFixed(2)}</td>
                            <td>
                              {new Date(alert.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="hud-meta">
                    Aucune alerte de dérive sur ce comparatif.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="hud-h2">OPÉRATIONS MODÈLE</h2>

          <div className="hud-info-card hud-mb-section">
            <h3>
              <GitBranch size={16} aria-hidden />
              Registre des versions
            </h3>
            {modelsErr ? <div className="hud-error">{modelsErr}</div> : null}
            <ul className="hud-model-list">
              {models.map((m) => (
                <li
                  key={m.version}
                  className={
                    m.available === false ? "hud-model-unavailable" : ""
                  }
                >
                  <strong>{m.display_name || m.version}</strong>
                  <span className="hud-mono">{m.version}</span>
                  {m.stage ? <span className="hud-tag">{m.stage}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="hud-info-card hud-mb-section">
            <h3>
              <PlayCircle size={16} aria-hidden />
              Réentraînement
            </h3>
            <form onSubmit={onRetrainSubmit}>
              <label className="hud-label" htmlFor="retrain-file">
                Nouveau dataset
              </label>
              <input
                id="retrain-file"
                className="hud-file"
                type="file"
                accept=".csv,.txt,.json,.xlsx"
                onChange={(event) =>
                  setRetrainFile(event.target.files?.[0] ?? null)
                }
              />

              <label className="hud-label" htmlFor="target-column">
                Colonne cible
              </label>
              <input
                id="target-column"
                className="hud-input"
                type="text"
                value={targetColumn}
                onChange={(event) => setTargetColumn(event.target.value)}
              />

              <label className="hud-label" htmlFor="min-f1-promote">
                F1 minimum pour promotion (optionnel)
              </label>
              <input
                id="min-f1-promote"
                className="hud-input"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Ex: 0.82"
                value={minF1ToPromote}
                onChange={(event) => setMinF1ToPromote(event.target.value)}
              />

              <button
                type="submit"
                className="hud-btn hud-btn-primary"
                disabled={retrainLoading}
              >
                <PlayCircle size={14} aria-hidden />
                {retrainLoading
                  ? "Réentraînement en cours…"
                  : "Lancer le réentraînement"}
              </button>
            </form>

            {retrainErr ? <div className="hud-error">{retrainErr}</div> : null}
            {retrainResult ? (
              <div>
                <p className="hud-meta">
                  Version créée :{" "}
                  <strong>{retrainResult.record?.version || "n/a"}</strong> |
                  Promotion :{" "}
                  <strong>{retrainResult.promoted ? "Oui" : "Non"}</strong>
                </p>
                <p className="hud-meta">
                  Stage:{" "}
                  <span className="hud-tag">
                    {retrainResult.record?.stage || "staging"}
                  </span>
                  {retrainResult.promoted ? (
                    <span className="hud-tag">production active</span>
                  ) : null}
                </p>
                <pre className="hud-pre">
                  {JSON.stringify(retrainResult, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <h2 className="hud-h2">RÉFÉRENTIEL MLOPS</h2>
      <div className="hud-mlops-grid hud-mb-section">
        {conceptCards.map((card) => (
          <div key={card.title} className="hud-info-card">
            <h3>
              <card.icon size={16} aria-hidden />
              {card.title}
            </h3>
            <ul>
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="hud-faq">
        <h2>Questions fréquentes</h2>

        <div className="hud-faq-item indigo">
          <h3>
            <AlertCircle size={18} aria-hidden />
            Pourquoi le MLOps est-il important ?
          </h3>
          <p>
            Passer du prototype (notebook) à un produit fiable en production :
            reproductibilité, collaboration data / ops, valeur dans le temps.
            Sans MLOps, une grande partie des modèles ne sont jamais déployés
            durablement.
          </p>
        </div>

        <div className="hud-faq-item purple">
          <h3>
            <AlertCircle size={18} aria-hidden />
            Quelle différence entre ML et MLOps ?
          </h3>
          <p>
            Le <strong>machine learning</strong> couvre l&apos;expérimentation :
            données, choix du modèle, entraînement et évaluation. Le{" "}
            <strong>MLOps</strong> couvre le cycle de vie logiciel : packaging,
            déploiement continu, orchestration des pipelines, monitoring temps
            réel et infrastructure (DevOps + ML).
          </p>
        </div>

        <div className="hud-faq-item red">
          <h3>
            <AlertCircle size={18} aria-hidden />
            Quels risques sans monitoring ?
          </h3>
          <p>
            Les données et le comportement des utilisateurs évoluent. Sans
            monitoring, dérive des données ou du concept : la précision peut
            chuter sans alerte, avec impact métier ou éthique.
          </p>
        </div>
      </div>
    </ModuleShell>
  );
}
