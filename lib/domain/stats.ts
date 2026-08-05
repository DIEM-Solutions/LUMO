import { dayDiff, fromISO, today } from "./dates";
import { computeHealth } from "./health";
import { computeStage } from "./stage";
import type { Store } from "./store";

export function portfolioStats(store: Store) {
  const stageCounts = { "not-started": 0, "in-progress": 0, done: 0, blocked: 0 };
  const healthCounts = { "on-track": 0, "at-risk": 0, blocked: 0 };
  const typeCounts = { client: 0, internal: 0 };

  store.data.projects.forEach((p) => {
    const tasks = store.tasksFor(p.id);
    stageCounts[computeStage(p, tasks)]++;
    healthCounts[computeHealth(p, tasks, store.data.blockers)]++;
    typeCounts[p.type]++;
  });

  const blockedTasks = store.data.tasks.filter((tk) => tk.status === "blocked").length;

  return { stageCounts, healthCounts, typeCounts, activeProjects: store.data.projects.length, blockedTasks };
}

export function overdueTaskCount(store: Store) {
  return store.data.tasks.filter((tk) => tk.status !== "done" && dayDiff(today(), fromISO(tk.due_date)) < 0).length;
}
