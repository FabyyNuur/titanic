import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu, RefreshCw, Send, UploadCloud } from "lucide-react";
import {
  fetchJson,
  type ModelOption,
  type PredictFileResponse,
} from "../api/client";

type PredictJsonResponse = {
  model_version?: string;
  model_display_name?: string;
  predictions: unknown[];
  probabilities?: number[];
  latency_ms?: number;
};

type PredictionsStats = {
  total_rows?: number;
  distribution?: Record<string, number>;
  ratios?: Record<string, number>;
  latency_total_ms?: number;
  latency_avg_ms?: number;
  interpretation?: string[];
};

function toNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}

function parseStats(stats: unknown): PredictionsStats | null {
  const raw = toObject(stats);
  if (!raw) return null;

  const distributionRaw = toObject(raw.distribution) || {};
  const ratiosRaw = toObject(raw.ratios) || {};

  const distribution: Record<string, number> = {};
  for (const [key, value] of Object.entries(distributionRaw)) {
    const num = toNumber(value);
    if (num !== null) distribution[key] = num;
  }

  const ratios: Record<string, number> = {};
  for (const [key, value] of Object.entries(ratiosRaw)) {
    const num = toNumber(value);
    if (num !== null) ratios[key] = num;
  }

  const interpretation = Array.isArray(raw.interpretation)
    ? raw.interpretation.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  return {
    total_rows: toNumber(raw.total_rows) ?? undefined,
    distribution,
    ratios,
    latency_total_ms: toNumber(raw.latency_total_ms) ?? undefined,
    latency_avg_ms: toNumber(raw.latency_avg_ms) ?? undefined,
    interpretation,
  };
}

function formatMs(value?: number): string {
  if (typeof value !== "number") return "-";
  return `${value.toFixed(2)} ms`;
}

function formatPercent(value?: number): string {
  if (typeof value !== "number") return "-";
  return `${(value * 100).toFixed(1)} %`;
}

const DEFAULT_JSON = `{
  "Pclass": 3,
  "Sex": "male",
  "Age": 28,
  "SibSp": 0,
  "Parch": 0,
  "Fare": 7.25,
  "Embarked": "S"
}`;

export default function PredictPage() {
  const [tab, setTab] = useState<"manual" | "upload">("manual");

  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<PredictFileResponse | null>(
    null,
  );

  const [bodyText, setBodyText] = useState(DEFAULT_JSON);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonResult, setJsonResult] = useState<PredictJsonResponse | null>(
    null,
  );

  const loadModels = useCallback(async () => {
    setModelsError(null);
    try {
      const data = await fetchJson<{ models: ModelOption[] }>("/api/models");
      const list = data.models || [];
      setModels(list);
      const first = list.find((model) => model.available !== false) || list[0];
      if (first?.version) setSelectedVersion(first.version);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const previewColumns = useMemo(() => {
    const rows = fileResult?.preview_rows;
    if (!rows?.length) return [];
    return Object.keys(rows[0]);
  }, [fileResult]);

  const batchStats = useMemo(() => parseStats(fileResult?.stats), [fileResult]);

  const batchDistribution = useMemo(() => {
    if (!batchStats?.distribution) return [];
    return Object.entries(batchStats.distribution).sort((a, b) => b[1] - a[1]);
  }, [batchStats]);

  const jsonDistribution = useMemo(() => {
    if (!jsonResult?.predictions?.length) return [];
    const counter = new Map<string, number>();
    for (const pred of jsonResult.predictions) {
      const key = String(pred);
      counter.set(key, (counter.get(key) || 0) + 1);
    }
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
  }, [jsonResult]);

  const onUploadSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setUploadError(null);
    setFileResult(null);
    if (!file) {
      setUploadError("Choisis un fichier CSV (ou JSON / XLSX selon support).");
      return;
    }
    setUploadLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (selectedVersion) form.append("model_version", selectedVersion);
      const data = await fetchJson<PredictFileResponse>("/api/predict-file", {
        method: "POST",
        body: form,
      });
      setFileResult(data);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadLoading(false);
    }
  };

  const onJsonSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setJsonError(null);
    setJsonResult(null);
    let payload: unknown;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      setJsonError("JSON invalide.");
      return;
    }
    setJsonLoading(true);
    try {
      const obj =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      if (selectedVersion) obj.model_version = selectedVersion;
      const data = await fetchJson<PredictJsonResponse>("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      });
      setJsonResult(data);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
    } finally {
      setJsonLoading(false);
    }
  };

  return (
    <div className="hud-stack">
      <div className="hud-panel">
        <div className="hud-panel-head">
          <div className="hud-panel-head-inner">
            <div className="hud-panel-icon">
              <Cpu aria-hidden />
            </div>
            <div>
              <h1 className="hud-title">TEST DU MODÈLE</h1>
              <p className="hud-subtitle">
                API Flask — prédiction unitaire ou lot fichier
              </p>
            </div>
          </div>
        </div>

        <div className="hud-panel-body">
          <div className="hud-callout hud-mb1 hud-predict-callout">
            <h3 className="hud-label hud-predict-callout-title">
              FORMAT DU DATASET REQUIS
            </h3>
            <p className="hud-prose">
              Pour des prédictions optimales, vos fichiers (.csv, .xlsx, .txt)
              doivent contenir les colonnes suivantes :<br />
              <code>Pclass</code> (1, 2, 3), <code>Sex</code> (male/female),{" "}
              <code>Age</code>, <code>SibSp</code>, <code>Parch</code>,{" "}
              <code>Fare</code> et <code>Embarked</code> (S, C, Q).
              <br />
              <span className="hud-predict-note">
                Note : Le système gère automatiquement le nettoyage et
                l&apos;encodage des colonnes manquantes ou brutes.
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadModels()}
            className="hud-btn hud-mb1"
          >
            <RefreshCw size={14} aria-hidden />
            Rafraîchir les modèles
          </button>
          {modelsError ? <div className="hud-error">{modelsError}</div> : null}

          <div className="hud-tabs">
            <button
              type="button"
              className={
                tab === "manual" ? "hud-tab hud-tab-active" : "hud-tab"
              }
              onClick={() => setTab("manual")}
            >
              UNITAIRE (JSON)
            </button>
            <button
              type="button"
              className={
                tab === "upload" ? "hud-tab hud-tab-active" : "hud-tab"
              }
              onClick={() => setTab("upload")}
            >
              LOT (UPLOAD FICHIER)
            </button>
          </div>

          <div className="hud-field-block">
            <label className="hud-label" htmlFor="model-shared">
              SÉLECTION DU MODÈLE
            </label>
            <select
              id="model-shared"
              className="hud-select"
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={!models.length}
            >
              {models.map((m) => (
                <option
                  key={m.version}
                  value={m.version}
                  disabled={m.available === false}
                >
                  {(m.display_name || m.version) +
                    (m.available === false ? " (indisponible)" : "")}
                </option>
              ))}
            </select>
          </div>

          {tab === "manual" ? (
            <form onSubmit={(e) => void onJsonSubmit(e)}>
              <label className="hud-label" htmlFor="json-body">
                PAYLOAD JSON (Caractéristiques passager)
              </label>
              <textarea
                id="json-body"
                className="hud-textarea hud-textarea-tall"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                spellCheck={false}
              />
              <button
                type="submit"
                className="hud-btn hud-btn-primary"
                disabled={jsonLoading}
              >
                <Send size={14} aria-hidden />
                {jsonLoading ? "Analyse en cours…" : "TESTER L'INDIVIDU"}
              </button>
              {jsonError ? <div className="hud-error">{jsonError}</div> : null}
              {jsonResult ? (
                <div className="hud-section-gap">
                  <h4 className="hud-label">RÉSULTAT DE PRÉDICTION</h4>
                  <div className="hud-stats-grid">
                    <article className="hud-stat-card">
                      <p className="hud-stat-k">Prédictions</p>
                      <p className="hud-stat-v">
                        {jsonResult.predictions.length}
                      </p>
                    </article>
                    <article className="hud-stat-card">
                      <p className="hud-stat-k">Latence totale</p>
                      <p className="hud-stat-v">
                        {formatMs(jsonResult.latency_ms)}
                      </p>
                    </article>
                    <article className="hud-stat-card">
                      <p className="hud-stat-k">Modèle utilisé</p>
                      <p className="hud-stat-v">
                        {jsonResult.model_display_name ||
                          jsonResult.model_version ||
                          "-"}
                      </p>
                    </article>
                  </div>
                  {jsonDistribution.length > 0 ? (
                    <div className="hud-section-gap">
                      <h4 className="hud-label">DISTRIBUTION DES CLASSES</h4>
                      <div className="hud-dist-list">
                        {jsonDistribution.map(([label, count]) => {
                          const ratio = jsonResult.predictions.length
                            ? count / jsonResult.predictions.length
                            : 0;
                          return (
                            <div key={label} className="hud-dist-item">
                              <div className="hud-dist-meta">
                                <span>Classe {label}</span>
                                <span>
                                  {count} ({formatPercent(ratio)})
                                </span>
                              </div>
                              <progress
                                className="hud-dist-progress"
                                value={ratio}
                                max={1}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <pre className="hud-pre">
                    {JSON.stringify(jsonResult, null, 2)}
                  </pre>
                </div>
              ) : null}
            </form>
          ) : (
            <form
              onSubmit={(e) => void onUploadSubmit(e)}
              className="hud-upload-zone"
            >
              <label className="hud-label" htmlFor="file">
                CHARGER UN FICHIER DE TEST
              </label>
              <div className="hud-file-input-wrapper">
                <input
                  id="file"
                  className="hud-file"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.json"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="hud-help-text">
                  Formats acceptés : <strong>.CSV</strong>,{" "}
                  <strong>.TXT</strong> (séparateur auto),{" "}
                  <strong>.XLSX</strong>
                </div>
              </div>

              <div className="hud-upload-actions">
                <button
                  type="submit"
                  className="hud-btn hud-btn-primary"
                  disabled={uploadLoading || !file}
                >
                  <UploadCloud size={14} aria-hidden />
                  {uploadLoading
                    ? "Traitement du lot..."
                    : "LANCER LA PRÉDICTION PAR LOT"}
                </button>
                {!file && (
                  <p className="hud-help-inline">
                    Veuillez sélectionner un fichier.
                  </p>
                )}
              </div>

              {uploadError ? (
                <div className="hud-error hud-error-spaced">{uploadError}</div>
              ) : null}
            </form>
          )}
        </div>
      </div>

      {tab === "upload" && fileResult && !fileResult.error ? (
        <div className="hud-panel">
          <div className="hud-panel-head">
            <div className="hud-panel-head-inner">
              <div className="hud-panel-icon">
                <Cpu aria-hidden />
              </div>
              <div>
                <h2 className="hud-title hud-title-sm">RÉSULTAT FICHIER</h2>
                <p className="hud-subtitle">Run {fileResult.run_id}</p>
              </div>
            </div>
          </div>
          <div className="hud-panel-body">
            <p className="hud-meta">
              Fichier : <strong>{fileResult.filename}</strong> — lignes :{" "}
              {fileResult.total_count} — modèle :{" "}
              <strong>
                {fileResult.model_display_name || fileResult.model_version}
              </strong>
            </p>
            <p className="hud-meta">
              <a className="hud-link" href={fileResult.download_url}>
                Télécharger le CSV
              </a>
            </p>
            {batchStats ? (
              <section className="hud-section-gap">
                <h3 className="hud-h2">STATISTIQUES PRÉDICTION LOT</h3>
                <div className="hud-stats-grid">
                  <article className="hud-stat-card">
                    <p className="hud-stat-k">Lignes traitées</p>
                    <p className="hud-stat-v">
                      {batchStats.total_rows ?? fileResult.total_count ?? 0}
                    </p>
                  </article>
                  <article className="hud-stat-card">
                    <p className="hud-stat-k">Latence totale</p>
                    <p className="hud-stat-v">
                      {formatMs(batchStats.latency_total_ms)}
                    </p>
                  </article>
                  <article className="hud-stat-card">
                    <p className="hud-stat-k">Latence moyenne / ligne</p>
                    <p className="hud-stat-v">
                      {formatMs(batchStats.latency_avg_ms)}
                    </p>
                  </article>
                </div>

                {batchDistribution.length > 0 ? (
                  <div className="hud-section-gap">
                    <h4 className="hud-label">DISTRIBUTION DES CLASSES</h4>
                    <div className="hud-dist-list">
                      {batchDistribution.map(([label, count]) => {
                        const ratio = batchStats.ratios?.[label] ?? 0;
                        return (
                          <div key={label} className="hud-dist-item">
                            <div className="hud-dist-meta">
                              <span>Classe {label}</span>
                              <span>
                                {count} ({formatPercent(ratio)})
                              </span>
                            </div>
                            <progress
                              className="hud-dist-progress"
                              value={ratio}
                              max={1}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {batchStats.interpretation &&
                batchStats.interpretation.length > 0 ? (
                  <div className="hud-section-gap">
                    <h4 className="hud-label">INTERPRÉTATION AUTOMATIQUE</h4>
                    <ul className="hud-interpret-list">
                      {batchStats.interpretation.map((item, idx) => (
                        <li key={`${idx}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <details className="hud-details">
                  <summary>Voir le JSON brut des statistiques</summary>
                  <pre className="hud-pre">
                    {JSON.stringify(fileResult.stats, null, 2)}
                  </pre>
                </details>
              </section>
            ) : null}
            {fileResult.preview_rows && fileResult.preview_rows.length > 0 ? (
              <>
                <h3 className="hud-h2">
                  Aperçu (top 20 / {fileResult.total_count})
                </h3>
                <div className="hud-table-wrap">
                  <table className="hud-table">
                    <thead>
                      <tr>
                        {previewColumns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileResult.preview_rows.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          {previewColumns.map((c) => (
                            <td key={c}>
                              {row[c] === null || row[c] === undefined
                                ? ""
                                : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
