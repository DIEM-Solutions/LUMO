import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { Avatar } from "@/components/ui/primitives";
import { PriorityPanel } from "@/components/home/PriorityPanel";
import { getCurrentPerson } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";
import { createStore } from "@/lib/domain/store";
import { fmt, fromISO } from "@/lib/domain/dates";
import { buildNeedsAttention } from "@/lib/domain/needsAttention";
import { buildRecapRows } from "@/lib/domain/recap";
import { portfolioStats } from "@/lib/domain/stats";
import { loadDismissedAttentionKeys } from "@/lib/data/attention";

export default async function RecapPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [data, dismissedKeys] = await Promise.all([loadPortalData(), loadDismissedAttentionKeys()]);
  const store = createStore(data);

  const stats = portfolioStats(store);
  const ceoId = data.people.find((p) => p.role_type === "ceo")?.id ?? null;
  const attention = buildNeedsAttention(store, ceoId, dismissedKeys);
  const rows = buildRecapRows(store);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Weekly Recap" />
      <main className="content">
        <div className="xr-kpi-row" style={{ marginBottom: 24 }}>
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
            <div className="xr-kpi-label">My priorities</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <PriorityPanel priorityItems={attention} />
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
