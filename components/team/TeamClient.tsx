"use client";

import { useMemo, useState } from "react";
import { CAP_STATUS_LABEL, computeCapacity, computeDailyCapacity, computeLoadByProject, computeWeeklyCapacity, hoursOfLabel } from "@/lib/domain/capacity";
import { addDays, clamp, fmt, fromISO, today } from "@/lib/domain/dates";
import { computeStage } from "@/lib/domain/stage";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar, Card, CapacityBar, CapStatusPill, CapWarningChip, KpiCard } from "@/components/ui/primitives";
import type { CapacityBand, WorkloadThresholds } from "@/lib/types";

/** Fallback for "Main project" when someone has no in-progress work: the soonest-ending active project they're on. */
function nextDeadlineProjectFor(personId: string, store: ReturnType<typeof createStore>) {
  const active = store
    .projectsForPerson(personId)
    .filter((p) => computeStage(p, store.tasksFor(p.id)) !== "done")
    .sort((a, b) => fromISO(a.end_date ?? "9999-12-31").getTime() - fromISO(b.end_date ?? "9999-12-31").getTime());
  return active[0] ?? null;
}

const ABSENCE_LOOKAHEAD_DAYS = 14;

const DISTRIBUTION_PALETTE = ["var(--diem-blue)", "var(--diem-teal)", "var(--diem-yellow)", "var(--diem-purple)", "var(--diem-orange)"];

// How full someone is, split by project: the bar's full width is their
// capacity for the rest of this week, and each segment is that project's
// in-progress hours in the same window -- the exact numbers behind the
// capacity % (computeWeeklyCapacity / computeLoadByProject), so bar length
// and % always agree. 2h of 40h fills 5% of the bar, not all of it.
function workloadDistribution(
  personId: string,
  store: ReturnType<typeof createStore>,
  projectColor: Map<string, string>,
  thresholds: WorkloadThresholds
) {
  const weekly = computeWeeklyCapacity(personId, store, undefined, thresholds);
  const byProject = computeLoadByProject(personId, store, weekly.from, weekly.weekEnd);
  const segments = [...byProject.entries()]
    .map(([projectId, hours]) => ({
      projectId,
      project: store.projectById(projectId),
      hours: Math.round(hours * 10) / 10,
      color: projectColor.get(projectId) ?? "var(--ink-faint)",
    }))
    .filter((s) => s.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  // Over capacity: the bar is full and each segment keeps its share.
  const scale = Math.max(weekly.capacityHours, weekly.hours) || 1;
  return { segments, weekly, scale };
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
  // Spare capacity by the same % as the label; not on leave today; most available first.
  // Overdue/blocked work doesn't exclude anyone -- it shows as a warning chip instead.
  const canHelp = allRows
    .filter((r) => ["available", "balanced"].includes(r.cap.band) && !r.cap.awayNow)
    .sort((a, b) => (a.cap.pct ?? 0) - (b.cap.pct ?? 0));

  const heatmapRows = rows.map((r) => ({
    person: r.person,
    daily: computeDailyCapacity(r.person.id, store, windowStart, thresholds),
    weekly: computeWeeklyCapacity(r.person.id, store, undefined, thresholds),
  }));

  const projectColor = new Map<string, string>();
  data.projects.forEach((p, i) => projectColor.set(p.id, DISTRIBUTION_PALETTE[i % DISTRIBUTION_PALETTE.length]));

  const distByPerson = new Map(rows.map((r) => [r.person.id, workloadDistribution(r.person.id, store, projectColor, thresholds)]));
  const distributionByPerson = rows
    .filter((r) => r.person.role_type !== "ceo")
    .map((r) => ({ person: r.person, dist: distByPerson.get(r.person.id)! }));
  const legendProjects = new Map<string, string>();
  distributionByPerson.forEach(({ dist }) =>
    dist.segments.forEach((d) => {
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
          In-progress hours booked today and for the rest of this week, out of each person&apos;s capacity for that time — spot who&apos;s about to get overloaded before it happens.
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
                {r.daily.pct != null ? hoursOfLabel(r.daily.hours, r.daily.capacityHours, "today") : "—"}
              </div>
              <div className={`heatmap-cell ${r.weekly.band}`}>
                {r.weekly.pct != null ? hoursOfLabel(r.weekly.hours, r.weekly.capacityHours, "week") : "—"}
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
                // Main project = where most of their in-progress hours are this week (the biggest
                // segment of their workload bar). No in-progress work → say "Next deadline" instead.
                const topSegment = distByPerson.get(r.person.id)?.segments[0];
                const nextDeadline = topSegment ? null : nextDeadlineProjectFor(r.person.id, store);
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                        <CapStatusPill band={r.cap.band} />
                        <CapWarningChip overdue={r.cap.overdueCount} blocked={r.cap.blockedCount} />
                      </span>
                      <span className="tc-avail" style={{ flexShrink: 0 }}>
                        {r.cap.pct == null ? "" : `${Math.max(0, 100 - r.cap.pct)}% available${r.cap.source === "reported" ? " · reported" : ""}`}
                      </span>
                    </div>
                    {r.cap.pct != null && (
                      <div style={{ marginTop: 8 }}>
                        <CapacityBar pct={clamp(r.cap.pct, 4, 100)} band={r.cap.band === "unknown" ? "available" : r.cap.band} />
                      </div>
                    )}
                    <div className="tc-main-proj">
                      <span className="tc-lbl">{topSegment || !nextDeadline ? "Main project" : "Next deadline"}</span>
                      <span className="tc-val">
                        {topSegment
                          ? topSegment.project?.name ?? "Unknown project"
                          : nextDeadline
                            ? `${nextDeadline.name}${nextDeadline.end_date ? ` · ${fmt(fromISO(nextDeadline.end_date))}` : ""}`
                            : "No active project"}
                      </span>
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
            <div className="field-hint" style={{ marginBottom: 10 }}>In-progress hours for the rest of this week, by project. A full bar means fully booked.</div>
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
              {distributionByPerson.map(({ person, dist }) => {
                const known = dist.weekly.pct != null;
                const over = known && (dist.weekly.pct ?? 0) > 100;
                return (
                  <div key={person.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <Avatar person={person} size="sm" />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{person.name.split(" ")[0]}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: over ? "var(--cap-overloaded-fg)" : "var(--ink-soft)" }}>
                        {known ? `${hoursOfLabel(dist.weekly.hours, dist.weekly.capacityHours, "week")}${over ? ` · ${dist.weekly.pct}%` : ""}` : "No capacity set"}
                      </span>
                    </div>
                    <div
                      className={`dist-bar${dist.segments.length ? "" : " dist-bar-empty"}`}
                      title={dist.segments.map((d) => `${d.project?.name ?? "—"}: ${d.hours}h`).join(" · ")}
                    >
                      {dist.segments.map((d) => (
                        <div key={d.projectId} style={{ width: `${(d.hours / dist.scale) * 100}%`, background: d.color }} />
                      ))}
                    </div>
                  </div>
                );
              })}
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
                    <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>· {Math.max(0, 100 - (r.cap.pct ?? 0))}% available</span>
                    <CapWarningChip overdue={r.cap.overdueCount} blocked={r.cap.blockedCount} />
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
