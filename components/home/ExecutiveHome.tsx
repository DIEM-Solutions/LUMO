import Link from "next/link";
import { computeCapacity } from "@/lib/domain/capacity";
import { dayDiff, fmt, fromISO, today } from "@/lib/domain/dates";
import { computeHealth } from "@/lib/domain/health";
import { buildCompanyOverview, buildNeedsAttention } from "@/lib/domain/needsAttention";
import { computeStage } from "@/lib/domain/stage";
import type { Store } from "@/lib/domain/store";
import { overdueTaskCount, portfolioStats } from "@/lib/domain/stats";
import { Card, KpiCard } from "@/components/ui/primitives";
import { DonutWithLegend } from "@/components/ui/DonutWithLegend";
import { NeedsAttentionCard } from "@/components/home/NeedsAttentionCard";
import { ActivityFeedList } from "@/components/activity/ActivityFeedList";
import type { ActivityLogEntry, WorkloadThresholds } from "@/lib/types";

export function ExecutiveHome({
  store,
  ceoId,
  activity,
  thresholds,
  dismissedKeys,
}: {
  store: Store;
  ceoId: string | null;
  activity: ActivityLogEntry[];
  thresholds: WorkloadThresholds;
  dismissedKeys: Set<string>;
}) {
  const stats = portfolioStats(store);
  const capRows = store.capacityRoster().map((p) => ({ person: p, cap: computeCapacity(p.id, store, thresholds) }));
  const overloadedCount = capRows.filter((r) => r.cap.status === "overloaded").length;
  const overdueTasks = overdueTaskCount(store);
  const attnItems = buildNeedsAttention(store, ceoId, thresholds, dismissedKeys);
  const overviewItems = buildCompanyOverview(store, thresholds);
  const decisionsRequired = attnItems.filter((a) => a.kind === "approval").length;
  const criticalDeadlines = store.data.projects.filter((p) => {
    const tasks = store.tasksFor(p.id);
    const daysToEnd = p.end_date ? dayDiff(today(), fromISO(p.end_date)) : 9999;
    return computeStage(p, tasks) !== "done" && daysToEnd >= 0 && daysToEnd <= 14 && computeHealth(p, tasks, store.data.blockers) !== "on-track";
  }).length;

  const healthSegments = [
    { label: "On track", value: stats.healthCounts["on-track"], color: "var(--health-ontrack)" },
    { label: "At risk", value: stats.healthCounts["at-risk"], color: "var(--health-atrisk)" },
    { label: "Blocked", value: stats.healthCounts.blocked, color: "var(--health-blocked)" },
  ];
  const capSegments = [
    { label: "Available", value: capRows.filter((r) => ["available", "balanced"].includes(r.cap.status)).length, color: "var(--health-ontrack)" },
    { label: "Near capacity", value: capRows.filter((r) => r.cap.status === "almost-full").length, color: "var(--health-atrisk)" },
    { label: "Overloaded", value: capRows.filter((r) => ["needs-support", "overloaded"].includes(r.cap.status)).length, color: "var(--health-blocked)" },
  ];
  const upcomingDeadlines = [...store.data.projects]
    .filter((p) => computeStage(p, store.tasksFor(p.id)) !== "done" && p.end_date)
    .sort((a, b) => fromISO(a.end_date!).getTime() - fromISO(b.end_date!).getTime())
    .slice(0, 4);
  const maxHorizon = upcomingDeadlines.length
    ? Math.max(1, dayDiff(today(), fromISO(upcomingDeadlines[upcomingDeadlines.length - 1].end_date!)))
    : 1;

  return (
    <>
      <div className="ceo-section">
        <div className="kpi-row">
          <KpiCard label="At risk" value={stats.healthCounts["at-risk"]} accent={stats.healthCounts["at-risk"] ? "var(--diem-orange)" : "var(--diem-teal)"} />
          <KpiCard label="Blocked" value={stats.blockedTasks} accent={stats.blockedTasks ? "var(--diem-orange)" : "var(--diem-teal)"} />
          <KpiCard label="Overdue" value={overdueTasks} accent={overdueTasks ? "var(--diem-orange)" : "var(--diem-teal)"} />
          <KpiCard label="Overloaded" value={overloadedCount} accent={overloadedCount ? "var(--diem-orange)" : "var(--diem-teal)"} />
          <KpiCard label="Deadlines" value={criticalDeadlines} accent={criticalDeadlines ? "var(--diem-orange)" : "var(--diem-teal)"} />
          <KpiCard label="Decisions" value={decisionsRequired} accent={decisionsRequired ? "var(--diem-orange)" : "var(--diem-teal)"} />
        </div>
      </div>

      <div className="ceo-section">
        <div className="panel-head-row">
          <h2>Recent activity</h2>
        </div>
        <Card>
          <ActivityFeedList entries={activity} projects={store.data.projects} limit={8} />
        </Card>
      </div>

      <div className="ceo-section">
        <div className="ceo-section-head">
          <h2>CEO Priorities</h2>
          {attnItems.length > 0 && <span className="section-title" style={{ margin: 0 }}>{attnItems.length} item{attnItems.length === 1 ? "" : "s"}</span>}
        </div>
        <div className="field-hint" style={{ marginBottom: 10 }}>What you personally need to know, review, decide, or act on.</div>
        <NeedsAttentionCard items={attnItems} canDismiss />
      </div>

      <div className="ceo-section">
        <div className="ceo-section-head">
          <h2>Company Overview</h2>
          {overviewItems.length > 0 && <span className="section-title" style={{ margin: 0 }}>{overviewItems.length} item{overviewItems.length === 1 ? "" : "s"}</span>}
        </div>
        <div className="field-hint" style={{ marginBottom: 10 }}>Company-wide signals, regardless of your own involvement.</div>
        <NeedsAttentionCard items={overviewItems} />
      </div>

      <div className="ceo-section ceo-tri">
        <Card>
          <div className="panel-head-row">
            <h2>Portfolio health</h2>
          </div>
          <DonutWithLegend segments={healthSegments} centerLabel="projects" />
        </Card>
        <Card>
          <div className="panel-head-row">
            <h2>Team capacity</h2>
            <Link href="/team" className="linklike">Open →</Link>
          </div>
          <DonutWithLegend segments={capSegments} centerLabel="people" />
        </Card>
        <Card>
          <div className="panel-head-row">
            <h2>Upcoming deadlines</h2>
          </div>
          <div className="timeline-list">
            {upcomingDeadlines.length ? (
              upcomingDeadlines.map((p) => {
                const d = dayDiff(today(), fromISO(p.end_date!));
                const w = Math.max(8, Math.min(100, ((maxHorizon - d) / maxHorizon) * 100 + 8));
                const health = computeHealth(p, store.tasksFor(p.id), store.data.blockers);
                const color = health === "blocked" ? "var(--health-blocked)" : health === "at-risk" ? "var(--health-atrisk)" : "var(--diem-blue)";
                return (
                  <Link href="/projects" className="timeline-row" key={p.id} style={{ cursor: "pointer" }}>
                    <span className="tl-date">{fmt(fromISO(p.end_date!))}</span>
                    <span className="tl-name">{p.name}</span>
                    <div className="tl-bar">
                      <div style={{ width: `${w}%`, background: color }} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="empty-state">Nothing scheduled.</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
