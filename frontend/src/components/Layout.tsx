import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart2,
  Cpu,
  Database,
  Layers,
  Search,
  Server,
  Settings,
  Ship,
  Terminal,
  Zap,
} from "lucide-react";

type Step = {
  id: string;
  name: string;
  path: string;
  icon: typeof Ship;
};

const pipelineSteps: Step[] = [
  { id: "00", name: "INIT", path: "/", icon: Ship },
  { id: "01", name: "EXPLORE", path: "/exploration", icon: Search },
  { id: "02", name: "VISUALIZE", path: "/visualization", icon: BarChart2 },
  { id: "03", name: "PREPARE", path: "/preparation", icon: Database },
  { id: "04", name: "MODEL", path: "/modeling", icon: Activity },
  { id: "05", name: "OVERFIT", path: "/overfitting", icon: Zap },
  { id: "06", name: "OPTIMIZE", path: "/optimization", icon: Settings },
  { id: "07", name: "ENSEMBLE", path: "/ensemble", icon: Layers },
  { id: "08", name: "MLOPS", path: "/mlops", icon: Server },
];

function stepIsActive(pathname: string, stepPath: string): boolean {
  if (stepPath === "/") return pathname === "/" || pathname === "";
  return pathname === stepPath;
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="hud-root">
      <div className="hud-grid-bg" aria-hidden />
      <div className="hud-glow-top" aria-hidden />

      <header className="hud-header">
        <NavLink to="/" end className="hud-brand">
          <div className="hud-brand-icon">
            <Terminal aria-hidden />
          </div>
          <div className="hud-brand-text">
            <span className="hud-brand-title">TITANIC_OS</span>
            <span className="hud-brand-sub">SYS.v1.2</span>
          </div>
        </NavLink>

        <div className="hud-header-right">
          <div className="hud-pill">
            <span className="hud-pill-dot" aria-hidden />
            <span>SYSTÈME STABLE</span>
          </div>
          <NavLink
            to="/predict"
            className={({ isActive }) => (isActive ? "hud-cta hud-cta-active" : "hud-cta")}
          >
            <Cpu aria-hidden />
            <span>TESTER LE MODÈLE</span>
          </NavLink>
        </div>
      </header>

      <nav className="hud-nav" aria-label="Navigation pipeline">
        <div className="hud-nav-inner">
          {pipelineSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = stepIsActive(location.pathname, step.path);
            const isLast = index === pipelineSteps.length - 1;
            return (
              <div key={step.path} className="hud-nav-step">
                <NavLink
                  to={step.path}
                  className={isActive ? "hud-nav-link hud-nav-link-active" : "hud-nav-link"}
                  end={step.path === "/"}
                >
                  <div className="hud-nav-link-row">
                    <span className="hud-nav-id">{step.id}</span>
                    <Icon aria-hidden />
                  </div>
                  <span className="hud-nav-label">{step.name}</span>
                  {isActive ? <div className="hud-nav-active-bar" aria-hidden /> : null}
                </NavLink>
                {!isLast ? <div className="hud-nav-connector" aria-hidden /> : null}
              </div>
            );
          })}
        </div>
      </nav>

      <main className="hud-main">
        <div className="hud-frame">
          <div className="hud-corner hud-corner-tl" aria-hidden />
          <div className="hud-corner hud-corner-tr" aria-hidden />
          <div className="hud-corner hud-corner-bl" aria-hidden />
          <div className="hud-corner hud-corner-br" aria-hidden />
          <div className="hud-scroll">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
