"use client";

import { useState } from "react";
import { approvedDayOffOn, computeCapacity } from "@/lib/domain/capacity";
import { addDays, dayDiff, DOW_SHORT, fmt, fromISO, toISO, today } from "@/lib/domain/dates";
import { bySeniorityDesc } from "@/lib/domain/hierarchy";
import { createStore, type PortalData } from "@/lib/domain/store";
import { Avatar } from "@/components/ui/primitives";
import type { Person, Project, Task, WorkloadThresholds } from "@/lib/types";

function scheduleLabel(tk: Task, d: Date): string {
  const iso = toISO(d);
  const entry = tk.daily_schedule.find((s) => s.date === iso);
  return entry ? `${entry.start}–${entry.end}` : `${tk.workload_hours}h`;
}

/** One row of a person's block: a project they have open tasks on (or a single empty row if they have none). */
type ProjectRow = { key: string; project: Project | null; tasks: Task[] };

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
  const todayISO = toISO(today());
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  function toggleExpanded(key: string) {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Every project the person has an open (not done) task on — regardless of whether
  // those tasks fall inside the visible weeks, so rows don't jump around when the range changes.
  function projectRowsFor(personId: string): ProjectRow[] {
    const byProject = new Map<string, Task[]>();
    data.tasks.forEach((tk) => {
      if (!store.isAssignedTo(tk, personId) || tk.status === "done") return;
      if (projectFilter !== "all" && tk.project_id !== projectFilter) return;
      byProject.set(tk.project_id, [...(byProject.get(tk.project_id) ?? []), tk]);
    });
    const rows = [...byProject.entries()]
      .map(([projectId, tasks]) => ({ key: projectId, project: store.projectById(projectId) ?? null, tasks }))
      .sort((a, b) => (a.project?.name ?? "").localeCompare(b.project?.name ?? ""));
    return rows.length ? rows : [{ key: "empty", project: null, tasks: [] }];
  }

  function taskChip(tk: Task, label: string, overdue = false) {
    const proj = store.projectById(tk.project_id);
    const typeAccent = proj ? (proj.type === "client" ? "var(--client-fg)" : "var(--internal-fg)") : "transparent";
    const assignee2 = store.personById(tk.assignee2_id);
    return (
      <div
        key={tk.id}
        className={`plan-block ${tk.status}${overdue && tk.status !== "blocked" ? " plan-overdue" : ""}`}
        style={{ borderLeft: `3px solid ${typeAccent}` }}
        title={`${tk.name} · ${label}`}
        onClick={() => onOpenTask(tk)}
      >
        {tk.name} · {label}
        {assignee2 && (
          <span className="plan-support-badge" title={`Second assignee: ${assignee2.name}`}>
            +1
          </span>
        )}
      </div>
    );
  }

  /** Caps a cell at 3 tasks with a click-to-expand "+N more", same pattern as the Calendar tab. */
  function cappedChips(cellKey: string, tasks: Task[], labelFor: (tk: Task) => string, overdue = false) {
    const expanded = expandedCells.has(cellKey);
    const visible = expanded ? tasks : tasks.slice(0, 3);
    const hiddenCount = tasks.length - visible.length;
    return (
      <>
        {visible.map((tk) => taskChip(tk, labelFor(tk), overdue))}
        {hiddenCount > 0 && (
          <div className="plan-more" role="button" onClick={() => toggleExpanded(cellKey)} style={{ cursor: "pointer" }}>
            +{hiddenCount} more
          </div>
        )}
        {expanded && tasks.length > 3 && (
          <div className="plan-more" role="button" onClick={() => toggleExpanded(cellKey)} style={{ cursor: "pointer" }}>
            Show less
          </div>
        )}
      </>
    );
  }

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
        <span><i className="pl-swatch" style={{ boxShadow: "inset 0 0 0 1.5px var(--diem-orange)" }} />Overdue</span>
        <span><i className="pl-swatch dayoff" />Day off</span>
        <span style={{ borderLeft: "1px solid var(--border-soft)", paddingLeft: 14 }}>
          <i className="pl-swatch" style={{ background: "var(--client-fg)" }} />Client
        </span>
        <span><i className="pl-swatch" style={{ background: "var(--internal-fg)" }} />Internal</span>
        <span style={{ borderLeft: "1px solid var(--border-soft)", paddingLeft: 14 }}>Tasks are shown on their due date</span>
      </div>

      <div className="plan-wrap">
        <div className="plan-grid" style={{ gridTemplateColumns: `210px 170px minmax(150px,1fr) repeat(${days.length}, minmax(140px,1fr))` }}>
          <div className="plan-corner plan-corner-sticky" />
          <div className="plan-head-cell plan-project-head">
            <span className="dow">Project</span>
          </div>
          <div className="plan-head-cell plan-overdue-head">
            <span className="dow">Overdue</span>
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className={`plan-head-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}`}>
              <span className="dow">{DOW_SHORT[d.getDay()]}</span>
              <span className="dnum">{d.getDate()}</span>
            </div>
          ))}
          {people.map((person) => {
            const cap = person.role_type === "ceo" ? null : computeCapacity(person.id, store, thresholds);
            const rows = projectRowsFor(person.id);
            return (
              <div key={person.id} style={{ display: "contents" }}>
                <div className="plan-name-cell plan-person-span plan-person-end" style={{ gridColumn: 1, gridRow: `span ${rows.length}` }}>
                  <Avatar person={person} />
                  <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <span className="pn-name">{person.name}</span>
                    <span className="pn-role">{person.role}{cap && cap.pct != null ? ` · ${cap.pct}%` : ""}</span>
                  </div>
                  <button className="icon-btn" title={`Add task for ${person.name}`} style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => onAddTaskFor(person.id)}>
                    +
                  </button>
                </div>
                {rows.map((row, i) => {
                  const rowKey = `${person.id}|${row.key}`;
                  const endClass = i === rows.length - 1 ? " plan-person-end" : "";
                  const noDue = row.tasks.filter((tk) => !tk.due_date);
                  const overdue = row.tasks
                    .filter((tk) => tk.due_date && tk.due_date < todayISO)
                    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
                  const noDueKey = `${rowKey}|nodue`;
                  return (
                    <div key={row.key} style={{ display: "contents" }}>
                      <div className={`plan-project-cell${endClass}`}>
                        {row.key === "empty" ? (
                          <span className="plan-project-empty">No open tasks</span>
                        ) : (
                          <span className={`tag ${row.project?.type ?? ""}`} title={row.project?.name ?? "Unknown project"}>
                            {row.project?.name ?? "Unknown project"}
                          </span>
                        )}
                        {noDue.length > 0 && (
                          <div className="plan-more" role="button" onClick={() => toggleExpanded(noDueKey)} style={{ cursor: "pointer" }}>
                            No due date · {noDue.length}
                          </div>
                        )}
                        {expandedCells.has(noDueKey) && (
                          <div style={{ width: "100%" }}>{noDue.map((tk) => taskChip(tk, `${tk.workload_hours}h`))}</div>
                        )}
                      </div>
                      <div className={`plan-day-cell plan-row-cell plan-overdue-cell${endClass}`}>
                        {cappedChips(`${rowKey}|overdue`, overdue, (tk) => `due ${fmt(fromISO(tk.due_date))}`, true)}
                      </div>
                      {days.map((d) => {
                        const iso = toISO(d);
                        const off = approvedDayOffOn(person.id, d, data.dayOff);
                        const dayTasks = row.tasks.filter((tk) => tk.due_date === iso);
                        return (
                          <div
                            key={d.toISOString()}
                            className={`plan-day-cell plan-row-cell${[0, 6].includes(d.getDay()) ? " weekend" : ""}${dayDiff(today(), d) === 0 ? " today" : ""}${endClass}`}
                          >
                            {off && (
                              <div className="plan-block dayoff" title={`${off.type} — ${person.name}`}>
                                🌴 {off.type}
                              </div>
                            )}
                            {cappedChips(`${rowKey}|${iso}`, dayTasks, (tk) => scheduleLabel(tk, d))}
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
