import { AlertTriangle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModuleShell from "../components/ModuleShell";
import { useNotebook } from "../hooks/useNotebook";

const otherModelsTrainTest = [
  { name: "Decision Tree",  train: 100.0, test: 75.0,  ecart: 25.0 },
  { name: "Random Forest",  train: 98.7,  test: 80.6,  ecart: 18.1 },
  { name: "Gradient Boosting", train: 95.0, test: 84.0, ecart: 11.0 },
  { name: "SVM",           train: 86.0,  test: 68.7,  ecart: 17.3 },
  { name: "KNN",           train: 83.0,  test: 70.1,  ecart: 12.9 },
  { name: "Naive Bayes",   train: 79.9,  test: 79.1,  ecart: 0.8  },
  { name: "XGBoost",       train: 90.5,  test: 77.2,  ecart: 13.3 },
];

const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontSize: "0.75rem",
};

export default function OverfittingPage() {
  const { data, loading, error } = useNotebook();

  const learningCurve = useMemo(() => {
    const lc = data?.overfitting?.learning_curve;
    if (!lc || !lc.sizes || !lc.sizes.length) return [];
    return lc.sizes.map((size, index) => ({
      size,
      train: lc.train_scores[index],
      test: lc.val_scores[index],
    }));
  }, [data]);

  if (loading) {
    return (
      <ModuleShell icon={Zap} title="MODULE 05: SUR-APPRENTISSAGE" subtitle="SYS_TASK: DIAGNOSTIC">
        <div className="hud-loading-state">
          <Loader2 className="hud-spinner" size={48} />
          <p>Analyse des biais et variances...</p>
        </div>
      </ModuleShell>
    );
  }

  if (error || !data) {
    return (
      <ModuleShell icon={Zap} title="MODULE 05: SUR-APPRENTISSAGE" subtitle="SYS_TASK: DIAGNOSTIC">
        <div className="hud-error-callout">
          <AlertTriangle size={32} />
          <p>Erreur: {error || "Impossible de charger les données"}</p>
        </div>
      </ModuleShell>
    );
  }

  const lr = data?.overfitting?.logistic_regression;
  
  // Si les données critiques sont absentes, on affiche un message au lieu de crasher
  if (!lr) {
    return (
      <ModuleShell icon={Zap} title="MODULE 05: SUR-APPRENTISSAGE" subtitle="SYS_TASK: DIAGNOSTIC">
        <div className="hud-error-callout">
          <AlertTriangle size={32} />
          <p>Données d&apos;overfitting manquantes dans le notebook.</p>
        </div>
      </ModuleShell>
    );
  }

  const allModels = [
    { 
      name: "Logistic Regression", 
      train: lr.train_accuracy ?? 0, 
      test: lr.test_accuracy ?? 0, 
      ecart: lr.ecart_accuracy ?? 0 
    },
    ...otherModelsTrainTest
  ].sort((a, b) => (b.ecart || 0) - (a.ecart || 0));

  return (
    <ModuleShell
      icon={Zap}
      title="MODULE 05: SUR-APPRENTISSAGE (OVERFITTING)"
      subtitle="Diagnostic et prévention — courbes d'apprentissage, validation croisée"
    >
      <p className="hud-prose hud-prose-tight hud-mb-section">
        Comparaison dynamique des scores Train vs Test.
      </p>

      {/* ── Tableau écarts train/test réels ── */}
      <h2 className="hud-block-title">
        <AlertTriangle size={18} aria-hidden />
        COMPARAISON TRAIN / TEST — TOUS LES MODÈLES (dynamique)
      </h2>
      <div className="hud-table-dark-wrap hud-mb-section">
        <table className="hud-table-dark">
          <thead>
            <tr>
              <th>Modèle</th>
              <th>Accuracy Train (%)</th>
              <th>Accuracy Test (%)</th>
              <th>Écart (pp)</th>
              <th>Sur-apprentissage ?</th>
            </tr>
          </thead>
          <tbody>
            {allModels.map((m) => {
              const surapp = m.ecart > 10;
              return (
                <tr key={m.name} style={{ background: m.name.includes("Logistic") ? "rgba(6,182,212,0.1)" : undefined }}>
                  <td style={{ fontWeight: 700, color: "var(--hud-cyan-200)" }}>{m.name}</td>
                  <td>{m.train.toFixed(1)}%</td>
                  <td>{m.test.toFixed(1)}%</td>
                  <td style={{ color: surapp ? "#f87171" : "#10b981", fontWeight: 700 }}>
                    {m.ecart.toFixed(1)} pp
                  </td>
                  <td>
                    {surapp ? (
                      <span style={{ color: "#f87171", fontWeight: 700 }}>⚠ OUI</span>
                    ) : (
                      <span style={{ color: "#10b981", fontWeight: 700 }}>✓ NON</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Régression Logistique — résultat précis du notebook */}
      <div className="hud-callout" style={{ borderColor: "rgba(16, 185, 129, 0.45)", background: "rgba(6, 78, 59, 0.22)", marginBottom: "2rem" }}>
        <h3 className="hud-callout-title" style={{ color: "var(--hud-emerald)" }}>
          <CheckCircle2 size={16} aria-hidden />
          RÉGRESSION LOGISTIQUE — {lr.conclusion.toUpperCase()}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "0.75rem" }}>
          {[
            { label: "Accuracy Train", val: `${(lr.train_accuracy ?? 0).toFixed(2)} %`, color: "#f87171" },
            { label: "Accuracy Test",  val: `${(lr.test_accuracy ?? 0).toFixed(2)} %`, color: "#10b981" },
            { label: "Écart",          val: `${(lr.ecart_accuracy ?? 0).toFixed(2)} pp`,  color: "#67e8f9" },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: item.color, fontFamily: "var(--font-mono)" }}>
                {item.val}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--hud-cyan-600)", marginTop: "0.2rem" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-split-2">
        {/* ── Courbe d'apprentissage ── */}
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} className="hud-target" style={{ color: "#22d3ee" }} aria-hidden />
            Courbe d&apos;apprentissage (Learning Curve) — Notebook
          </h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={learningCurve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrainOf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTestOf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="size" stroke="#67e8f9" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[50, 105]} stroke="#67e8f9" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <CartesianGrid strokeDasharray="3 3" stroke="#164e63" vertical={false} />
                <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "#a5f3fc", fontSize: "0.7rem" }} />
                <Area type="monotone" dataKey="train" name="Train Score" stroke="#ef4444" fillOpacity={1} fill="url(#colorTrainOf)" />
                <Area type="monotone" dataKey="test"  name="Validation Score" stroke="#10b981" fillOpacity={1} fill="url(#colorTestOf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Solutions ── */}
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Solutions du notebook</h3>
          <ul className="hud-solutions-list">
            <li>
              <div className="hud-solutions-num">1</div>
              <div>
                <strong style={{ color: "var(--hud-cyan-200)" }}>Régularisation (Rég. Logistique)</strong>
                <p className="hud-prose" style={{ margin: "0.25rem 0 0", maxWidth: "none", fontSize: "0.75rem" }}>
                  Stabilisation des coefficients via pénalité L2.
                </p>
              </div>
            </li>
            <li>
              <div className="hud-solutions-num">2</div>
              <div>
                <strong style={{ color: "var(--hud-cyan-200)" }}>Validation Croisée (K-Fold cv=5)</strong>
                <p className="hud-prose" style={{ margin: "0.25rem 0 0", maxWidth: "none", fontSize: "0.75rem" }}>
                  Utilisée systématiquement dans le Grid Search.
                </p>
              </div>
            </li>
          </ul>
          <div className="hud-callout" style={{ marginTop: "1rem", borderColor: "rgba(16, 185, 129, 0.45)", background: "rgba(6, 78, 59, 0.2)" }}>
            <p className="hud-prose" style={{ margin: 0, maxWidth: "none", fontSize: "0.8rem" }}>
              Conclusion : Gradient Boosting (11 pp) et Arbre (25 pp) montrent un potentiel de sur-apprentissage, contrairement à la Régression Logistique.
            </p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
