"use client";

import { approvedDayOffOn, computeCapacity, taskWorkingDays } from "@/lib/domain/capacity";
import { addDays, dayDiff, DOW_SHORT, fromISO, toISO, today } from "@/lib/domain/dates";
import { bySeniorityDesc } from "@/lib/domain/hierarchy";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar } from "@/components/ui/primitives";
import type { Person, Task, WorkloadThresholds } from "@/lib/types";

function scheduleLabel(tk: Task, d: Date): string {
  const iso = toISO(d);
  const entry = tk.daily_schedule.find((s) => s.date === iso);
  return entry ? `${entry.start}–${entry.end}` : `${tk.workload_hours}h`;
}

export function PlanningBoard({
  data,
  thresholds,
  rangeDays,
  onRangeChange,
  personFilter,
  onPersonChange,
  compareFilter,
  onCompareChange,
  projectFilter,
  onProjectChange,
  onOpenTask,
  onAddTaskFor,
}: {
  data: PortalData;
  thresholds: WorkloadThresholds;
  rangeDays: number;
  onRangeChange: (n: number) => void;
  personFilter: string;
  onPersonChange: (id: string) => void;
  compareFilter: string;
  onCompareChange: (id: string) => void;
  projectFilter: string;
  onProjectChange: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onAddTaskFor: (personId: string) => void;
}) {
  const store = createStore(data);
  const planningRoster = store.calendarRoster().filter((p) => p.role_type !== "ceo").sort(bySeniorityDesc);
  const selectedIds = [personFilter, compareFilter].filter((id) => id && id !== "all" && id !== "none");
  const people: Person[] = selectedIds.length ? planningRoster.filter((p) => selectedIds.includes(p.id)) : planningRoster;
  const days = Array.from({ length: rangeDays }, (_, i) => addDays(today(), i));

  return (
    <>
      <div className="filter-bar">
        {[7, 14, 21].map((n) => (
          <button key={n} className={`filter-pill${rangeDays === n ? " active" : ""}`} onClick={() => onRangeChange(n)}>
            {n / 7} week{n === 7 ? "" : "s"}
          </button>
        ))}
        <div className="filter-sep" />
        <select className="filter-select" value={personFilter} onChange={(e) => onPersonChange(e.target.value)}>
          <option value="all">All team members</option>
          {planningRoster.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {personFilter !== "all" && (
          <select className="filter-select" value={compareFilter} onChange={(e) => onCompareChange(e.target.value)}>
            <option value="none">Compare with…</option>
            {planningRoster
              .filter((p) => p.id !== personFilter)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}
        <select className="filter-select" value={projectFilter} onChange={(e) => onProjectChange(e.target.value)}>
          <option value="all">All projects</option>
          {data.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="plan-legend">
        <span><i className="pl-swatch not-started" />Not started</span>
        <span><i className="pl-swatch in-progress" />In progress</span>
        <span><i className="pl-swatch blocked" />Blocked</span>
        <span><i className="pl-swatch dayoff" />Day off</span>
        <span style={{ borderLeft: "1px solid var(--border-soft)", paddingLeft: 14 }}>
          <i className="pl-swatch" style={{ background: "var(--client-fg)" }} />Client
        </span>
        <span><i className="pl-swatch" style={{ background: "var(--internal-fg)" }} />Internal</span>
      </div>

      <div className="plan-wrap">
        <div className="plan-grid" style={{ gridTemplateColumns: `210px repeat(${days.length}, minmax(140px,1fr))` }}>
          <div className="plan-corner" />
          {days.map((d) => (
            <div key={d.toISOString()} className={`plan-head-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}`}>
              <span className="dow">{DOW_SHORT[d.getDay()]}</span>
              <span className="dnum">{d.getDate()}</span>
            </div>
          ))}
          {people.map((person) => {
            const cap = person.role_type === "ceo" ? null : computeCapacity(person.id, store, thresholds);
            return (
              <div key={person.id} style={{ display: "contents" }}>
                <div className="plan-name-cell">
                  <Avatar person={person} />
                  <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <span className="pn-name">{person.name}</span>
                    <span className="pn-role">{person.role}{cap && cap.pct != null ? ` · ${cap.pct}%` : ""}</span>
                  </div>
                  <button className="icon-btn" title={`Add task for ${person.name}`} style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => onAddTaskFor(person.id)}>
                    +
                  </button>
                </div>
                {days.map((d) => {
                  const off = approvedDayOffOn(person.id, d, data.dayOff);
                  const dayTasks = data.tasks.filter((tk) => {
                    if (!store.isAssignedTo(tk, person.id) || tk.status === "done") return false;
                    if (projectFilter !== "all" && tk.project_id !== projectFilter) return false;
                    return taskWorkingDays(tk).some((sd) => dayDiff(sd, d) === 0);
                  });
                  const visibleTasks = dayTasks.slice(0, 3);
                  const hiddenCount = dayTasks.length - visibleTasks.length;
                  return (
                    <div key={d.toISOString()} className={`plan-day-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}`}>
                      {off && (
                        <div className="plan-block dayoff" title={`${off.type} — ${person.name}`}>
                          🌴 {off.type}
                        </div>
                      )}
                      {!off &&
                        visibleTasks.map((tk) => {
                          const proj = store.projectById(tk.project_id);
                          const typeAccent = proj ? (proj.type === "client" ? "var(--client-fg)" : "var(--internal-fg)") : "transparent";
                          const overdue = tk.status !== "blocked" && dayDiff(today(), fromISO(tk.due_date)) < 0;
                          const assignee2 = store.personById(tk.assignee2_id);
                          return (
                            <div
                              key={tk.id}
                              className={`plan-block ${tk.status}${overdue ? " plan-overdue" : ""}`}
                              style={{ borderLeft: `3px solid ${typeAccent}` }}
                              title={`${tk.name} · ${scheduleLabel(tk, d)}`}
                              onClick={() => onOpenTask(tk)}
                            >
                              {tk.name} · {scheduleLabel(tk, d)}
                              {assignee2 && (
                                <span className="plan-support-badge" title={`Second assignee: ${assignee2.name}`}>
                                  +1
                                </span>
                              )}
                            </div>
                          );
                        })}
                      {!off && hiddenCount > 0 && <div className="plan-more">+{hiddenCount} more</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
