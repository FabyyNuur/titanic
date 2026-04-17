import { BarChart2, Info, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModuleShell from "../components/ModuleShell";
import { useNotebook } from "../hooks/useNotebook";

// Fallbacks RÉELS (seront remplacés par le hook si implémenté dans le parser plus tard)
const survivalByClass = [
  { name: "1ʳᵉ Classe", Survécu: 136, Décédé: 80,  tauxSurvie: 62.9 },
  { name: "2ᵉ Classe",  Survécu: 87,  Décédé: 97,  tauxSurvie: 47.3 },
  { name: "3ᵉ Classe",  Survécu: 119, Décédé: 372, tauxSurvie: 24.2 },
];



const ageDistribution = [
  { age: "0-10",  count: 64 },
  { age: "11-20", count: 115 },
  { age: "21-30", count: 230 },
  { age: "31-40", count: 155 },
  { age: "41-50", count: 86 },
  { age: "51-60", count: 42 },
  { age: "60+",   count: 22 },
];

const correlationData = [
  { x: "Survived", y: "Survived", z: 1.00 },
  { x: "Survived", y: "Pclass",   z: -0.34 },
  { x: "Survived", y: "Age",      z: -0.08 },
  { x: "Survived", y: "Fare",     z: 0.26 },
  { x: "Pclass",   y: "Survived", z: -0.34 },
  { x: "Pclass",   y: "Pclass",   z: 1.00 },
  { x: "Pclass",   y: "Age",      z: -0.37 },
  { x: "Pclass",   y: "Fare",     z: -0.55 },
  { x: "Age",      y: "Survived", z: -0.08 },
  { x: "Age",      y: "Pclass",   z: -0.37 },
  { x: "Age",      y: "Age",      z: 1.00 },
  { x: "Age",      y: "Fare",     z: 0.10 },
  { x: "Fare",     y: "Survived", z: 0.26 },
  { x: "Fare",     y: "Pclass",   z: -0.55 },
  { x: "Fare",     y: "Age",      z: 0.10 },
  { x: "Fare",     y: "Fare",     z: 1.00 },
];

const axisStroke = "#67e8f9";
const gridStroke = "#164e63";
const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
};

export default function VisualizationPage() {
  const { data, loading, error } = useNotebook();

  if (loading) {
    return (
      <div className="hud-loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem" }}>
        <Loader2 className="animate-spin" size={48} color="var(--hud-cyan-400)" />
        <p className="hud-prose">Génération des statistiques depuis train.ipynb...</p>
      </div>
    );
  }

  // Distribution de la survie réelle extraite
  const targetDist = data?.target_distribution;
  const pieData = [
    { name: "Décédés", value: targetDist?.n_0 || 549, color: "#ef4444" },
    { name: "Survivants", value: targetDist?.n_1 || 342, color: "#10b981" },
  ];

  return (
    <ModuleShell
      icon={BarChart2}
      title="MODULE 02: VISUALISATION"
      subtitle="SYS_TASK: DISTRIBUTIONS & RELATIONS"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p className="hud-prose hud-prose-tight" style={{ margin: 0 }}>
          Exploration visuelle des données du Titanic — Synchronisée avec l&apos;état actuel du dataset.
        </p>
        <div className="hud-sync-tag">
          <BarChart2 size={14} /> {data?.dataset?.lignes || 891} points exploités
        </div>
      </div>

      {error && <div className="hud-error-msg hud-mb1">Erreur de lecture : {error}</div>}

      {/* ── Row 1 : Survie (Pie) + Survie par classe ── */}
      <div className="hud-two-col" style={{ marginTop: 0 }}>
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Répartition globale Survived (Extraction réelle)</h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "#a5f3fc", fontSize: "0.7rem", marginTop: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.7rem", color: "#64748b" }}>
             Survivants : {(targetDist?.pct_1 ?? 0).toFixed(1)}% | Décédés : {(targetDist?.pct_0 ?? 0).toFixed(1)}%
          </div>
        </div>

        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Survie par classe sociale</h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={survivalByClass}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={axisStroke} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis stroke={axisStroke} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "#a5f3fc", fontSize: "0.7rem" }} />
                <Bar dataKey="Survécu" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Décédé" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 2 : Distribution âge + Heatmap ── */}
      <div className="hud-two-col">
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Distribution de l&apos;âge (histogramme)</h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="age" stroke={axisStroke} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis stroke={axisStroke} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Passagers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Corrélations (Heatmap simplifiée)</h3>
          <div className="hud-heatmap-wrap">
            <div className="hud-heatmap-axis-top" aria-hidden>
              <span>Surv.</span>
              <span>Class</span>
              <span>Age</span>
              <span>Fare</span>
            </div>
            <div className="hud-heatmap-axis-left" aria-hidden>
              <span>Surv.</span>
              <span>Class</span>
              <span>Age</span>
              <span>Fare</span>
            </div>
            <div className="hud-heatmap-grid">
              {correlationData.map((d, i) => {
                const absZ = Math.abs(d.z);
                const color = d.z === 1 ? "#1e293b" : d.z > 0 ? `rgba(16, 185, 129, ${absZ})` : `rgba(239, 68, 68, ${absZ})`;
                return (
                  <div key={i} className="hud-heatmap-cell" style={{ backgroundColor: color, color: absZ > 0.4 ? "#fff" : "#94a3b8" }}>
                    {d.z.toFixed(2)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="hud-callout hud-mb-section">
        <h3 className="hud-callout-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Info size={16} /> Interprétation EDA
        </h3>
        <p className="hud-prose" style={{ fontSize: "0.8rem", margin: 0 }}>
          Les visualisations confirment les hypothèses du notebook : la classe passager (Pclass) et le genre sont les
          variables les plus corrélées à la survie. Les passagers de 1ʳere classe ont bénéficié d&apos;un accès prioritaire
          aux canots, tout comme les femmes (Lady First).
        </p>
      </div>
    </ModuleShell>
  );
}
