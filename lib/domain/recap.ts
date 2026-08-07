import { dayDiff, fromISO, today } from "./dates";
import { computeHealth, openBlockersFor } from "./health";
import { projectProgress } from "./progress";
import { computeStage } from "./stage";
import type { Store } from "./store";
import type { Project } from "@/lib/types";

export type RecapRow = {
  project: Project;
  ownerId: string | null;
  thisWeek: string;
  nextWeek: string;
  dueDate: string | null;
  risks: string;
  riskSeverity: "none" | "warning" | "critical";
  notes: string;
};

export function buildRecapRows(store: Store): RecapRow[] {
  return store.data.projects
    .filter((p) => computeStage(p, store.tasksFor(p.id)) !== "done")
    .map((p) => {
      const tasks = store.tasksFor(p.id);
      const health = computeHealth(p, tasks, store.data.blockers);
      const active = tasks.filter((tk) => tk.status !== "done");

      const thisWeekTask =
        active.find((tk) => tk.status === "in-progress") ||
        [...active].sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0] ||
        null;
      const nextWeekTask = active
        .filter((tk) => tk.status === "not-started" && tk.id !== thisWeekTask?.id)
        .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0];

      const openBlockers = openBlockersFor(p.id, store.data.blockers);
      const overdueCt = active.filter((tk) => dayDiff(today(), fromISO(tk.due_date)) < 0).length;

      let risks = "—";
      let riskSeverity: RecapRow["riskSeverity"] = "none";
      if (openBlockers.length) {
        risks = openBlockers[0].title;
        riskSeverity = openBlockers[0].urgency === "high" ? "critical" : "warning";
      } else if (health === "at-risk") {
        risks = `${overdueCt || 0} overdue, ${projectProgress(p, tasks)}% complete`;
        riskSeverity = "warning";
      } else if (health === "blocked") {
        risks = "Blocked";
        riskSeverity = "critical";
      }

      return {
        project: p,
        ownerId: p.owner_id,
        thisWeek: thisWeekTask?.name ?? "—",
        nextWeek: nextWeekTask?.name ?? "—",
        dueDate: p.end_date,
        risks,
        riskSeverity,
        notes: p.next_deliverable ?? "",
      };
    })
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, none: 2 };
      return rank[a.riskSeverity] - rank[b.riskSeverity];
    });
}
