"use client";

import { useState } from "react";
import { dayOffOverlapsDate, taskWorkingDays } from "@/lib/domain/capacity";
import { addDays, dayDiff, DOW_SHORT, fmt, fmtLong, MONTH_NAMES, today } from "@/lib/domain/dates";
import { bySeniorityDesc } from "@/lib/domain/hierarchy";
import { createStore, type PortalData } from "@/lib/domain/store";
import type { DayOff, Task } from "@/lib/types";

type ViewMode = "day" | "week" | "2weeks" | "month";

function eventColor(status: Task["status"]) {
  if (status === "blocked") return { bg: "var(--stage-blocked-bg)", fg: "var(--health-blocked)" };
  if (status === "in-progress") return { bg: "var(--stage-prog-bg)", fg: "var(--stage-prog-fg)" };
  return { bg: "var(--stage-ns-bg)", fg: "var(--stage-ns-fg)" };
}

export function CalendarView({
  data,
  personFilter,
  onPersonChange,
  projectFilter,
  onProjectChange,
  onOpenTask,
}: {
  data: PortalData;
  personFilter: string;
  onPersonChange: (id: string) => void;
  projectFilter: string;
  onProjectChange: (id: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const store = createStore(data);
  const planningRoster = store.calendarRoster().filter((p) => p.role_type !== "ceo").sort(bySeniorityDesc);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(today());

  function matchesFilters(tk: Task) {
    if (personFilter !== "all" && !store.isAssignedTo(tk, personFilter)) return false;
    if (projectFilter !== "all" && tk.project_id !== projectFilter) return false;
    return tk.status !== "done";
  }

  function tasksOnDay(d: Date) {
    return data.tasks.filter((tk) => matchesFilters(tk) && taskWorkingDays(tk).some((sd) => dayDiff(sd, d) === 0));
  }

  function dayOffOnDay(d: Date): DayOff[] {
    return data.dayOff.filter(
      (off) => off.status === "approved" && dayOffOverlapsDate(off, d) && (personFilter === "all" || off.person_id === personFilter)
    );
  }

  function step(dir: number) {
    if (viewMode === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (viewMode === "day") setCursor(addDays(cursor, dir));
    else setCursor(addDays(cursor, dir * 7 * (viewMode === "2weeks" ? 2 : 1)));
  }

  let label: string;
  if (viewMode === "month") label = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
  else if (viewMode === "day") label = fmtLong(cursor);
  else {
    const weeks = viewMode === "2weeks" ? 2 : 1;
    const start = addDays(cursor, -cursor.getDay());
    label = `${fmt(start)} – ${fmt(addDays(start, 7 * weeks - 1))}`;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="icon-btn" onClick={() => step(-1)}>←</button>
          <span style={{ fontWeight: 700, fontSize: 14.5, minWidth: 170, textAlign: "center", display: "inline-block" }}>{label}</span>
          <button className="icon-btn" onClick={() => step(1)}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(today())}>Today</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select className="filter-select" value={personFilter} onChange={(e) => onPersonChange(e.target.value)}>
            <option value="all">All team members</option>
            {planningRoster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className="filter-select" value={projectFilter} onChange={(e) => onProjectChange(e.target.value)}>
            <option value="all">All projects</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="subtabs">
            {(["day", "week", "2weeks", "month"] as ViewMode[]).map((m) => (
              <button key={m} className={`subtab-btn${viewMode === m ? " active" : ""}`} onClick={() => setViewMode(m)}>
                {m === "2weeks" ? "2 Weeks" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "month" && (
        <div
          className="cal-month-grid"
          style={{ borderLeft: "1px solid var(--border-soft)", borderTop: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface)", boxShadow: "var(--shadow)" }}
        >
          {DOW_SHORT.map((d) => (
            <div key={d} className="cal-dow-head" style={{ borderRight: "1px solid var(--border-soft)" }}>
              {d}
            </div>
          ))}
          {Array.from({ length: 42 }, (_, i) => addDays(addDays(new Date(cursor.getFullYear(), cursor.getMonth(), 1), -new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()), i)).map(
            (d) => {
              const evs = tasksOnDay(d);
              const offs = dayOffOnDay(d);
              const isToday = dayDiff(today(), d) === 0;
              const other = d.getMonth() !== cursor.getMonth();
              return (
                <div key={d.toISOString()} className={`cal-month-cell${other ? " other-month" : ""}${isToday ? " today" : ""}`} style={{ borderRight: "1px solid var(--border-soft)" }}>
                  <span className="cdate">{d.getDate()}</span>
                  {offs.slice(0, 2).map((off) => (
                    <div className="cal-event dayoff" key={off.id} title={off.type ?? ""}>
                      🌴 {store.personById(off.person_id)?.name.split(" ")[0]}
                    </div>
                  ))}
                  {evs.slice(0, 3).map((tk) => {
                    const c = eventColor(tk.status);
                    return (
                      <div key={tk.id} className="cal-event" style={{ background: c.bg, color: c.fg, cursor: "pointer" }} onClick={() => onOpenTask(tk)}>
                        {tk.name}
                      </div>
                    );
                  })}
                  {evs.length > 3 && <div style={{ fontSize: 9.5, color: "var(--ink-faint)", paddingLeft: 2 }}>+{evs.length - 3} more</div>}
                </div>
              );
            }
          )}
        </div>
      )}

      {(viewMode === "week" || viewMode === "2weeks") && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
          {Array.from({ length: viewMode === "2weeks" ? 2 : 1 }, (_, w) => {
            const start = addDays(cursor, -cursor.getDay());
            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i));
            return (
              <div key={w}>
                <div className="cal-week-row" style={{ borderLeft: "1px solid var(--border-soft)" }}>
                  {weekDays.map((d) => (
                    <div key={d.toISOString()} className="cal-week-head" style={dayDiff(today(), d) === 0 ? { background: "var(--stage-prog-bg)" } : undefined}>
                      <span className="dow">{DOW_SHORT[d.getDay()]}</span>
                      <span className="dnum">{d.getDate()}</span>
                    </div>
                  ))}
                </div>
                <div className="cal-week-row" style={{ borderLeft: "1px solid var(--border-soft)" }}>
                  {weekDays.map((d) => {
                    const evs = tasksOnDay(d);
                    return (
                      <div key={d.toISOString()} className="cal-week-body">
                        {evs.length ? (
                          evs.map((tk) => {
                            const c = eventColor(tk.status);
                            const assignee = store.personById(tk.assignee_id);
                            return (
                              <div key={tk.id} className="cal-event" style={{ background: c.bg, color: c.fg, cursor: "pointer", marginBottom: 4, whiteSpace: "normal" }} onClick={() => onOpenTask(tk)}>
                                {tk.name}
                                <br />
                                <span style={{ opacity: 0.75, fontWeight: 500 }}>{assignee?.name.split(" ")[0]}</span>
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "day" && (
        <div className="card">
          {dayOffOnDay(cursor).map((off) => (
            <div className="priority-row" key={off.id}>
              <div className="pr-info">
                <div className="pr-name">🌴 {store.personById(off.person_id)?.name} — {off.type}</div>
                <div className="pr-proj">Approved day off</div>
              </div>
            </div>
          ))}
          {tasksOnDay(cursor).length ? (
            tasksOnDay(cursor).map((tk) => {
              const c = eventColor(tk.status);
              const proj = store.projectById(tk.project_id);
              const assignee = store.personById(tk.assignee_id);
              return (
                <div className="priority-row" key={tk.id} style={{ cursor: "pointer" }} onClick={() => onOpenTask(tk)}>
                  <div className="pr-info">
                    <div className="pr-name">{tk.name}</div>
                    <div className="pr-proj">{proj?.name} · {assignee?.name}</div>
                  </div>
                  <span className={`task-status-pill ${tk.status}`} style={{ background: c.bg, color: c.fg }}>
                    {tk.status}
                  </span>
                </div>
              );
            })
          ) : dayOffOnDay(cursor).length ? null : (
            <div className="empty-state">Nothing due on this day.</div>
          )}
        </div>
      )}
    </>
  );
}
