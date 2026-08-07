import type { CapacityBand, DayOff, ManualUtilization, Task, WorkloadThresholds } from "@/lib/types";
import { addDays, clamp, dayDiff, fromISO, isNonWorkingDay, isWeekend, round, today, workingDaySpan, type WorkingCalendar } from "./dates";
import { computeStage } from "./stage";
import type { Store } from "./store";

export const DEFAULT_WORKING_CALENDAR: WorkingCalendar = { workingDays: [1, 2, 3, 4, 5], holidays: new Set() };

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
const PLANNING_WINDOW_DAYS = 14;

export function taskWorkingDays(tk: Task): Date[] {
  const start = tk.start_date ? fromISO(tk.start_date) : fromISO(tk.due_date);
  return workingDaySpan(start, tk.workload_days || 1, !!tk.include_weekends);
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

export function computeLoad(personId: string, store: Store): number {
  let load = 0;
  const windowStart = today();
  const windowEnd = addDays(windowStart, PLANNING_WINDOW_DAYS - 1);
  store.data.tasks.forEach((tk) => {
    if (!store.isAssignedTo(tk, personId) || tk.status === "done") return;
    const roleFactor = tk.assignee_id === personId ? 1 : 0.5;
    const statusFactor = tk.status === "blocked" ? 0.6 : 1;
    const span = taskWorkingDays(tk);
    const overlapDays = span.filter((d) => d >= windowStart && d <= windowEnd).length;
    if (overlapDays > 0) {
      load += overlapDays * roleFactor * statusFactor;
    } else if (tk.status === "not-started") {
      const daysToStart = dayDiff(windowStart, span[0]);
      if (daysToStart > PLANNING_WINDOW_DAYS) load += (tk.workload_days || 1) * roleFactor * 0.15;
    }
  });
  return load;
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

export function computeCapacity(
  personId: string,
  store: Store,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): Capacity {
  const person = store.personById(personId);
  const myTasksEarly = store.activeTasksForPerson(personId);
  const awayNowEarly = isApprovedDayOff(personId, today(), store.data.dayOff);

  if (!person) {
    return {
      personId,
      load: 0,
      pct: null,
      status: "unknown",
      band: "unknown",
      needsAttention: false,
      awayNow: false,
      offDaysInWindow: 0,
      reasons: [],
      label: CAP_STATUS_LABEL.unknown,
      activeTaskCount: 0,
      projectCount: 0,
      blockedCount: 0,
      overdueCount: 0,
      upcomingDeadlines: 0,
      source: "not-provided",
    };
  }

  if (person.capacity_baseline == null) {
    const myProjectsEarly = store
      .projectsForPerson(personId)
      .filter((pj) => require_stageDone(pj, store) !== "done");
    return {
      personId,
      load: 0,
      pct: null,
      status: "unknown",
      band: "unknown",
      needsAttention: false,
      awayNow: awayNowEarly,
      offDaysInWindow: 0,
      reasons: [],
      label: CAP_STATUS_LABEL.unknown,
      activeTaskCount: myTasksEarly.length,
      projectCount: myProjectsEarly.length,
      blockedCount: myTasksEarly.filter((tk) => tk.status === "blocked").length,
      overdueCount: myTasksEarly.filter((tk) => dayDiff(today(), fromISO(tk.due_date)) < 0).length,
      upcomingDeadlines: myTasksEarly.filter((tk) => {
        const d = dayDiff(today(), fromISO(tk.due_date));
        return d >= 0 && d <= NEAR_WINDOW_DAYS;
      }).length,
      source: "not-provided",
    };
  }

  if (person.manual_utilization) {
    const mu = person.manual_utilization;
    const myProjectsEarly = store
      .projectsForPerson(personId)
      .filter((pj) => require_stageDone(pj, store) !== "done");
    const band = (mu.status as CapacityBand) ?? "balanced";
    return {
      personId,
      load: null,
      pct: mu.totalPct,
      status: mu.status,
      band,
      needsAttention: mu.status === "needs-support" || mu.status === "overloaded",
      awayNow: awayNowEarly,
      offDaysInWindow: 0,
      reasons: [],
      label: CAP_STATUS_LABEL[mu.status] ?? mu.status,
      activeTaskCount: myTasksEarly.length,
      projectCount: myProjectsEarly.length,
      blockedCount: myTasksEarly.filter((tk) => tk.status === "blocked").length,
      overdueCount: myTasksEarly.filter((tk) => dayDiff(today(), fromISO(tk.due_date)) < 0).length,
      upcomingDeadlines: myTasksEarly.filter((tk) => {
        const d = dayDiff(today(), fromISO(tk.due_date));
        return d >= 0 && d <= NEAR_WINDOW_DAYS;
      }).length,
      source: "reported",
      reportedWeekStart: mu.weekStart,
      breakdown: mu.breakdown,
    };
  }

  const load = computeLoad(personId, store);
  const windowStart = today();
  const windowEnd = addDays(windowStart, PLANNING_WINDOW_DAYS - 1);
  const offDays = dayOffDaysInWindow(personId, windowStart, windowEnd, store.data.dayOff);
  const effectiveBaseline = Math.max(1, person.capacity_baseline - offDays);
  const pct = round(clamp((load / effectiveBaseline) * 100, 0, 999));
  const myTasks = store.activeTasksForPerson(personId);
  const blocked = myTasks.filter((tk) => tk.status === "blocked");
  const overdue = myTasks.filter((tk) => dayDiff(today(), fromISO(tk.due_date)) < 0);
  const urgentCount = myTasks.filter((tk) => {
    const d = dayDiff(today(), fromISO(tk.due_date));
    return tk.priority === "high" && d <= URGENT_WINDOW_DAYS && d >= -3;
  }).length;
  const myProjects = store.projectsForPerson(personId).filter((pj) => require_stageDone(pj, store) !== "done");
  const awayNow = isApprovedDayOff(personId, today(), store.data.dayOff);

  const flags = {
    blocked: blocked.length > 0,
    overdue: overdue.length > 0,
    overCapacity: pct >= 100,
    tooManyTasks: myTasks.length >= 7,
    tooManyProjects: myProjects.length >= 5,
    urgent: urgentCount >= 2,
  };

  let status: CapacityBand;
  if (flags.blocked || flags.overdue) {
    status =
      pct > thresholds.overloaded || (flags.blocked && flags.overdue) || myTasks.length >= 9
        ? "overloaded"
        : "needs-support";
  } else if (pct > thresholds.overloaded) {
    status = "overloaded";
  } else if (pct >= thresholds.needsSupport) {
    status = "needs-support";
  } else if (pct >= thresholds.almostFull) {
    status = "almost-full";
  } else if (pct >= thresholds.balanced) {
    status = "balanced";
  } else {
    status = "available";
  }

  const needsAttention = status === "needs-support" || status === "overloaded";
  const reasons: { label: string; tag: string }[] = [];
  if (needsAttention) {
    if (flags.blocked) reasons.push({ label: `${blocked.length} blocked task${blocked.length === 1 ? "" : "s"}`, tag: "blocked" });
    if (flags.overdue) reasons.push({ label: `${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`, tag: "overdue" });
    if (flags.overCapacity) reasons.push({ label: `Over capacity (${pct}%)`, tag: "over-capacity" });
    if (flags.tooManyTasks) reasons.push({ label: `${myTasks.length} active tasks at once`, tag: "load" });
    if (flags.tooManyProjects) reasons.push({ label: `${myProjects.length} active projects`, tag: "projects" });
    if (flags.urgent) reasons.push({ label: `${urgentCount} urgent deadlines`, tag: "urgent" });
    if (offDays > 0) reasons.push({ label: `${offDays} day${offDays === 1 ? "" : "s"} off this window`, tag: "day-off" });
    if (!reasons.length) reasons.push({ label: "Below full availability", tag: "low-availability" });
  }

  return {
    personId,
    load,
    pct,
    status,
    band: status,
    needsAttention,
    awayNow,
    offDaysInWindow: offDays,
    reasons: reasons.slice(0, 3),
    label: CAP_STATUS_LABEL[status] ?? status,
    activeTaskCount: myTasks.length,
    projectCount: myProjects.length,
    blockedCount: blocked.length,
    overdueCount: overdue.length,
    upcomingDeadlines: myTasks.filter((tk) => {
      const d = dayDiff(today(), fromISO(tk.due_date));
      return d >= 0 && d <= NEAR_WINDOW_DAYS;
    }).length,
    source: "calculated",
  };
}

function require_stageDone(project: { id: string }, store: Store): string {
  const proj = store.projectById(project.id);
  if (!proj) return "not-started";
  return computeStage(proj, store.tasksFor(project.id));
}
