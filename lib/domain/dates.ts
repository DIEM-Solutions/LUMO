export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

export type WorkingCalendar = {
  workingDays: number[]; // 0=Sun..6=Sat
  holidays: Set<string>; // ISO date strings
};

export function isNonWorkingDay(d: Date, calendar: WorkingCalendar): boolean {
  if (!calendar.workingDays.includes(d.getDay())) return true;
  return calendar.holidays.has(toISO(d));
}

export function nextWorkingDay(d: Date): Date {
  let x = new Date(d);
  while (isWeekend(x)) x = addDays(x, 1);
  return x;
}

// includeWeekends: when true, Saturday/Sunday count as normal schedulable days;
// when false (default), the schedule skips Sat/Sun entirely.
export function workingDaysBefore(dueDate: Date, n: number, includeWeekends: boolean): Date {
  const remaining = Math.max(1, Math.ceil(n || 1));
  let cursor = new Date(dueDate);
  const collected: Date[] = [];
  while (collected.length < remaining) {
    if (includeWeekends || !isWeekend(cursor)) collected.push(new Date(cursor));
    cursor = addDays(cursor, -1);
  }
  return collected[collected.length - 1];
}

export function workingDaySpan(startDate: Date, n: number, includeWeekends: boolean): Date[] {
  const count = Math.max(1, Math.ceil(n || 1));
  const days: Date[] = [];
  let cursor = includeWeekends ? new Date(startDate) : nextWorkingDay(startDate);
  while (days.length < count) {
    if (includeWeekends || !isWeekend(cursor)) days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string | null | undefined): Date {
  if (!s) return startOfDay(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function round(n: number): number {
  return Math.round(n);
}

export function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function today(): Date {
  return startOfDay(new Date());
}

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function fmtLong(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
