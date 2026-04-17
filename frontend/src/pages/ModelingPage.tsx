import { useMemo, useState, useEffect } from "react";
import { Activity, ChevronRight, Cpu, Info, Loader2, AlertTriangle, TerminalSquare, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModuleShell from "../components/ModuleShell";
import { useNotebook, ModelMetric } from "../hooks/useNotebook";

type ModelRow = ModelMetric & {
  type: string;
};

const getModelType = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("boosting") || n.includes("forest") || n.includes("xgb")) return "Ensemble";
  if (n.includes("logistic") || n.includes("nb") || n.includes("bayes")) return "Linéaire/Prob";
  if (n.includes("tree")) return "Arbre";
  if (n.includes("knn") || n.includes("svm")) return "Distance/Marge";
  return "Autre";
};

const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
};

const axisStyle = { fill: "#94a3b8", fontSize: 10, fontFamily: "var(--font-mono)" };

export default function ModelingPage() {
  const { data, loading, error } = useNotebook();
  const [selectedModel, setSelectedModel] = useState<ModelRow | null>(null);

  const models = useMemo<ModelRow[]>(() => {
    if (!data) return [];
    return data.models.map(m => ({
      ...m,
      type: getModelType(m.name)
    })).sort((a, b) => b.score_moyen - a.score_moyen);
  }, [data]);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  if (loading) {
    return (
      <ModuleShell icon={Activity} title="MODULE 04: MODÉLISATION" subtitle="SYS_TASK: ALGORITHM_COMPARISON">
        <div className="hud-loading-state">
          <Loader2 className="hud-spinner" size={48} />
          <p>Analyse des modèles du notebook...</p>
        </div>
      </ModuleShell>
    );
  }

  if (error || !data || models.length === 0) {
    return (
      <ModuleShell icon={Activity} title="MODULE 04: MODÉLISATION" subtitle="SYS_TASK: ALGORITHM_COMPARISON">
        <div className="hud-error-callout">
          <AlertTriangle size={32} />
          <p>Erreur: {error || "Aucun modèle trouvé dans le notebook"}</p>
        </div>
      </ModuleShell>
    );
  }

  const best = models[0];
  const activeModel = selectedModel || best;

  return (
    <ModuleShell
      icon={Activity}
      title="MODULE 04: MODÉLISATION"
      subtitle="SYS_TASK: ALGORITHM_COMPARISON & PERFORMANCE_METRICS"
    >
      <p className="hud-prose hud-prose-tight hud-mb-section">
        {models.length} modèles évalués sur le jeu de
        test. Métriques : Accuracy, F1-score, Précision, Rappel.
      </p>

      {/* ── Tableau des métriques réelles ── */}
      <h2 className="hud-block-title">
        <Trophy size={18} aria-hidden />
        RÉSULTATS COMPLETS (TOUTES MÉTRIQUES)
      </h2>
      <div className="hud-table-dark-wrap hud-mb-section">
        <table className="hud-table-dark">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Modèle</th>
              <th>Famille</th>
              <th>Accuracy (%)</th>
              <th>F1-score (%)</th>
              <th>Précision (%)</th>
              <th>Rappel (%)</th>
              <th>Score Moyen (%)</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr
                key={m.name}
                style={{ cursor: "pointer", background: activeModel.name === m.name ? "rgba(6,182,212,0.08)" : undefined }}
                onClick={() => setSelectedModel(m)}
              >
                <td style={{ fontWeight: 800, color: m.rang === 1 ? "var(--hud-emerald)" : "var(--hud-cyan-400)" }}>
                  #{m.rang}
                </td>
                <td style={{ color: m.rang === 1 ? "var(--hud-emerald)" : "var(--hud-cyan-200)", fontWeight: 700 }}>{m.name}</td>
                <td style={{ color: "var(--hud-cyan-600)", fontSize: "0.7rem", letterSpacing: "0.1em" }}>{m.type.toUpperCase()}</td>
                <td style={{ color: m.rang === 1 ? "var(--hud-emerald)" : undefined }}>{m.accuracy.toFixed(1)}%</td>
                <td>{m.f1.toFixed(1)}%</td>
                <td>{m.precision.toFixed(1)}%</td>
                <td>{m.recall.toFixed(1)}%</td>
                <td style={{ fontWeight: 700, color: m.rang === 1 ? "var(--hud-emerald)" : "var(--hud-cyan-300)" }}>
                  {m.score_moyen.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hud-layout-modeling">
        {/* ── Graphique barres ── */}
        <div>
          <h2 className="hud-block-title">
            <Trophy size={18} aria-hidden />
            PERFORMANCE_MATRIX (ACCURACY)
          </h2>
          <div className="hud-chart-panel" style={{ height: "22rem", marginBottom: "1rem" }}>
            <div className="hud-chart-area" style={{ height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={models} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#164e63" horizontal vertical={false} />
                  <XAxis
                    type="number"
                    domain={[50, 90]}
                    stroke="#06b6d4"
                    tick={{ ...axisStyle }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    stroke="#06b6d4"
                    tick={{ fill: "#a5f3fc", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => [`${val.toFixed(1)}%`, "Accuracy"]}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#22d3ee" }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {models.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#10b981" : "#06b6d4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="hud-callout" style={{ borderColor: "rgba(16, 185, 129, 0.45)", background: "rgba(6, 78, 59, 0.25)" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <TerminalSquare size={20} className="hud-target" aria-hidden />
              <p className="hud-prose" style={{ margin: 0, maxWidth: "none" }}>
                <span style={{ fontWeight: 800, color: "var(--hud-emerald)" }}>
                  [{best.name.toUpperCase()}]
                </span>{" "}
                meilleur modèle global — Accuracy{" "}
                <strong style={{ color: "var(--hud-emerald)" }}>{best.accuracy.toFixed(1)}%</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ── Registre ── */}
        <div>
          <h3 className="hud-block-title" style={{ marginBottom: "0.75rem" }}>
            MODEL_REGISTRY
          </h3>
          {models.map((model, idx) => (
            <button
              key={model.name}
              type="button"
              className={`hud-model-list-btn ${activeModel.name === model.name ? "hud-model-list-btn-active" : ""}`}
              onClick={() => setSelectedModel(model)}
            >
              <div className="hud-model-list-btn-row">
                <div>
                  <div style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: "0.65rem", color: "var(--hud-cyan-300)" }}>
                    {model.name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "0.55rem", color: "var(--hud-cyan-700)", marginTop: "0.2rem", letterSpacing: "0.15em" }}>
                    TYPE: {model.type.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      color: idx === 0 ? "var(--hud-emerald)" : "var(--hud-cyan-400)",
                    }}
                  >
                    {model.accuracy.toFixed(1)}%
                  </span>
                  <ChevronRight size={16} aria-hidden style={{ opacity: activeModel.name === model.name ? 1 : 0.35 }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Détail modèle sélectionné ── */}
      <div className="hud-detail-grid">
        <div>
          <div
            style={{
              fontSize: "0.55rem",
              fontWeight: 800,
              letterSpacing: "0.25em",
              color: "var(--hud-cyan-600)",
              marginBottom: "0.35rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Cpu size={12} aria-hidden />
            ACTIVE_MODEL
          </div>
          <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.06em", color: "var(--hud-cyan-200)" }}>
            {activeModel.name.toUpperCase()}
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.65rem", color: "var(--hud-cyan-600)", letterSpacing: "0.12em" }}>
            FAMILY: {activeModel.type.toUpperCase()} | RANG: #{activeModel.rang}
          </p>
        </div>
        <div className="hud-detail-metric">
          <div className="label">METRIC: ACCURACY</div>
          <div className="value hud-target">{activeModel.accuracy.toFixed(1)}%</div>
        </div>
        <div className="hud-detail-metric">
          <div className="label">METRIC: F1</div>
          <div className="value" style={{ color: "#60a5fa" }}>{activeModel.f1.toFixed(1)}%</div>
        </div>
        <div className="hud-detail-metric">
          <div className="label">METRIC: PRÉCISION</div>
          <div className="value" style={{ color: "#fbbf24" }}>{activeModel.precision.toFixed(1)}%</div>
        </div>
        <div className="hud-detail-metric">
          <div className="label">METRIC: RAPPEL</div>
          <div className="value" style={{ color: "#a78bfa" }}>{activeModel.recall.toFixed(1)}%</div>
        </div>
        <div className="hud-detail-metric">
          <div className="label">SCORE MOYEN</div>
          <div className="value" style={{ color: "#34d399" }}>{activeModel.score_moyen.toFixed(1)}%</div>
        </div>
      </div>

      {/* ── Validation Croisée ── */}
      <h2 className="hud-block-title" style={{ marginTop: "2rem" }}>
        <Activity size={18} aria-hidden />
        VALIDATION CROISÉE (K-FOLD CV=5) — Notebook Results
      </h2>
      <div className="hud-chart-panel" style={{ height: "18rem", marginBottom: "2rem" }}>
        <div className="hud-chart-area" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.cv_scores} layout="vertical" margin={{ top: 8, right: 30, left: 20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#164e63" horizontal vertical={false} />
              <XAxis 
                type="number" 
                domain={[50, 90]} 
                stroke="#06b6d4" 
                tick={{ ...axisStyle }} 
                tickFormatter={(v) => `${v}%`} 
              />
              <YAxis 
                dataKey="model" 
                type="category" 
                width={140} 
                stroke="#06b6d4" 
                tick={{ fill: "#a5f3fc", fontSize: 10, fontFamily: "var(--font-mono)" }} 
              />
              <RechartsTooltip
                formatter={(val: number) => [`${val.toFixed(1)}%`, "Score Moyen CV"]}
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#10b981" }}
              />
              <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Matrice de confusion (Régression Logistique) ── */}
      <h2 className="hud-block-title" style={{ marginTop: "2rem" }}>
        <Info size={18} aria-hidden />
        MATRICE DE CONFUSION — RÉGRESSION LOGISTIQUE (dynamique)
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxWidth: "28rem" }}>
        {[
          { label: "Vrais Négatifs (VN)", val: data.confusion_matrix_logreg.vn, color: "#10b981", desc: "Prédit 0, Réel 0" },
          { label: "Faux Positifs (FP)", val: data.confusion_matrix_logreg.fp, color: "#f87171", desc: "Prédit 1, Réel 0" },
          { label: "Faux Négatifs (FN)", val: data.confusion_matrix_logreg.fn, color: "#f87171", desc: "Prédit 0, Réel 1" },
          { label: "Vrais Positifs (VP)", val: data.confusion_matrix_logreg.vp, color: "#10b981", desc: "Prédit 1, Réel 1" },
        ].map((cell) => (
          <div
            key={cell.label}
            style={{
              background: "rgba(8,51,68,0.7)",
              border: `1px solid ${cell.color}44`,
              borderRadius: "0.5rem",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: 900, color: cell.color, fontFamily: "var(--font-mono)" }}>
              {cell.val}
            </div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--hud-cyan-300)", marginTop: "0.25rem" }}>
              {cell.label}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--hud-cyan-600)", marginTop: "0.15rem" }}>{cell.desc}</div>
          </div>
        ))}
      </div>
    </ModuleShell>
  );
}
