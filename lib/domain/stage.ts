import type { Project, Stage, Task } from "@/lib/types";
import { projectProgress } from "./progress";

export function computeStage(project: Project, tasks: Task[]): Stage {
  const pct = projectProgress(project, tasks);
  if (pct <= 0) return "not-started";
  if (pct >= 100) return "done";
  return "in-progress";
}
