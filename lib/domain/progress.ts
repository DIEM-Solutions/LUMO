import type { Project, Task } from "@/lib/types";
import { clamp, round } from "./dates";

export function computeAutoProgress(tasks: Task[]): number {
  if (!tasks.length) return 0;
  const totalHours = tasks.reduce((s, tk) => s + tk.workload_hours, 0) || 1;
  const contributed = tasks.reduce((s, tk) => {
    let factor = 0;
    if (tk.status === "done") factor = 1;
    else if (tk.status === "in-progress")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0.5;
    else if (tk.status === "blocked")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0;
    else if (tk.status === "not-started")
      factor = tk.progress_pct != null ? clamp(tk.progress_pct, 0, 100) / 100 : 0;
    return s + tk.workload_hours * factor;
  }, 0);
  return round(clamp((contributed / totalHours) * 100, 0, 100));
}

export function projectProgress(_project: Project, tasks: Task[]): number {
  return computeAutoProgress(tasks);
}
