"use client";

import { useMemo, useState } from "react";
import { CAP_STATUS_LABEL, computeCapacity, computeDailyCapacity, computeWeeklyCapacity } from "@/lib/domain/capacity";
import { addDays, clamp, fmt, fromISO, round, today } from "@/lib/domain/dates";
import { computeStage } from "@/lib/domain/stage";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar, Card, CapacityBar, CapStatusPill, KpiCard } from "@/components/ui/primitives";
import type { CapacityBand, WorkloadThresholds } from "@/lib/types";

function mainActiveProjectFor(personId: string, store: ReturnType<typeof createStore>) {
  const active = store
    .projectsForPerson(personId)
    .filter((p) => computeStage(p, store.tasksFor(p.id)) !== "done")
    .sort((a, b) => fromISO(a.end_date ?? "9999-12-31").getTime() - fromISO(b.end_date ?? "9999-12-31").getTime());
  return active[0] ?? null;
}

const ABSENCE_LOOKAHEAD_DAYS = 14;

const DISTRIBUTION_PALETTE = ["var(--diem-blue)", "var(--diem-teal)", "var(--diem-yellow)", "var(--diem-purple)", "var(--diem-orange)"];

function workloadDistribution(personId: string, store: ReturnType<typeof createStore>, projectColor: Map<string, string>) {
  const tasks = store.activeTasksForPerson(personId);
  if (!tasks.length) return [];
  const counts = new Map<string, number>();
  tasks.forEach((tk) => counts.set(tk.project_id, (counts.get(tk.project_id) ?? 0) + 1));
  const total = tasks.length;
  return [...counts.entries()]
    .map(([projectId, count]) => ({
      projectId,
      project: store.projectById(projectId),
      pct: round((count / total) * 100),
      color: projectColor.get(projectId) ?? "var(--ink-faint)",
    }))
    .sort((a, b) => b.pct - a.pct);
}

export function TeamClient({
  data,
  isAdmin,
  thresholds,
}: {
  data: PortalData;
  isAdmin: boolean;
  thresholds: WorkloadThresholds;
}) {
  const store = useMemo(() => createStore(data), [data]);
  const [bandFilter, setBandFilter] = useState<"all" | CapacityBand>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const allRows = store
    .capacityRoster()
    .map((p) => ({ person: p, cap: computeCapacity(p.id, store, thresholds) }))
    .sort((a, b) => (b.cap.pct ?? 0) - (a.cap.pct ?? 0));

  const roles = Array.from(new Set(allRows.map((r) => r.person.role).filter(Boolean))) as string[];

  const bandCounts: Record<CapacityBand, number> = {
    available: 0,
    balanced: 0,
    "almost-full": 0,
    "needs-support": 0,
    overloaded: 0,
  };
  allRows.forEach((r) => {
    if (r.cap.band !== "unknown") bandCounts[r.cap.band]++;
  });

  const q = search.trim().toLowerCase();
  const rows = allRows.filter((r) => {
    if (bandFilter !== "all" && r.cap.band !== bandFilter) return false;
    if (roleFilter !== "all" && r.person.role !== roleFilter) return false;
    if (q && !r.person.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const windowStart = today();
  const windowEnd = addDays(windowStart, ABSENCE_LOOKAHEAD_DAYS - 1);
  const absencesInWindow = data.dayOff.filter(
    (d) => d.status === "approved" && fromISO(d.end_date) >= windowStart && fromISO(d.start_date) <= windowEnd
  );
  const canHelp = allRows.filter((r) => ["available", "balanced"].includes(r.cap.band));

  const heatmapRows = rows.map((r) => ({
    person: r.person,
    daily: computeDailyCapacity(r.person.id, store, windowStart, thresholds),
    weekly: computeWeeklyCapacity(r.person.id, store, undefined, thresholds),
  }));

  const projectColor = new Map<string, string>();
  data.projects.forEach((p, i) => projectColor.set(p.id, DISTRIBUTION_PALETTE[i % DISTRIBUTION_PALETTE.length]));

  const distributionByPerson = rows
    .filter((r) => r.person.role_type !== "ceo")
    .map((r) => ({ person: r.person, dist: workloadDistribution(r.person.id, store, projectColor) }));
  const legendProjects = new Map<string, string>();
  distributionByPerson.forEach(({ dist }) =>
    dist.forEach((d) => {
      if (d.project) legendProjects.set(d.project.id, d.project.name);
    })
  );

  return (
    <>
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        {(["available", "balanced", "almost-full", "needs-support", "overloaded"] as CapacityBand[]).map((band) => (
          <div key={band} onClick={() => setBandFilter(bandFilter === band ? "all" : band)} style={{ cursor: "pointer" }}>
            <KpiCard label={CAP_STATUS_LABEL[band]} value={bandCounts[band]} accent={`var(--cap-${band}-fg)`} />
          </div>
        ))}
      </div>

      <Card className="heatmap-card">
        <div className="panel-head-row">
          <h2>Capacity heat map</h2>
        </div>
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Hours booked today vs. this week, out of each person&apos;s real capacity — spot who&apos;s about to get overloaded before it happens.
        </div>
        <div className="heatmap-grid">
          <div className="heatmap-head">Team member</div>
          <div className="heatmap-head" style={{ justifyContent: "center" }}>Today</div>
          <div className="heatmap-head" style={{ justifyContent: "center" }}>This week</div>
          {heatmapRows.map((r) => (
            <div key={r.person.id} style={{ display: "contents" }}>
              <div className="heatmap-person">
                <Avatar person={r.person} size="sm" />
                <span className="mp-name">{r.person.name}</span>
              </div>
              <div className={`heatmap-cell ${r.daily.band}`}>
                {r.daily.pct != null ? `${r.daily.hours}/${r.daily.capacityHours}h` : "—"}
              </div>
              <div className={`heatmap-cell ${r.weekly.band}`}>
                {r.weekly.pct != null ? `${r.weekly.hours}/${r.weekly.capacityHours}h` : "—"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="two-col">
        <div>
          <div className="filter-bar">
            <input
              type="text"
              className="filter-select"
              style={{ minWidth: 180, cursor: "text" }}
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {bandFilter !== "all" && (
              <button className="filter-pill active" onClick={() => setBandFilter("all")}>
                {CAP_STATUS_LABEL[bandFilter]} ✕
              </button>
            )}
          </div>
          {rows.length ? (
            <div className="team-simple-grid">
              {rows.map((r) => {
                const mainProj = mainActiveProjectFor(r.person.id, store);
                return (
                  <div className="team-card" key={r.person.id}>
                    <div className="tc-top">
                      <Avatar person={r.person} size="lg" />
                      <div className="tc-id">
                        <div className="tc-name">{r.person.name}{r.cap.awayNow ? " 🌴" : ""}</div>
                        <div className="tc-role">{r.person.role}</div>
                      </div>
                    </div>
                    <div className="tc-row">
                      <CapStatusPill band={r.cap.band} />
                      <span className="tc-avail">
                        {r.cap.pct == null ? "" : `${Math.max(0, 100 - r.cap.pct)}% available${r.cap.source === "reported" ? " · reported" : ""}`}
                      </span>
                    </div>
                    {r.cap.pct != null && (
                      <div style={{ marginTop: 8 }}>
                        <CapacityBar pct={clamp(r.cap.pct, 4, 100)} band={r.cap.band === "unknown" ? "available" : r.cap.band} />
                      </div>
                    )}
                    <div className="tc-main-proj">
                      <span className="tc-lbl">Main project</span>
                      <span className="tc-val">{mainProj ? mainProj.name : "No active project"}</span>
                    </div>
                    {isAdmin && r.person.next_assessment_date && (
                      <div className="tc-main-proj" style={{ marginTop: 8, paddingTop: 8 }}>
                        <span className="tc-lbl">Next assessment</span>
                        <span className="tc-val">{fmt(fromISO(r.person.next_assessment_date))}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Card><div className="empty-state">No one matches this filter.</div></Card>
          )}
        </div>
        <div className="stack-gap">
          <Card>
            <div className="panel-head-row">
              <h2>Workload distribution</h2>
            </div>
            <div className="field-hint" style={{ marginBottom: 10 }}>Share of each person&apos;s open (not-done) tasks, by project.</div>
            {legendProjects.size > 0 && (
              <div className="people-chip-row" style={{ marginBottom: 14 }}>
                {Array.from(legendProjects.entries()).map(([id, name]) => (
                  <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: projectColor.get(id), flexShrink: 0 }} />
                    {name}
                  </span>
                ))}
              </div>
            )}
            <div className="stack-gap" style={{ gap: 12 }}>
              {distributionByPerson.map(({ person, dist }) => (
                <div key={person.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <Avatar person={person} size="sm" />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{person.name.split(" ")[0]}</span>
                  </div>
                  {dist.length ? (
                    <div
                      className="dist-bar"
                      title={dist.map((d) => `${d.project?.name ?? "—"}: ${d.pct}%`).join(" · ")}
                    >
                      {dist.map((d) => (
                        <div key={d.projectId} style={{ width: `${d.pct}%`, background: d.color }} />
                      ))}
                    </div>
                  ) : (
                    <div className="dist-bar dist-bar-empty" />
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="panel-head-row">
              <h2>Can provide support</h2>
            </div>
            {canHelp.length ? (
              <div className="people-chip-row">
                {canHelp.map((r) => (
                  <span className="people-chip" key={r.person.id}>
                    <Avatar person={r.person} size="sm" />
                    {r.person.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            ) : (
              <div className="empty-state">No one has spare capacity right now.</div>
            )}
          </Card>
          <Card>
            <div className="panel-head-row">
              <h2>Approved absences</h2>
            </div>
            {absencesInWindow.length ? (
              absencesInWindow.map((d) => {
                const person = store.personById(d.person_id);
                return (
                  <div className="dayoff-row" key={d.id}>
                    <div className="dayoff-main">
                      <Avatar person={person} size="sm" />
                      <div>
                        <div className="dayoff-top">{person?.name} — {d.type}</div>
                        <div className="dayoff-sub">
                          {fromISO(d.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                          {fromISO(d.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No approved absences in the next 2 weeks.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
