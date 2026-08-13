import type { Project, Task } from "@/lib/types";
import { clamp, round } from "./dates";

export function computeAutoProgress(tasks: Task[]): number {
  if (!tasks.length) return 0;
  const totalWeight = tasks.reduce((s, tk) => s + tk.weight, 0) || 1;
  const contributed = tasks.reduce((s, tk) => {
    let factor = 0;
    if (tk.status === "done") factor = 1;
    else if (tk.status === "in-progress")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0.5;
    else if (tk.status === "blocked")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0;
    else if (tk.status === "not-started")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0;
    return s + tk.weight * factor;
  }, 0);
  return round(clamp((contributed / totalWeight) * 100, 0, 100));
}

export function projectProgress(project: Project, tasks: Task[]): number {
  const auto = computeAutoProgress(tasks);
  // All tasks actually done outranks any manual figure — a project can't be
  // reported as anything less than 100% once there's no work left on it.
  if (auto >= 100) return 100;
  if (project.progress_manual && project.progress_manual.enabled) {
    return clamp(project.progress_manual.value, 0, 100);
  }
  return auto;
}
