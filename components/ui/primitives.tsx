import type { ReactNode } from "react";
import type {
  BlockerUrgency,
  CapacityBand,
  HealthValue,
  Person,
  Priority,
  ProjectType,
  Stage,
  TaskStatus,
} from "@/lib/types";

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  person,
  size,
}: {
  person: Pick<Person, "name" | "solid"> | null | undefined;
  size?: "sm" | "lg";
}) {
  if (!person) {
    return (
      <div className={`avatar${size ? " " + size : ""}`} style={{ background: "#ccc" }}>
        ?
      </div>
    );
  }
  return (
    <div
      className={`avatar${size ? " " + size : ""}`}
      style={{ background: person.solid ?? "#9797AC" }}
      title={person.name}
    >
      {initials(person.name)}
    </div>
  );
}

export function PeopleChips({ people }: { people: (Person | null | undefined)[] }) {
  return (
    <div className="people-chip-row">
      {people.filter(Boolean).map((p) => (
        <span className="people-chip" key={p!.id}>
          <Avatar person={p} size="sm" />
          {p!.name.split(" ")[0]}
        </span>
      ))}
    </div>
  );
}

/** Overlapping avatar-initials only, no names in the DOM — name is on hover via title. */
export function AvatarStack({ people, size = "sm" }: { people: (Person | null | undefined)[]; size?: "sm" | undefined }) {
  const list = people.filter(Boolean) as Person[];
  return (
    <div className="kc-people">
      {list.map((p) => (
        <Avatar person={p} size={size} key={p.id} />
      ))}
    </div>
  );
}

export function TypeTag({ type }: { type: ProjectType }) {
  return <span className={`tag ${type}`}>{type === "client" ? "Client" : "Internal"}</span>;
}

export function PriorityTag({ priority }: { priority: Priority }) {
  return <span className={`tag priority-${priority}`}>{priority}</span>;
}

const STAGE_LABEL: Record<Stage, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done",
  blocked: "Blocked",
};

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={`stage-pill ${stage}`}>{STAGE_LABEL[stage]}</span>;
}

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return <span className={`task-status-pill ${status}`}>{STAGE_LABEL[status]}</span>;
}

const HEALTH_LABEL: Record<HealthValue, string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  blocked: "Blocked",
};

export function HealthFlag({ health }: { health: HealthValue }) {
  return (
    <span className={`health-flag ${health}`}>
      <span className="dot" />
      {HEALTH_LABEL[health]}
    </span>
  );
}

const CAP_LABEL: Record<CapacityBand, string> = {
  available: "Available",
  balanced: "Balanced",
  "almost-full": "Almost full",
  "needs-support": "Needs support",
  overloaded: "Overloaded",
};

export function CapStatusPill({ band }: { band: CapacityBand | "unknown" }) {
  if (band === "unknown") return <span className="cap-status-pill unknown">No baseline</span>;
  return <span className={`cap-status-pill ${band}`}>{CAP_LABEL[band]}</span>;
}

export function UrgencyDot({ urgency }: { urgency: BlockerUrgency }) {
  const color =
    urgency === "high" ? "var(--health-blocked)" : urgency === "medium" ? "var(--health-atrisk)" : "var(--ink-faint)";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: color }} />;
}

export function AdjustedTag({ children = "Manually set" }: { children?: ReactNode }) {
  return <span className="adjusted-tag">{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="kpi-card" style={accent ? ({ ["--accent-bar" as string]: accent } as React.CSSProperties) : undefined}>
      <div className="kpi-num">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn btn-${variant}${size === "sm" ? " btn-sm" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function RunwayBar({ pct, stage }: { pct: number; stage: Stage }) {
  return (
    <div className="runway-track">
      <div
        className={`runway-fill ${stage}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function CapacityBar({ pct, band }: { pct: number; band: CapacityBand }) {
  return (
    <div className="capacity-bar-track">
      <div
        className={`capacity-bar-fill ${band}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Donut({
  segments,
  centerNum,
  centerLabel,
}: {
  segments: { color: string; pct: number }[];
  centerNum: ReactNode;
  centerLabel: string;
}) {
  const stops = segments
    .filter((s) => s.pct > 0)
    .reduce<{ acc: number; parts: string[] }>(
      (state, s) => {
        const end = state.acc + s.pct;
        return { acc: end, parts: [...state.parts, `${s.color} ${state.acc}% ${end}%`] };
      },
      { acc: 0, parts: [] }
    ).parts;
  const gradient =
    stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(var(--bg-deep) 0% 100%)";

  return (
    <div className="donut" style={{ background: gradient }}>
      <div className="donut-hole">
        <div className="donut-num">{centerNum}</div>
        <div className="donut-lbl">{centerLabel}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "○", children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon}</div>
      {children}
    </div>
  );
}
