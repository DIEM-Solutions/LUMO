import type { Blocker, HealthValue, Project, Task } from "@/lib/types";
import { clamp, dayDiff, fromISO, round, today } from "./dates";
import { projectProgress } from "./progress";

function projectHasBlockedTask(tasks: Task[]): boolean {
  return tasks.some((tk) => tk.status === "blocked");
}

export function openBlockersFor(projectId: string, blockers: Blocker[]): Blocker[] {
  return blockers.filter((b) => b.project_id === projectId && b.status === "open");
}

export function computeHealth(
  project: Project,
  tasks: Task[],
  blockers: Blocker[]
): HealthValue {
  const pct = projectProgress(project, tasks);
  // All tasks actually done outranks any manual health flag — a fully
  // finished project can't still be reported as at-risk or blocked.
  if (pct >= 100) return "on-track";
  if (project.health_manual && project.health_manual.enabled) {
    return project.health_manual.value;
  }
  const hasHighBlocker = openBlockersFor(project.id, blockers).some((b) => b.urgency === "high");
  if (projectHasBlockedTask(tasks) || hasHighBlocker) return "blocked";
  const end = project.end_date ? fromISO(project.end_date) : null;
  const daysToEnd = end ? dayDiff(today(), end) : 9999;
  if (daysToEnd <= 14 && daysToEnd >= 0 && pct < 70) return "at-risk";
  if (daysToEnd < 0 && pct < 100) return "at-risk";
  return "on-track";
}

export function isProjectPastTargetDate(project: Project, tasks: Task[]): boolean {
  if (!project.end_date) return false;
  return dayDiff(today(), fromISO(project.end_date)) < 0 && projectProgress(project, tasks) < 100;
}

export function projectElapsedPct(project: Project): number {
  if (!project.start_date || !project.end_date) return 0;
  const start = fromISO(project.start_date);
  const end = fromISO(project.end_date);
  const totalDays = Math.max(1, dayDiff(start, end));
  const elapsedDays = clamp(dayDiff(start, today()), 0, totalDays);
  return round((elapsedDays / totalDays) * 100);
}
