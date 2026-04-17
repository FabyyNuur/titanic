import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function ModuleShell({ icon: Icon, title, subtitle, children }: Props) {
  return (
    <div className="hud-stack">
      <div className="hud-panel">
        <div className="hud-panel-head">
          <div className="hud-panel-head-inner">
            <div className="hud-panel-icon">
              <Icon aria-hidden />
            </div>
            <div>
              <h1 className="hud-title">{title}</h1>
              {subtitle ? <p className="hud-subtitle">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        <div className="hud-panel-body">{children}</div>
      </div>
    </div>
  );
}
