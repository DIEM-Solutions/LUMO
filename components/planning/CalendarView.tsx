"use client";

import { useState } from "react";
import { computeWeeklyCapacity, dayOffOverlapsDate, startOfWeek, taskWorkingDays } from "@/lib/domain/capacity";
import { addDays, dayDiff, DOW_SHORT, fmt, fmtLong, fromISO, MONTH_NAMES, today } from "@/lib/domain/dates";
import { bySeniorityDesc } from "@/lib/domain/hierarchy";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar, CapacityBar, CapStatusPill } from "@/components/ui/primitives";
import type { DayOff, PublicHoliday, Task, WorkloadThresholds } from "@/lib/types";

type ViewMode = "day" | "week" | "2weeks" | "month";

function eventColor(status: Task["status"]) {
  if (status === "blocked") return { bg: "var(--stage-blocked-bg)", fg: "var(--health-blocked)" };
  if (status === "in-progress") return { bg: "var(--stage-prog-bg)", fg: "var(--stage-prog-fg)" };
  return { bg: "var(--stage-ns-bg)", fg: "var(--stage-ns-fg)" };
}

export function CalendarView({
  data,
  thresholds,
  personFilter,
  onPersonChange,
  projectFilter,
  onProjectChange,
  onOpenTask,
  onAddTaskFor,
  holidays,
}: {
  data: PortalData;
  thresholds: WorkloadThresholds;
  personFilter: string;
  onPersonChange: (id: string) => void;
  projectFilter: string;
  onProjectChange: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onAddTaskFor: (personId: string) => void;
  holidays: PublicHoliday[];
}) {
  const store = createStore(data);
  const planningRoster = store.calendarRoster().filter((p) => p.role_type !== "ceo").sort(bySeniorityDesc);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(today());
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  function toggleExpanded(key: string) {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function matchesFilters(tk: Task) {
    if (personFilter !== "all" && !store.isAssignedTo(tk, personFilter)) return false;
    if (projectFilter !== "all" && tk.project_id !== projectFilter) return false;
    return tk.status !== "done";
  }

  function tasksOnDay(d: Date) {
    return data.tasks.filter((tk) => matchesFilters(tk) && taskWorkingDays(tk).some((sd) => dayDiff(sd, d) === 0));
  }

  function tasksForPersonOnDay(personId: string, d: Date) {
    return data.tasks.filter((tk) => {
      if (!store.isAssignedTo(tk, personId) || tk.status === "done") return false;
      if (projectFilter !== "all" && tk.project_id !== projectFilter) return false;
      return taskWorkingDays(tk).some((sd) => dayDiff(sd, d) === 0);
    });
  }

  function dayOffOnDay(d: Date): DayOff[] {
    return data.dayOff.filter(
      (off) => off.status === "approved" && dayOffOverlapsDate(off, d) && (personFilter === "all" || off.person_id === personFilter)
    );
  }

  function dayOffFor(personId: string, d: Date): DayOff | null {
    return (
      data.dayOff.find((off) => off.status === "approved" && off.person_id === personId && dayOffOverlapsDate(off, d)) ?? null
    );
  }

  function holidayOnDay(d: Date): PublicHoliday | null {
    return holidays.find((h) => dayDiff(fromISO(h.date), d) === 0) ?? null;
  }

  const weekPeople = personFilter !== "all" ? planningRoster.filter((p) => p.id === personFilter) : planningRoster;

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

      <div className="plan-legend">
        <span><i className="pl-swatch not-started" />Not started</span>
        <span><i className="pl-swatch in-progress" />In progress</span>
        <span><i className="pl-swatch blocked" />Blocked</span>
        <span><i className="pl-swatch dayoff" />Day off</span>
        <span><i className="pl-swatch holiday" />Holiday</span>
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
              const holiday = holidayOnDay(d);
              const isToday = dayDiff(today(), d) === 0;
              const other = d.getMonth() !== cursor.getMonth();
              return (
                <div key={d.toISOString()} className={`cal-month-cell${other ? " other-month" : ""}${isToday ? " today" : ""}${holiday ? " is-holiday" : ""}`} style={{ borderRight: "1px solid var(--border-soft)" }}>
                  <span className="cdate">{d.getDate()}</span>
                  {holiday && (
                    <div className="cal-event holiday" title={holiday.name}>
                      🎌 {holiday.name}
                    </div>
                  )}
                  {offs.slice(0, 2).map((off) => (
                    <div className="cal-event dayoff" key={off.id} title={off.type ?? ""}>
                      🌴 {store.personById(off.person_id)?.name.split(" ")[0]}
                    </div>
                  ))}
                  {evs.slice(0, 3).map((tk) => {
                    const c = eventColor(tk.status);
                    const assignee = store.personById(tk.assignee_id);
                    return (
                      <div
                        key={tk.id}
                        className="cal-event"
                        style={{ background: c.bg, color: c.fg, cursor: "pointer" }}
                        title={`${tk.name}${assignee ? ` · ${assignee.name}` : ""}`}
                        onClick={() => onOpenTask(tk)}
                      >
                        {tk.name}{assignee ? ` · ${assignee.name.split(" ")[0]}` : ""}
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
        <div className="plan-wrap">
          {Array.from({ length: viewMode === "2weeks" ? 2 : 1 }, (_, w) => {
            const start = addDays(cursor, -cursor.getDay());
            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i));
            const weekStart = startOfWeek(weekDays[0]);
            const weekHolidays = weekDays.map(holidayOnDay);
            const hasHolidayThisWeek = weekHolidays.some(Boolean);
            return (
              <div key={w} className="plan-grid" style={{ gridTemplateColumns: "230px repeat(7, minmax(150px,1fr))", marginBottom: w === 0 && viewMode === "2weeks" ? 10 : 0 }}>
                <div className="plan-corner" />
                {weekDays.map((d) => {
                  const isToday = dayDiff(today(), d) === 0;
                  return (
                    <div key={d.toISOString()} className={`plan-head-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${isToday ? " today" : ""}`}>
                      <span className="dow">{DOW_SHORT[d.getDay()]}</span>
                      <span className={`dnum${isToday ? " today" : ""}`}>{d.getDate()}</span>
                    </div>
                  );
                })}

                {hasHolidayThisWeek && (
                  <div style={{ display: "contents" }}>
                    <div style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-alt)" }} />
                    {weekDays.map((d, i) => (
                      <div key={d.toISOString()} style={{ borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)", padding: weekHolidays[i] ? "5px 6px" : 0 }}>
                        {weekHolidays[i] && (
                          <div className="cal-event holiday" style={{ margin: 0 }} title={weekHolidays[i]!.name}>
                            🎌 {weekHolidays[i]!.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {weekPeople.map((person) => {
                  const cap = computeWeeklyCapacity(person.id, store, weekStart, thresholds);
                  return (
                    <div key={person.id} style={{ display: "contents" }}>
                      <div className="plan-name-cell" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6, paddingTop: 10, paddingBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
                          <Avatar person={person} />
                          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                              <span className="pn-name">{person.name}</span>
                              {cap.pct != null && <CapStatusPill band={cap.band} />}
                            </div>
                            <span className="pn-role">{person.role}</span>
                          </div>
                          <button className="icon-btn" title={`Add task for ${person.name}`} style={{ flexShrink: 0 }} onClick={() => onAddTaskFor(person.id)}>
                            +
                          </button>
                        </div>
                        {cap.pct != null && <CapacityBar pct={cap.pct} band={cap.band === "unknown" ? "available" : cap.band} />}
                      </div>
                      {weekDays.map((d) => {
                        const off = dayOffFor(person.id, d);
                        const dayTasks = tasksForPersonOnDay(person.id, d);
                        const cellKey = `${person.id}|${d.toISOString()}`;
                        const expanded = expandedCells.has(cellKey);
                        const visibleTasks = expanded ? dayTasks : dayTasks.slice(0, 3);
                        const hiddenCount = dayTasks.length - visibleTasks.length;
                        const isToday = dayDiff(today(), d) === 0;
                        return (
                          <div key={d.toISOString()} className={`plan-day-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${isToday ? " today" : ""}`} style={expanded ? { height: "auto" } : undefined}>
                            {off && (
                              <div className="plan-block dayoff" title={off.type ?? ""}>
                                🌴 {off.type}
                              </div>
                            )}
                            {!off &&
                              visibleTasks.map((tk) => (
                                <div
                                  key={tk.id}
                                  className={`plan-block ${tk.status}`}
                                  title={`${tk.name} · ${tk.workload_hours}h`}
                                  onClick={() => onOpenTask(tk)}
                                >
                                  {tk.name} · {tk.workload_hours}h
                                </div>
                              ))}
                            {!off && hiddenCount > 0 && (
                              <div className="plan-more" role="button" onClick={() => toggleExpanded(cellKey)} style={{ cursor: "pointer" }}>
                                +{hiddenCount} more
                              </div>
                            )}
                            {!off && expanded && dayTasks.length > 3 && (
                              <div className="plan-more" role="button" onClick={() => toggleExpanded(cellKey)} style={{ cursor: "pointer" }}>
                                Show less
                              </div>
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
      )}

      {viewMode === "day" && (
        <div className="card">
          {holidayOnDay(cursor) && (
            <div className="cal-holiday-banner">🎌 {holidayOnDay(cursor)!.name} — public holiday</div>
          )}
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
