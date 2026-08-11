import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { Avatar } from "@/components/ui/primitives";
import { getCurrentPerson } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";
import { createStore } from "@/lib/domain/store";
import { dayDiff, fmt, fromISO, today } from "@/lib/domain/dates";
import { buildNeedsAttention } from "@/lib/domain/needsAttention";
import { buildRecapRows } from "@/lib/domain/recap";
import { computeCapacity } from "@/lib/domain/capacity";
import { portfolioStats } from "@/lib/domain/stats";
import { loadAppSettings } from "@/lib/data/settings";
import { loadDismissedAttentionKeys } from "@/lib/data/attention";

export default async function RecapPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [data, settings, dismissedKeys] = await Promise.all([loadPortalData(), loadAppSettings(), loadDismissedAttentionKeys()]);
  const store = createStore(data);
  const thresholds = settings.workload_thresholds;

  const stats = portfolioStats(store);
  const ceoId = data.people.find((p) => p.role_type === "ceo")?.id ?? null;
  const attention = buildNeedsAttention(store, ceoId, thresholds, dismissedKeys);
  const rows = buildRecapRows(store);
  const overloadedCount = store
    .capacityRoster()
    .filter((p) => computeCapacity(p.id, store, thresholds).status === "overloaded").length;

  const highlights: string[] = [];
  if (stats.healthCounts.blocked > 0) {
    highlights.push(`${stats.healthCounts.blocked} project${stats.healthCounts.blocked === 1 ? " is" : "s are"} currently blocked.`);
  }
  if (stats.healthCounts["at-risk"] > 0) {
    highlights.push(`${stats.healthCounts["at-risk"]} project${stats.healthCounts["at-risk"] === 1 ? " is" : "s are"} at risk of missing its deadline.`);
  }
  if (overloadedCount > 0) {
    highlights.push(`${overloadedCount} team member${overloadedCount === 1 ? " is" : "s are"} overloaded and could use support.`);
  }
  const dueSoon = rows.filter((r) => r.dueDate).filter((r) => {
    const diff = dayDiff(today(), fromISO(r.dueDate!));
    return diff >= 0 && diff <= 14;
  });
  if (dueSoon.length > 0) {
    highlights.push(`${dueSoon.length} project${dueSoon.length === 1 ? "" : "s"} due within the next two weeks.`);
  }
  if (!highlights.length) {
    highlights.push("No blockers, at-risk projects, or overloaded team members this week — the portfolio is in good shape.");
  }

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Weekly Recap" />
      <main className="content">
        <div className="recap-hero">
          <div className="recap-hero-eyebrow">Executive summary</div>
          <ul className="xr-summary-list">
            {highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>

        <div className="xr-kpi-row" style={{ marginBottom: 30 }}>
          <div className="xr-kpi-card">
            <div className="xr-kpi-num">{stats.activeProjects}</div>
            <div className="xr-kpi-label">Active projects</div>
          </div>
          <div className={`xr-kpi-card`}>
            <div className={`xr-kpi-num${stats.healthCounts.blocked ? " xr-warn" : ""}`}>{stats.healthCounts.blocked}</div>
            <div className="xr-kpi-label">Blocked</div>
          </div>
          <div className="xr-kpi-card">
            <div className={`xr-kpi-num${stats.healthCounts["at-risk"] ? " xr-warn" : ""}`}>{stats.healthCounts["at-risk"]}</div>
            <div className="xr-kpi-label">At risk</div>
          </div>
          <div className="xr-kpi-card">
            <div className={`xr-kpi-num${attention.length ? " xr-warn" : ""}`}>{attention.length}</div>
            <div className="xr-kpi-label">Needs attention</div>
          </div>
        </div>

        <div className="panel-head-row">
          <h2>This week, by project</h2>
        </div>
        <div className="recap-table-wrap">
          <table className="recap-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Project</th>
                <th>This week</th>
                <th>Next week</th>
                <th>Due date</th>
                <th>Risks</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const owner = store.personById(r.ownerId);
                return (
                  <tr key={r.project.id}>
                    <td>
                      <div className="rt-owner">
                        <Avatar person={owner} size="sm" />
                        {owner?.name.split(" ")[0] ?? "—"}
                      </div>
                    </td>
                    <td className="rt-project">{r.project.name}</td>
                    <td>{r.thisWeek}</td>
                    <td className={r.nextWeek === "—" ? "rt-muted" : ""}>{r.nextWeek}</td>
                    <td>{r.dueDate ? fmt(fromISO(r.dueDate)) : "—"}</td>
                    <td style={r.riskSeverity !== "none" ? { color: r.riskSeverity === "critical" ? "var(--health-blocked)" : "var(--health-atrisk)", fontWeight: 600 } : undefined}>
                      {r.risks}
                    </td>
                    <td className={r.notes ? "" : "rt-muted"}>{r.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
