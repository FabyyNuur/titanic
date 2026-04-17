import { CheckCircle, Combine, Flame, Layers, Loader2, Scale, Trophy } from "lucide-react";
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

const techniques = [
  {
    title: "Bagging (bootstrap aggregating)",
    icon: Combine,
    description:
      "Plusieurs modèles entraînés sur des sous-échantillons bootstrap ; agrégation des prédictions par vote ou moyenne.",
    model: "Random Forest",
    color: "#06b6d4",
  },
  {
    title: "Boosting",
    icon: Flame,
    description:
      "Modèles en séquence : chaque estimateur corrige les erreurs résiduelles du précédent en pondérant les exemples mal classés.",
    model: "Gradient Boosting, XGBoost",
    color: "#f59e0b",
  },
  {
    title: "Voting Classifier",
    icon: CheckCircle,
    description:
      "Combine des modèles hétérogènes (Gradient Boosting + Random Forest + XGBoost). Vote dur (hard) ou pondéré (soft).",
    model: "VotingClassifier sklearn",
    color: "#10b981",
  },
  {
    title: "Stacking",
    icon: Layers,
    description:
      "Un méta-modèle apprend à combiner les prédictions de plusieurs modèles de base pour la décision finale.",
    model: "StackingClassifier",
    color: "#8b5cf6",
  },
];

const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontSize: "0.75rem",
};

export default function EnsemblePage() {
  const { data, loading, error } = useNotebook();

  if (loading) {
    return (
      <div className="hud-loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem" }}>
        <Loader2 className="animate-spin" size={48} color="var(--hud-cyan-400)" />
        <p className="hud-prose">Analyse des méthodes d&apos;ensemble dans train.ipynb...</p>
      </div>
    );
  }

  const ens = data?.ensemble;
  const models = data?.models || [];
  
  // Construction du tableau de comparaison dynamique
  const bestBase = models[0];
  const comparisonData = [
    { name: `${bestBase?.name || "Gradient Boosting"} (Base)`, acc: bestBase?.accuracy || 84.0 },
    { name: "Optimisé (GridSearch)", acc: data?.optimization?.best_score || 86.5 },
    { name: "Voting Classifier (Ensemble)", acc: ens?.accuracy || 86.8 },
  ];

  return (
    <ModuleShell
      icon={Layers}
      title="MODULE 07: ENSEMBLE (BAGGING, BOOSTING, VOTING)"
      subtitle="Combinaison de modèles pour améliorer la performance"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p className="hud-prose hud-prose-tight" style={{ margin: 0 }}>
          Le notebook exploite la puissance des méthodes d&apos;ensemble pour stabiliser les prédictions.
        </p>
        <div className="hud-sync-tag">
          <Layers size={14} /> Extraction réelle
        </div>
      </div>

      {error && (
        <div className="hud-error-msg hud-mb1">
          Attention : Erreur de flux ({error}). Utilisation des métriques simulées.
        </div>
      )}

      {/* ── 4 cartes techniques ── */}
      <div className="hud-ensemble-grid">
        {techniques.map((tech) => {
          const Icon = tech.icon;
          return (
            <div key={tech.title} className="hud-ensemble-card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.65rem" }}>
                <div className="hud-panel-icon" style={{ padding: "0.4rem", borderColor: `${tech.color}33` }}>
                  <Icon size={20} aria-hidden style={{ color: tech.color }} />
                </div>
                <h2 style={{ color: tech.color }}>{tech.title}</h2>
              </div>
              <p className="hud-prose" style={{ marginBottom: "0.85rem", maxWidth: "none", fontSize: "0.8rem" }}>
                {tech.description}
              </p>
              <div className="hud-ensemble-meta">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, color: "var(--hud-cyan-200)" }}>Implémentation</span>
                  <span>{tech.model}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid rgba(8, 145, 178, 0.25)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <Scale size={14} aria-hidden />
                    Statut
                  </span>
                  <span style={{ textAlign: "right", fontSize: "0.78rem" }}>Actif dans le notebook</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Graphique comparaison ensemble ── */}
      <h2 className="hud-block-title" style={{ marginTop: "2rem" }}>
        <Trophy size={18} aria-hidden />
        COMPARAISON ACCURACY — BASE VS ENSEMBLE (SYNCHRONISÉ)
      </h2>
      <div className="hud-chart-panel" style={{ height: "14rem", marginBottom: "1.5rem" }}>
        <div className="hud-chart-area" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#164e63" horizontal vertical={false} />
              <XAxis
                type="number"
                domain={[70, 95]}
                stroke="#06b6d4"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={160}
                stroke="#06b6d4"
                tick={{ fill: "#a5f3fc", fontSize: 10 }}
              />
              <RechartsTooltip
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Accuracy"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="acc" name="Accuracy" radius={[0, 4, 4, 0]}>
                {comparisonData.map((_, i) => (
                  <Cell key={i} fill={i === 2 ? "#f59e0b" : i === 1 ? "#10b981" : "#06b6d4"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Footer résultat réel ── */}
      <div className="hud-ensemble-footer">
        <div style={{ maxWidth: "40rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--hud-cyan-100)" }}>
            Résultat final : VotingClassifier
          </h3>
          <p className="hud-prose" style={{ margin: 0, maxWidth: "none", fontSize: "0.85rem", color: "#94a3b8" }}>
            En combinant plusieurs modèles via un vote majoritaire (dur), le VotingClassifier permet d&apos;obtenir
            un score de <strong>{(ens?.accuracy || 86.8).toFixed(1)}%</strong>. C&apos;est la solution la plus robuste pour
            le déploiement, car elle compense les faiblesses individuelles de chaque algorithme.
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.8rem" }}>
             <div className="hud-mini-pill">F1: {(ens?.f1 || 0).toFixed(1)}%</div>
             <div className="hud-mini-pill">Precision: {(ens?.precision || 0).toFixed(1)}%</div>
             <div className="hud-mini-pill">Recall: {(ens?.recall || 0).toFixed(1)}%</div>
          </div>
        </div>
        <div className="hud-score-ring">
          <span>{(ens?.accuracy || 0).toFixed(1)}%</span>
          <span>Accuracy</span>
        </div>
      </div>
    </ModuleShell>
  );
}
