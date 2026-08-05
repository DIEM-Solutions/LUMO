import type { ReactNode } from "react";

export function Topbar({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {actions && <div className="topbar-right">{actions}</div>}
    </header>
  );
}
