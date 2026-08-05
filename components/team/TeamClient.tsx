"use client";

import { useMemo, useState } from "react";
import { CAP_STATUS_LABEL, computeCapacity } from "@/lib/domain/capacity";
import { addDays, fromISO, today } from "@/lib/domain/dates";
import { computeStage } from "@/lib/domain/stage";
import { createStore, type PortalData } from "@/lib/domain/store";
import { generateRecommendations } from "@/lib/domain/recommendations";
import { Avatar, Card, CapStatusPill, KpiCard } from "@/components/ui/primitives";
import { RecommendationList } from "@/components/home/RecommendationCard";
import type { CapacityBand } from "@/lib/types";

function mainActiveProjectFor(personId: string, store: ReturnType<typeof createStore>) {
  const active = store
    .projectsForPerson(personId)
    .filter((p) => computeStage(p, store.tasksFor(p.id)) !== "done")
    .sort((a, b) => fromISO(a.end_date ?? "9999-12-31").getTime() - fromISO(b.end_date ?? "9999-12-31").getTime());
  return active[0] ?? null;
}

const PLANNING_WINDOW_DAYS = 14;

export function TeamClient({ data }: { data: PortalData }) {
  const store = useMemo(() => createStore(data), [data]);
  const [bandFilter, setBandFilter] = useState<"all" | CapacityBand>("all");

  const allRows = store
    .capacityRoster()
    .map((p) => ({ person: p, cap: computeCapacity(p.id, store) }))
    .sort((a, b) => (b.cap.pct ?? 0) - (a.cap.pct ?? 0));

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

  const rows = bandFilter === "all" ? allRows : allRows.filter((r) => r.cap.band === bandFilter);
  const recs = generateRecommendations(store);
  const windowStart = today();
  const windowEnd = addDays(windowStart, PLANNING_WINDOW_DAYS - 1);
  const absencesInWindow = data.dayOff.filter(
    (d) => d.status === "approved" && fromISO(d.end_date) >= windowStart && fromISO(d.start_date) <= windowEnd
  );
  const canHelp = allRows.filter((r) => ["available", "balanced"].includes(r.cap.band));

  return (
    <>
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        {(["available", "balanced", "almost-full", "needs-support", "overloaded"] as CapacityBand[]).map((band) => (
          <div key={band} onClick={() => setBandFilter(band)} style={{ cursor: "pointer" }}>
            <KpiCard label={CAP_STATUS_LABEL[band]} value={bandCounts[band]} accent={`var(--cap-${band}-fg)`} />
          </div>
        ))}
      </div>

      <div className="two-col">
        <Card>
          <div className="panel-head-row">
            <h2 style={{ fontSize: 16 }}>Team</h2>
            {bandFilter !== "all" && (
              <button className="linklike" onClick={() => setBandFilter("all")}>
                Showing: {CAP_STATUS_LABEL[bandFilter]} — clear ✕
              </button>
            )}
          </div>
          <div className="team-simple-grid">
            {rows.length ? (
              rows.map((r) => {
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
                    <div className="tc-main-proj">
                      <span className="tc-lbl">Main project</span>
                      <span className="tc-val">{mainProj ? mainProj.name : "No active project"}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No one matches this filter.</div>
            )}
          </div>
        </Card>
        <div className="stack-gap">
          <Card>
            <div className="section-title">Smart recommendations</div>
            <RecommendationList recommendations={recs} emptyText="Workload looks well distributed across the team." />
          </Card>
          <Card>
            <div className="panel-head-row">
              <h2 style={{ fontSize: 16 }}>Can provide support</h2>
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
              <h2 style={{ fontSize: 16 }}>Approved absences</h2>
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
