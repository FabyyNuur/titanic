import { NavLink } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Binary,
  Brain,
  Database,
  Layers,
  Search,
  Target,
  Terminal,
  Zap,
} from "lucide-react";

const steps = [
  { name: "Exploration", icon: Search, desc: "Comprendre les variables et identifier la cible.", to: "/exploration" },
  { name: "Visualisation", icon: BarChart3, desc: "Histogrammes, barres, heatmap.", to: "/visualization" },
  { name: "Préparation", icon: Database, desc: "Valeurs manquantes, encodage, normalisation.", to: "/preparation" },
  { name: "Modélisation", icon: Binary, desc: "Entraînement de 8 modèles (LogReg à XGBoost).", to: "/modeling" },
  { name: "Sur-apprentissage", icon: Zap, desc: "Train vs Test, overfitting, régularisation.", to: "/overfitting" },
  { name: "Optimisation", icon: Target, desc: "Grid Search CV pour les hyperparamètres.", to: "/optimization" },
  { name: "Ensemble", icon: Layers, desc: "Bagging, Boosting, Voting, Stacking.", to: "/ensemble" },
  { name: "MLOps", icon: Brain, desc: "Versioning, pipelines, déploiement, monitoring.", to: "/mlops" },
];

export default function OverviewPage() {
  return (
    <div className="hud-stack hud-max">
      <div className="hud-overview-hero">
        <div className="hud-overview-hero-grid" aria-hidden />
        <div className="hud-overview-hero-inner">
          <div className="hud-kicker">
            <Terminal size={12} aria-hidden />
            INITIALISATION SYSTÈME
          </div>
          <h1 className="hud-hero-title">TITANIC ML</h1>
          <p className="hud-hero-lead">
            Bienvenue sur le tableau de bord du projet Machine Learning Titanic. Ce portail rassemble toutes les phases
            de l&apos;étude, de l&apos;exploration des données (EDA) jusqu&apos;au déploiement du modèle de prédiction.
          </p>
          <div className="hud-hero-actions">
            <NavLink to="/predict" className="hud-btn-hero">
              TESTER LE MODÈLE
              <ArrowRight size={18} aria-hidden />
            </NavLink>
            <NavLink to="/exploration" className="hud-btn-outline">
              EXPLORER LES DONNÉES
            </NavLink>
          </div>
        </div>
      </div>

      <div>
        <h2 className="hud-section-title">
          <Layers size={16} aria-hidden />
          ÉTAPES DU PROJET
        </h2>
        <div className="hud-card-grid">
          {steps.map((step, idx) => (
            <NavLink key={step.to} to={step.to} className="hud-overview-card">
              <div className="hud-overview-card-icon">
                <step.icon aria-hidden />
              </div>
              <h3>
                <span className="hud-overview-card-num">0{idx + 1}</span>
                {step.name.toUpperCase()}
              </h3>
              <p>{step.desc}</p>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
