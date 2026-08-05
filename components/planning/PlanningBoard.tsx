"use client";

import { approvedDayOffOn, computeCapacity, taskWorkingDays } from "@/lib/domain/capacity";
import { addDays, dayDiff, DOW_SHORT, fromISO, today } from "@/lib/domain/dates";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar } from "@/components/ui/primitives";
import type { Person, Task } from "@/lib/types";

function segmentClass(span: Date[], d: Date) {
  const first = dayDiff(span[0], d) === 0;
  const last = dayDiff(span[span.length - 1], d) === 0;
  if (span.length === 1) return "solo";
  if (first) return "start";
  if (last) return "end";
  return "mid";
}

export function PlanningBoard({
  data,
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
  const selectedIds = [personFilter, compareFilter].filter((id) => id && id !== "all" && id !== "none");
  const people: Person[] = selectedIds.length ? store.calendarRoster().filter((p) => selectedIds.includes(p.id)) : store.calendarRoster();
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
          {store.calendarRoster().map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {personFilter !== "all" && (
          <select className="filter-select" value={compareFilter} onChange={(e) => onCompareChange(e.target.value)}>
            <option value="none">Compare with…</option>
            {store.calendarRoster()
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
        <span><i className="pl-swatch dayoff" />Approved day off</span>
        <span style={{ borderLeft: "1px solid var(--border-soft)", paddingLeft: 14 }}>
          <i className="pl-swatch" style={{ background: "var(--client-fg)" }} />Client (left edge)
        </span>
        <span><i className="pl-swatch" style={{ background: "var(--internal-fg)" }} />Internal (left edge)</span>
      </div>

      <div className="plan-wrap">
        <div className="plan-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(132px,1fr))` }}>
          <div className="plan-corner" />
          {days.map((d) => (
            <div key={d.toISOString()} className={`plan-head-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}`}>
              <span className="dow">{DOW_SHORT[d.getDay()]}</span>
              <span className="dnum">{d.getDate()}</span>
            </div>
          ))}
          {people.map((person) => {
            const cap = person.role_type === "ceo" ? null : computeCapacity(person.id, store);
            return (
              <div key={person.id} style={{ display: "contents" }}>
                <div className="plan-name-cell">
                  <Avatar person={person} />
                  <div>
                    <span className="pn-name">{person.name}</span>
                    <span className="pn-role">{person.role}{cap ? ` · ${cap.pct}%` : ""}</span>
                  </div>
                  <button className="icon-btn" title={`Add task for ${person.name}`} style={{ marginLeft: "auto" }} onClick={() => onAddTaskFor(person.id)}>
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
                  return (
                    <div key={d.toISOString()} className={`plan-day-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}`}>
                      {off && (
                        <div className="plan-block dayoff" title={`${off.type} — ${person.name}`}>
                          {dayDiff(fromISO(off.start_date), d) === 0 ? `🌴 ${off.type}` : ""}
                        </div>
                      )}
                      {!off &&
                        dayTasks.map((tk) => {
                          const span = taskWorkingDays(tk);
                          const seg = segmentClass(span, d);
                          const proj = store.projectById(tk.project_id);
                          const typeAccent = proj ? (proj.type === "client" ? "var(--client-fg)" : "var(--internal-fg)") : "transparent";
                          const overdue = tk.status !== "blocked" && dayDiff(today(), fromISO(tk.due_date)) < 0;
                          const showTypeAccent = seg === "start" || seg === "solo";
                          const assignee2 = store.personById(tk.assignee2_id);
                          return (
                            <div
                              key={tk.id}
                              className={`plan-block ${tk.status} seg-${seg}${overdue ? " plan-overdue" : ""}`}
                              style={showTypeAccent ? { borderLeft: `3px solid ${typeAccent}` } : undefined}
                              title={`${tk.name} · ${tk.workload_days}d`}
                              onClick={() => onOpenTask(tk)}
                            >
                              {seg === "mid" || seg === "end" ? "" : tk.name}
                              {(seg === "start" || seg === "solo") && assignee2 && (
                                <span className="plan-support-badge" title={`Second assignee: ${assignee2.name}`}>
                                  +1
                                </span>
                              )}
                            </div>
                          );
                        })}
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
