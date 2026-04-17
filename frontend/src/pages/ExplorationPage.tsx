import { AlertTriangle, Database, Hash, HelpCircle, Loader2, Search, TerminalSquare, ToggleLeft, Type } from "lucide-react";
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
import { useMemo } from "react";

const rows = [
  { icon: ToggleLeft, name: "SURVIVED",    target: true,  dtype: "BINAIRE",     desc: "Variable cible — Survie (0 = Non, 1 = Oui)",          sample: "0 / 1" },
  { icon: Hash,       name: "PCLASS",      target: false, dtype: "ORDINAL",     desc: "Classe du billet (1 = 1ʳᵉ, 2 = 2ᵉ, 3 = 3ᵉ classe)",  sample: "3" },
  { icon: Type,       name: "NAME",        target: false, dtype: "TEXTE",       desc: "Nom complet du passager",                              sample: "Braund, Mr. Owen Harris" },
  { icon: ToggleLeft, name: "SEX",         target: false, dtype: "CATÉGORIEL",  desc: "Genre du passager",                                    sample: "male" },
  { icon: Hash,       name: "AGE",         target: false, dtype: "NUMÉRIQUE",   desc: "Âge en années (19.9 % de valeurs manquantes)",         sample: "22.0" },
  { icon: Hash,       name: "SIBSP",       target: false, dtype: "NUMÉRIQUE",   desc: "Nombre de frères/sœurs ou époux à bord",              sample: "1" },
  { icon: Hash,       name: "PARCH",       target: false, dtype: "NUMÉRIQUE",   desc: "Nombre de parents ou enfants à bord",                  sample: "0" },
  { icon: Hash,       name: "FARE",        target: false, dtype: "NUMÉRIQUE",   desc: "Prix du billet",                                       sample: "7.25" },
  { icon: ToggleLeft, name: "EMBARKED",    target: false, dtype: "CATÉGORIEL",  desc: "Port d'embarquement (C, Q, S) — 0.22 % manquants",    sample: "S" },
  { icon: Type,       name: "CABIN",       target: false, dtype: "TEXTE",       desc: "Numéro de cabine (77.1 % manquants → supprimée)",      sample: "C85 / NaN" },
];

const TARGET_COLORS = ["#ef4444", "#10b981"];

const tooltipStyle = {
  backgroundColor: "#083344",
  border: "1px solid #06b6d4",
  color: "#cffafe",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
};

export default function ExplorationPage() {
  const { data, loading, error } = useNotebook();

  const targetData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Non-survivants (0)", value: data.target_distribution.n_0, pct: data.target_distribution.pct_0 },
      { name: "Survivants (1)",     value: data.target_distribution.n_1, pct: data.target_distribution.pct_1 },
    ];
  }, [data]);

  const missingData = useMemo(() => {
    if (!data) return [];
    return data.missing_values.map(m => ({
      variable: m.variable,
      nb: m.nb_manquants,
      pct: m.pct_manquants
    }));
  }, [data]);

  if (loading) {
    return (
      <ModuleShell icon={Database} title="MODULE 01: EXPLORATION" subtitle="SYS_TASK: PARSE_VARIABLES & IDENTIFY_TARGET">
        <div className="hud-loading-state">
          <Loader2 className="hud-spinner" size={48} />
          <p>Chargement des données du notebook...</p>
        </div>
      </ModuleShell>
    );
  }

  if (error || !data) {
    return (
      <ModuleShell icon={Database} title="MODULE 01: EXPLORATION" subtitle="SYS_TASK: PARSE_VARIABLES & IDENTIFY_TARGET">
        <div className="hud-error-callout">
          <AlertTriangle size={32} />
          <p>Erreur: {error || "Impossible de charger les données"}</p>
        </div>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      icon={Database}
      title="MODULE 01: EXPLORATION"
    >
      <p className="hud-prose hud-prose-tight hud-mb-section">
        Résultats <strong>réels</strong> de l'analyse effectuée dans <code>train.ipynb</code> <br />— Dimension : <strong>{data.dataset.lignes} lignes × {data.dataset.colonnes} colonnes</strong>.
        {data.dataset.variables_numeriques} variables numériques, {data.dataset.variables_categorielles} catégorielles. {data.dataset.lignes_dupliquees} ligne dupliquée. <br /> Variable cible :{" "}
        <strong>Survived</strong> ({data.target_distribution.pct_1}% de 1).
      </p>

      {/* ── Statistiques globales ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "Passagers (lignes)", val: data.dataset.lignes?.toString() },
          { label: "Variables (colonnes)", val: data.dataset.colonnes?.toString() },
          { label: "Lignes dupliquées", val: data.dataset.lignes_dupliquees?.toString() },
          { label: "Total valeurs manquantes", val: data.dataset.total_manquants.toString() },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(8,51,68,0.7)",
              border: "1px solid rgba(6,182,212,0.2)",
              borderRadius: "0.5rem",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--hud-cyan-300)", fontFamily: "var(--font-mono)" }}>
              {s.val}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--hud-cyan-600)", marginTop: "0.25rem", letterSpacing: "0.08em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Dictionnaire des variables ── */}
      <h2 className="hud-block-title">
        <Search size={18} aria-hidden />
        DATA_DICTIONARY ({data.dataset.lignes} × {data.dataset.colonnes})
      </h2>
      <div className="hud-table-dark-wrap hud-mb-section">
        <table className="hud-table-dark">
          <thead>
            <tr>
              <th>VARIABLE_NAME</th>
              <th>DATA_TYPE</th>
              <th>DESCRIPTION</th>
              <th>SAMPLE_VALUE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <tr key={r.name}>
                  <td>
                    <span className="hud-cell-name">
                      <Icon size={16} aria-hidden className={r.target ? "hud-target" : undefined} />
                      <span className={r.target ? "hud-target" : undefined}>
                        {r.name}
                        {r.target ? " [TARGET]" : ""}
                      </span>
                    </span>
                  </td>
                  <td>{r.dtype}</td>
                  <td>{r.desc}</td>
                  <td className={r.target ? "hud-target" : undefined}>{r.sample}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Deux graphiques ── */}
      <div className="hud-two-col" style={{ marginBottom: "2rem" }}>
        {/* Variable cible */}
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Répartition variable cible — Survived (réelle)</h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={4}
                  label={({ pct }) => `${pct}%`}
                >
                  {targetData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TARGET_COLORS[index % TARGET_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v} passagers`, name]} />
                <Legend wrapperStyle={{ color: "#a5f3fc", fontSize: "0.7rem" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="hud-prose" style={{ margin: "0.5rem 0 0", maxWidth: "none", fontSize: "0.75rem", textAlign: "center" }}>
            Survivants : <strong style={{ color: "#10b981" }}>{data.target_distribution.n_1} ({data.target_distribution.pct_1} %)</strong> — Non-survivants :{" "}
            <strong style={{ color: "#ef4444" }}>{data.target_distribution.n_0} ({data.target_distribution.pct_0} %)</strong>
          </p>
        </div>

        {/* Valeurs manquantes */}
        <div className="hud-chart-panel">
          <h3 className="hud-chart-title">Valeurs manquantes par variable (réelles)</h3>
          <div className="hud-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#164e63" horizontal vertical={false} />
                <XAxis
                  type="number"
                  stroke="#67e8f9"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="variable"
                  type="category"
                  width={70}
                  stroke="#67e8f9"
                  tick={{ fill: "#a5f3fc", fontSize: 11 }}
                />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) =>
                    name === "pct" ? [`${v}%`, "Pourcentage"] : [`${v}`, "Nb manquants"]
                  }
                />
                <Legend wrapperStyle={{ color: "#a5f3fc", fontSize: "0.7rem" }} />
                <Bar dataKey="pct" name="Pourcentage manquant (%)" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {missingData.map((d, index) => (
                    <Cell key={index} fill={d.pct > 50 ? "#ef4444" : d.pct > 10 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="hud-prose" style={{ margin: "0.5rem 0 0", maxWidth: "none", fontSize: "0.75rem" }}>
            Total manquants : <strong>{data.dataset.total_manquants} valeurs</strong>
          </p>
        </div>
      </div>

      {/* ── Analyses univariée et bivariée ── */}
      <div className="hud-two-col">
        <div className="hud-callout hud-callout-corner">
          <h3 className="hud-callout-title">
            <TerminalSquare size={16} aria-hidden />
            ANALYSE UNIVARIÉE (résultats réels)
          </h3>
          <ul>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>Dimension : <strong>{data.dataset.lignes} passagers × {data.dataset.colonnes} variables</strong>.</span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>Données <strong>équilibrées</strong> : {data.target_distribution.pct_1}% survivants / {data.target_distribution.pct_0}% non-survivants.</span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>{data.dataset.variables_numeriques} variables numériques, {data.dataset.variables_categorielles} catégorielles. <strong>{data.dataset.lignes_dupliquees} doublon</strong> détecté.</span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span><strong>Age</strong> : distribution asymétrique, médiane ≈ 28 ans. Âge médian retenu pour l'imputation.</span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span><strong>Cabin</strong> : variable avec trop de valeurs manquantes (77.1%) → supprimée.</span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span><strong>Embarked</strong> : 2 valeurs manquantes → remplacées par la modalité la plus fréquente (S).</span>
            </li>
          </ul>
        </div>

        <div className="hud-callout hud-callout-corner">
          <h3 className="hud-callout-title">
            <HelpCircle size={16} aria-hidden />
            ANALYSE BIVARIÉE vs TARGET (résultats réels)
          </h3>
          <ul>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>
                <strong>Sexe</strong> : femmes → taux de survie <strong>74 %</strong> ; hommes → <strong>18 %</strong>.
              </span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>
                <strong>Pclass</strong> : 1ʳᵉ classe → <strong>62 %</strong> de survie ; 2ᵉ → 47 % ; 3ᵉ → <strong>24 %</strong>.
              </span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>
                Corrélation Survived / Pclass = <strong>–0.34</strong> (mieux classé = plus de survie).
              </span>
            </li>
            <li>
              <span className="hud-callout-prompt">&gt;</span>
              <span>
                Corrélation Survived / Fare = <strong>+0.26</strong> (cher = plus de chances).
              </span>
            </li>
          </ul>
        </div>
      </div>
    </ModuleShell>
  );
}
