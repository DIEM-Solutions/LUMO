import type { CapacityBand, DayOff, ManualUtilization, Task, WorkloadThresholds } from "@/lib/types";
import { addDays, clamp, dayDiff, fromISO, isNonWorkingDay, isWeekend, nextWorkingDay, round, today, workingDaySpan, type WorkingCalendar } from "./dates";
import { computeStage } from "./stage";
import type { Store } from "./store";

export const DEFAULT_WORKING_CALENDAR: WorkingCalendar = { workingDays: [1, 2, 3, 4, 5], holidays: new Set() };

export const HOURS_PER_DAY = 8;
export const WORK_DAYS_PER_WEEK = 5;
export const DEFAULT_WEEKLY_CAPACITY_HOURS = HOURS_PER_DAY * WORK_DAYS_PER_WEEK;

export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  balanced: 60,
  almostFull: 85,
  needsSupport: 100,
  overloaded: 100,
};

export const CAP_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  balanced: "Balanced",
  "almost-full": "Almost Full",
  "needs-support": "Needs Support",
  overloaded: "Overloaded",
  unknown: "Capacity not provided",
};

const URGENT_WINDOW_DAYS = 3;
const NEAR_WINDOW_DAYS = 14;

export function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}

/**
 * Where a task's chip is drawn on the Calendar tab (from its start date, one day
 * per 8h). Display only -- capacity uses taskLoadDays below, not this.
 */
export function taskWorkingDays(tk: Task): Date[] {
  const start = tk.start_date ? fromISO(tk.start_date) : fromISO(tk.due_date);
  const spanDays = Math.max(1, Math.ceil((tk.workload_hours || HOURS_PER_DAY) / HOURS_PER_DAY));
  return workingDaySpan(start, spanDays, !!tk.include_weekends);
}

/** The week capacity is measured against: on a weekend, "this week" means the coming one. */
export function currentWeekStart(): Date {
  return startOfWeek(nextWorkingDay(today()));
}

/** Hours still to do on a task: remaining_hours if someone set it, otherwise its full size. */
function remainingHours(tk: Task): number {
  return tk.remaining_hours != null ? tk.remaining_hours : tk.workload_hours || HOURS_PER_DAY;
}

/**
 * The days a task's remaining hours are spread over for capacity: evenly across
 * working days from today to its due date. Overdue or undated work still has to
 * be done, so it's squeezed into what's left of the current week (to Friday).
 * Always forward-looking from today -- a long-running in-progress task keeps
 * counting until it's done. (It used to be spread from its start date, so once
 * that original span was in the past the task silently counted 0h.)
 */
export function taskLoadDays(tk: Task): Date[] {
  const from = today();
  const due = tk.due_date ? fromISO(tk.due_date) : null;
  const end = due && due >= from ? due : addDays(currentWeekStart(), 5);
  const days: Date[] = [];
  for (let d = from; d <= end; d = addDays(d, 1)) {
    if (tk.include_weekends || !isWeekend(d)) days.push(d);
  }
  return days.length ? days : [tk.include_weekends ? from : nextWorkingDay(from)];
}

function weekdaysBetween(start: Date, end: Date): number {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (!isWeekend(d)) n++;
  return n;
}

export function dayOffOverlapsDate(d: DayOff, date: Date): boolean {
  return date >= fromISO(d.start_date) && date <= fromISO(d.end_date);
}

export function approvedDayOffOn(personId: string, date: Date, dayOff: DayOff[]): DayOff | null {
  return (
    dayOff.find((d) => d.person_id === personId && d.status === "approved" && dayOffOverlapsDate(d, date)) ??
    null
  );
}

export function isApprovedDayOff(personId: string, date: Date, dayOff: DayOff[]): boolean {
  return !!approvedDayOffOn(personId, date, dayOff);
}

export function totalApprovedLeaveDays(
  personId: string,
  dayOff: DayOff[],
  calendar: WorkingCalendar = DEFAULT_WORKING_CALENDAR
): number {
  let days = 0;
  dayOff
    .filter((d) => d.person_id === personId && d.status === "approved")
    .forEach((d) => {
      let cursor = fromISO(d.start_date);
      const end = fromISO(d.end_date);
      while (cursor <= end) {
        if (!isNonWorkingDay(cursor, calendar)) days++;
        cursor = addDays(cursor, 1);
      }
    });
  return days;
}

export function dayOffDaysInWindow(
  personId: string,
  windowStart: Date,
  windowEnd: Date,
  dayOff: DayOff[]
): number {
  let days = 0;
  dayOff
    .filter((d) => d.person_id === personId && d.status === "approved")
    .forEach((d) => {
      const s = fromISO(d.start_date);
      const e = fromISO(d.end_date);
      let cursor = new Date(Math.max(s.getTime(), windowStart.getTime()));
      const end = new Date(Math.min(e.getTime(), windowEnd.getTime()));
      while (cursor <= end) {
        if (!isWeekend(cursor)) days++;
        cursor = addDays(cursor, 1);
      }
    });
  return days;
}

function bandFor(pct: number, thresholds: WorkloadThresholds): CapacityBand {
  if (pct > thresholds.overloaded) return "overloaded";
  if (pct >= thresholds.needsSupport) return "needs-support";
  if (pct >= thresholds.almostFull) return "almost-full";
  if (pct >= thresholds.balanced) return "balanced";
  return "available";
}

/**
 * Hours of work a person is carrying within a date window, per project, from
 * tasks actually underway right now. Only "in-progress" counts -- not started
 * (no work has happened yet) and blocked (work has stalled, so it isn't
 * occupying the person's time right now) are both excluded, same as done.
 * Blocked/overdue work is surfaced as a separate warning (Capacity.overdueCount /
 * blockedCount, rendered by CapWarningChip), never by changing the % or label.
 * A second assignee carries half the hours.
 */
export function computeLoadByProject(personId: string, store: Store, windowStart: Date, windowEnd: Date): Map<string, number> {
  const byProject = new Map<string, number>();
  store.data.tasks.forEach((tk) => {
    if (!store.isAssignedTo(tk, personId) || tk.status !== "in-progress") return;
    const roleFactor = tk.assignee_id === personId ? 1 : 0.5;
    const days = taskLoadDays(tk);
    const perDay = remainingHours(tk) / days.length;
    const overlapDays = days.filter((d) => d >= windowStart && d <= windowEnd).length;
    if (overlapDays > 0) byProject.set(tk.project_id, (byProject.get(tk.project_id) ?? 0) + overlapDays * perDay * roleFactor);
  });
  return byProject;
}

export function computeLoadHours(personId: string, store: Store, windowStart: Date, windowEnd: Date): number {
  let hours = 0;
  computeLoadByProject(personId, store, windowStart, windowEnd).forEach((h) => (hours += h));
  return Math.round(hours * 10) / 10;
}

export type DailyCapacity = {
  hours: number;
  capacityHours: number;
  pct: number | null;
  band: CapacityBand | "unknown";
};

/**
 * Today's actual hours vs. a person's daily capacity (weekly capacity / 5),
 * always computed live from real task data -- never frozen by a manually
 * reported number.
 */
export function computeDailyCapacity(
  personId: string,
  store: Store,
  date: Date = today(),
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): DailyCapacity {
  const person = store.personById(personId);
  const hours = computeLoadHours(personId, store, date, date);
  if (!person || person.weekly_capacity_hours == null) {
    return { hours, capacityHours: HOURS_PER_DAY, pct: null, band: "unknown" };
  }
  if (isApprovedDayOff(personId, date, store.data.dayOff)) {
    return { hours, capacityHours: 0, pct: hours > 0 ? 999 : 0, band: hours > 0 ? "overloaded" : "available" };
  }
  const capacityHours = person.weekly_capacity_hours / WORK_DAYS_PER_WEEK;
  const pct = round(clamp((hours / Math.max(1, capacityHours)) * 100, 0, 999));
  return { hours, capacityHours: Math.round(capacityHours * 10) / 10, pct, band: bandFor(pct, thresholds) };
}

/**
 * The one wording for booked-vs-capacity hours, used wherever they're shown:
 * "6h of 16h left this week", "3h of 8h today". Always say which window --
 * a bare "6/16h" was ambiguous once "this week" started meaning the rest of it.
 */
export function hoursOfLabel(hours: number, capacityHours: number, window: "today" | "week"): string {
  return `${hours}h of ${capacityHours}h ${window === "today" ? "today" : "left this week"}`;
}

/** A week that's entirely in the past -- nothing left to measure, so don't show a capacity figure for it. */
export function isPastWeek(weekly: WeeklyCapacity): boolean {
  return weekly.from > weekly.weekEnd;
}

export type WeeklyCapacity = {
  hours: number;
  capacityHours: number;
  pct: number | null;
  band: CapacityBand | "unknown";
  offDays: number;
  /** First day actually measured: today, for the current week. */
  from: Date;
  weekEnd: Date;
};

/**
 * Remaining hours booked this week vs. remaining capacity this week, net of
 * approved leave -- both measured from today to the end of the week, so the %
 * means "how full is the rest of this week" (on a Thursday that's Thu+Fri, not
 * the whole 40h; days already gone are already worked). A future week is
 * measured in full; a past week has nothing left to measure (0/0h). Always
 * computed live from real task data, never a manually reported number.
 */
export function computeWeeklyCapacity(
  personId: string,
  store: Store,
  weekStart: Date = currentWeekStart(),
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): WeeklyCapacity {
  const person = store.personById(personId);
  const weekEnd = addDays(weekStart, 6);
  const from = weekStart > today() ? weekStart : today();
  const inWindow = from <= weekEnd;
  const hours = inWindow ? computeLoadHours(personId, store, from, weekEnd) : 0;
  if (!person || person.weekly_capacity_hours == null) {
    return { hours, capacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS, pct: null, band: "unknown", offDays: 0, from, weekEnd };
  }
  const offDays = inWindow ? dayOffDaysInWindow(personId, from, weekEnd, store.data.dayOff) : 0;
  const workDays = inWindow ? Math.max(0, weekdaysBetween(from, weekEnd) - offDays) : 0;
  const capacityHours = (workDays * person.weekly_capacity_hours) / WORK_DAYS_PER_WEEK;
  const pct = capacityHours > 0 ? round(clamp((hours / capacityHours) * 100, 0, 999)) : hours > 0 ? 999 : 0;
  return { hours, capacityHours: Math.round(capacityHours * 10) / 10, pct, band: bandFor(pct, thresholds), offDays, from, weekEnd };
}

export type Capacity = {
  personId: string;
  load: number | null;
  pct: number | null;
  status: string;
  band: CapacityBand | "unknown";
  needsAttention: boolean;
  awayNow: boolean;
  offDaysInWindow: number;
  reasons: { label: string; tag: string }[];
  label: string;
  activeTaskCount: number;
  projectCount: number;
  blockedCount: number;
  overdueCount: number;
  upcomingDeadlines: number;
  source: "not-provided" | "reported" | "calculated";
  reportedWeekStart?: string;
  breakdown?: ManualUtilization["breakdown"];
};

/**
 * A person's overall status for the current week -- the headline "how loaded
 * are they" figure used everywhere (Team, Home, Projects matrix, Planning).
 * The label is ALWAYS bandFor(pct): the same % the user sees, against the
 * Settings thresholds. Overdue/blocked work is reported separately via
 * overdueCount/blockedCount (render with CapWarningChip). It used to override
 * the label, which produced "Overloaded" at 3% booked -- don't bring that back.
 */
export function computeCapacity(
  personId: string,
  store: Store,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): Capacity {
  const person = store.personById(personId);
  const myTasks = person ? store.activeTasksForPerson(personId) : [];
  const blocked = myTasks.filter((tk) => tk.status === "blocked");
  const overdue = myTasks.filter((tk) => tk.due_date && dayDiff(today(), fromISO(tk.due_date)) < 0);
  const daysToDue = (tk: Task) => (tk.due_date ? dayDiff(today(), fromISO(tk.due_date)) : null);
  const urgentCount = myTasks.filter((tk) => {
    const d = daysToDue(tk);
    return d != null && tk.priority === "high" && d <= URGENT_WINDOW_DAYS && d >= -3;
  }).length;
  const myProjects = person ? store.projectsForPerson(personId).filter((pj) => require_stageDone(pj, store) !== "done") : [];
  const counts = {
    personId,
    awayNow: isApprovedDayOff(personId, today(), store.data.dayOff),
    activeTaskCount: myTasks.length,
    projectCount: myProjects.length,
    blockedCount: blocked.length,
    overdueCount: overdue.length,
    upcomingDeadlines: myTasks.filter((tk) => {
      const d = daysToDue(tk);
      return d != null && d >= 0 && d <= NEAR_WINDOW_DAYS;
    }).length,
  };

  if (!person || person.weekly_capacity_hours == null) {
    return {
      ...counts,
      load: 0,
      pct: null,
      status: "unknown",
      band: "unknown",
      needsAttention: false,
      offDaysInWindow: 0,
      reasons: [],
      label: CAP_STATUS_LABEL.unknown,
      source: "not-provided",
    };
  }

  const weekly = computeWeeklyCapacity(personId, store, undefined, thresholds);
  const pct = weekly.pct ?? 0;
  const status = bandFor(pct, thresholds);
  const needsAttention = status === "needs-support" || status === "overloaded";

  // Context for a high %, never a different label. Overdue/blocked are left
  // out on purpose -- they're the separate warning chip.
  const reasons: { label: string; tag: string }[] = [];
  if (needsAttention) {
    reasons.push({ label: pct >= 100 ? `Over capacity (${pct}%)` : `Near full capacity (${pct}%)`, tag: "over-capacity" });
    if (myTasks.length >= 7) reasons.push({ label: `${myTasks.length} active tasks at once`, tag: "load" });
    if (myProjects.length >= 5) reasons.push({ label: `${myProjects.length} active projects`, tag: "projects" });
    if (urgentCount >= 2) reasons.push({ label: `${urgentCount} urgent deadlines`, tag: "urgent" });
    if (weekly.offDays > 0) reasons.push({ label: `${weekly.offDays} day${weekly.offDays === 1 ? "" : "s"} off this week`, tag: "day-off" });
  }

  return {
    ...counts,
    load: weekly.hours,
    pct,
    status,
    band: status,
    needsAttention,
    offDaysInWindow: weekly.offDays,
    reasons: reasons.slice(0, 3),
    label: CAP_STATUS_LABEL[status] ?? status,
    source: "calculated",
  };
}

function require_stageDone(project: { id: string }, store: Store): string {
  const proj = store.projectById(project.id);
  if (!proj) return "not-started";
  return computeStage(proj, store.tasksFor(project.id));
}
