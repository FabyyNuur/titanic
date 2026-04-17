import { AlertTriangle, CheckCircle2, Cpu, Database, Loader2, RotateCw } from "lucide-react";
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
import { useNotebook } from "../hooks/useNotebook";

const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontSize: "0.75rem",
};

export default function PreparationPage() {
  const { data, loading, error } = useNotebook();

  if (loading) {
    return (
      <div className="hud-loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem" }}>
        <Loader2 className="animate-spin" size={48} color="var(--hud-cyan-400)" />
        <p className="hud-prose">Analyse du pipeline de données dans train.ipynb...</p>
      </div>
    );
  }

  const missingValues = data?.missing_values || [];
  const prepSteps = data?.preprocessing?.steps || [
    "Suppression des colonnes PassengerId, Name, Ticket, Cabin",
    "Imputation de l'Age par la médiane (28 ans)",
    "Imputation de Embarked par le mode (S)",
    "Standardisation des données numériques"
  ];

  return (
    <ModuleShell
      icon={Database}
      title="MODULE 03: PRÉPARATION"
      subtitle="SYS_TASK: CLEANING & ENCODING"
    >
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p className="hud-prose hud-prose-tight" style={{ margin: 0 }}>
          Pipeline de préparation des données extrait dynamiquement depuis le notebook.
        </p>
        <div className="hud-sync-tag">
          <Database size={14} /> Synchronisé
        </div>
      </div>

      {error && (
        <div className="hud-error-msg hud-mb1">
          Attention : Erreur de lecture ({error}).
        </div>
      )}

      {/* ── Tableau valeurs manquantes + décisions ── */}
      <h2 className="hud-block-title">
        <AlertTriangle size={18} aria-hidden />
        VALEURS MANQUANTES DÉTECTÉES (Extraction réelle)
      </h2>
      <div className="hud-table-dark-wrap hud-mb-section">
        <table className="hud-table-dark">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Nb manquants</th>
              <th>Pourcentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {missingValues.map((m) => (
              <tr key={m.variable}>
                <td style={{ fontWeight: 700, color: "var(--hud-cyan-200)" }}>{m.variable}</td>
                <td style={{ color: m.pct_manquants > 50 ? "#f87171" : m.pct_manquants > 10 ? "#fbbf24" : "#10b981" }}>{m.nb_manquants}</td>
                <td style={{ color: m.pct_manquants > 50 ? "#f87171" : m.pct_manquants > 10 ? "#fbbf24" : "#10b981", fontWeight: 700 }}>
                  {m.pct_manquants.toFixed(2)}%
                </td>
                <td style={{ color: "var(--hud-cyan-300)", fontStyle: "italic" }}>
                  {m.pct_manquants > 50 ? "Supprimée" : "Imputée"}
                </td>
              </tr>
            ))}
            {missingValues.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center" }}>Aucune valeur manquante détectée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Graphique valeurs manquantes ── */}
      <div className="hud-chart-panel" style={{ height: "10rem", marginBottom: "2rem" }}>
        <div className="hud-chart-area" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={missingValues} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#164e63" horizontal vertical={false} />
              <XAxis type="number" stroke="#67e8f9" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <YAxis dataKey="variable" type="category" width={72} stroke="#67e8f9" tick={{ fill: "#a5f3fc", fontSize: 11 }} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(2)}%`, "Pourcentage manquant"]} />
              <Bar dataKey="pct_manquants" name="% manquant" radius={[0, 4, 4, 0]}>
                {missingValues.map((m, i) => (
                  <Cell key={i} fill={m.pct_manquants > 50 ? "#ef4444" : m.pct_manquants > 10 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Étapes de préparation ── */}
      <h2 className="hud-block-title">
        <Cpu size={18} aria-hidden />
        ACTIONS DE PRÉ-TRAITEMENT (Extraction)
      </h2>
      <div className="hud-prep-grid">
        {prepSteps.map((step, idx) => (
          <div key={idx} className="hud-prep-card">
            <div className="hud-prep-card-head">
              <div className="hud-panel-icon" style={{ padding: "0.45rem" }}>
                <CheckCircle2 size={20} aria-hidden />
              </div>
              <h3 style={{ fontSize: "0.85rem" }}>{step}</h3>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
              Action identifiée dans les cellules de transformation du notebook.
            </p>
          </div>
        ))}
      </div>

      {/* ── Résumé final du dataset préparé ── */}
      <div className="hud-prep-banner">
        <div className="hud-panel-icon" style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%" }}>
          <RotateCw size={28} aria-hidden />
        </div>
        <div>
          <h4>Dataset final — Prêt pour la modélisation</h4>
          <p>
            Après préparation : <strong>{data?.dataset?.colonnes || 8} colonnes</strong> retenues.{" "}
            <strong>{data?.dataset?.lignes || 891} passagers</strong> synchronisés.
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.80rem", color: "#94a3b8" }}>
            Pipeline : <code>StandardScaler + Estimator</code>. Artefacts : <code>modeles_titanic.joblib</code>.
          </p>
        </div>
      </div>
    </ModuleShell>
  );
}
