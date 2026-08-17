import Link from "next/link";
import { computeCapacity } from "@/lib/domain/capacity";
import { clamp, dayDiff, fromISO, today } from "@/lib/domain/dates";
import { computeHealth } from "@/lib/domain/health";
import { projectProgress } from "@/lib/domain/progress";
import { computeStage } from "@/lib/domain/stage";
import type { Store } from "@/lib/domain/store";
import { Card, CapacityBar, HealthFlag, KpiCard, RunwayBar, TypeTag } from "@/components/ui/primitives";
import { ActivityFeedList } from "@/components/activity/ActivityFeedList";
import type { ActivityLogEntry, Project, Task, WorkloadThresholds } from "@/lib/types";

function employeeProjectSummary(personId: string, project: Project, store: Store) {
  const myTasksInProj = store.tasksFor(project.id).filter((tk) => store.isAssignedTo(tk, personId));
  const completed = myTasksInProj.filter((tk) => tk.status === "done");
  const active = myTasksInProj.filter((tk) => tk.status !== "done");
  const current =
    active.find((tk) => tk.status === "in-progress") ||
    [...active].sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0] ||
    null;
  const blocked = active.filter((tk) => tk.status === "blocked");
  const upcoming = active.length ? [...active].sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0] : null;
  const remainingDays = active.reduce((s, tk) => s + (tk.remaining_days != null ? tk.remaining_days : tk.workload_days || 0), 0);
  const role = project.owner_id === personId ? "Owner" : "Contributor";
  return { project, myTasksInProj, completed, active, current, blocked, upcoming, remainingDays, role };
}

function dueLabelText(due: Date) {
  const d = dayDiff(today(), due);
  if (d < 0) return `${-d}d overdue`;
  if (d === 0) return "Due today";
  return `${d}d left`;
}

function MyProjectCard({ summary, store }: { summary: ReturnType<typeof employeeProjectSummary>; store: Store }) {
  const { project: p, myTasksInProj, completed, current, blocked, upcoming, remainingDays, role } = summary;
  const tasks = store.tasksFor(p.id);
  const stage = computeStage(p, tasks);
  const health = computeHealth(p, tasks, store.data.blockers);
  const pct = projectProgress(p, tasks);

  return (
    <Link href="/projects" className="myproj-card">
      <div className="myproj-top">
        <div>
          <div className="myproj-name">{p.name}</div>
          <div className="myproj-role">
            <TypeTag type={p.type} />
            <span className="tag" style={{ background: "var(--bg-deep)", color: "var(--ink-soft)" }}>{role}</span>
          </div>
        </div>
        <HealthFlag health={health} />
      </div>
      <div className="runway" style={{ marginTop: 12 }}>
        <div className="runway-labels">
          <span>Project progress</span>
          <span className="pct">{pct}%</span>
        </div>
        <RunwayBar pct={pct} stage={stage} />
      </div>
      <div className="myproj-grid">
        <div>
          <span className="myproj-lbl">Current task</span>
          <span className="myproj-val">{current ? current.name : "Nothing in progress"}</span>
        </div>
        <div>
          <span className="myproj-lbl">Next priority</span>
          <span className="myproj-val">{current ? current.next_step || current.name : "—"}</span>
        </div>
        <div>
          <span className="myproj-lbl">Completed</span>
          <span className="myproj-val">{completed.length}/{myTasksInProj.length} tasks</span>
        </div>
        <div>
          <span className="myproj-lbl">Upcoming deadline</span>
          <span className={`myproj-val${upcoming && dayDiff(today(), fromISO(upcoming.due_date)) < 0 ? " warn" : ""}`}>
            {upcoming ? dueLabelText(fromISO(upcoming.due_date)) : "—"}
          </span>
        </div>
        <div>
          <span className="myproj-lbl">Remaining workload</span>
          <span className="myproj-val">{remainingDays}d</span>
        </div>
      </div>
      {blocked.length > 0 && (
        <div className="pc-blocked-warn">⚠ Blocked — {blocked[0].blocker_reason || "No reason logged"}</div>
      )}
    </Link>
  );
}

export function EmployeeHome({
  store,
  personId,
  activity,
  thresholds,
}: {
  store: Store;
  personId: string;
  activity: ActivityLogEntry[];
  thresholds: WorkloadThresholds;
}) {
  const myProjects = store.projectsForPerson(personId);
  const myTasks = store.activeTasksForPerson(personId);
  const dueTodayOrOverdue = myTasks.filter((tk) => dayDiff(today(), fromISO(tk.due_date)) <= 0);
  const myBlockedTasks = myTasks.filter((tk) => tk.status === "blocked");
  const cap = computeCapacity(personId, store, thresholds);
  const summaries = myProjects
    .map((p) => employeeProjectSummary(personId, p, store))
    .sort((a, b) => {
      const rank: Record<string, number> = { "on-track": 0, "at-risk": 1, blocked: 2 };
      const ha = computeHealth(a.project, store.tasksFor(a.project.id), store.data.blockers);
      const hb = computeHealth(b.project, store.tasksFor(b.project.id), store.data.blockers);
      return rank[hb] - rank[ha];
    });
  const upcomingAll: Task[] = summaries
    .filter((s) => s.upcoming)
    .map((s) => s.upcoming as Task)
    .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())
    .slice(0, 5);

  return (
    <>
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <KpiCard label="My projects" value={myProjects.length} accent="var(--diem-blue)" />
        <KpiCard label="Active tasks" value={myTasks.length} accent="var(--diem-yellow)" />
        <KpiCard label="Due today / overdue" value={dueTodayOrOverdue.length} accent={dueTodayOrOverdue.length ? "var(--diem-orange)" : "var(--diem-teal)"} />
        <KpiCard label="Blocked" value={myBlockedTasks.length} accent={myBlockedTasks.length ? "var(--diem-orange)" : "var(--diem-teal)"} />
        <KpiCard label="My capacity" value={cap.pct != null ? `${cap.pct}%` : "—"} sub={cap.label} accent="var(--diem-purple)" />
      </div>

      <div className="two-col">
        <div className="stack-gap">
          <div className="panel-head-row">
            <h2>My projects</h2>
          </div>
          {summaries.length ? (
            <div className="myproj-grid-wrap">
              {summaries.map((s) => (
                <MyProjectCard summary={s} store={store} key={s.project.id} />
              ))}
            </div>
          ) : (
            <Card><div className="empty-state">Not currently on a project.</div></Card>
          )}
        </div>
        <div className="stack-gap">
          <Card>
            <div className="panel-head-row">
              <h2>Recent activity</h2>
            </div>
            <ActivityFeedList entries={activity} projects={store.data.projects} limit={6} />
          </Card>
          <Card>
            <div className="panel-head-row">
              <h2>Upcoming deadlines</h2>
            </div>
            {upcomingAll.length ? (
              upcomingAll.map((tk) => {
                const proj = store.projectById(tk.project_id);
                return (
                  <Link href="/projects" className="priority-row" key={tk.id} style={{ cursor: "pointer" }}>
                    <div className="pr-info">
                      <div className="pr-name">{tk.name}</div>
                      <div className="pr-proj">{proj?.name} · {dueLabelText(fromISO(tk.due_date))}</div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="empty-state">Nothing due soon.</div>
            )}
          </Card>
          <Card>
            <div className="panel-head-row">
              <h2>My capacity</h2>
            </div>
            <div className="cap-bar-lbl">
              Capacity used: <b>{cap.pct != null ? `${cap.pct}%` : "—"}</b> — current 2-week workload
            </div>
            {cap.pct != null && (
              <div className="capacity-bar-wrap" style={{ marginBottom: 8 }}>
                <CapacityBar pct={clamp(cap.pct, 4, 100)} band={cap.band === "unknown" ? "available" : cap.band} />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`cap-status-pill ${cap.band}`}>{cap.label}</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                {cap.activeTaskCount} active tasks · {cap.projectCount} projects
              </span>
            </div>
            {cap.reasons.length > 0 && (
              <div className="capacity-reasons" style={{ marginLeft: 0, marginTop: 10 }}>
                {cap.reasons.map((r) => (
                  <span className="reason-chip" key={r.tag}>{r.label}</span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
