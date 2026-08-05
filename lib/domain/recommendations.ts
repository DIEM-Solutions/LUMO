import type { WorkloadThresholds } from "@/lib/types";
import { computeCapacity } from "./capacity";
import { taskWorkingDays } from "./capacity";
import { dayDiff, fromISO, toISO, today } from "./dates";
import { computeHealth } from "./health";
import { openBlockersFor } from "./health";
import { projectProgress } from "./progress";
import type { Store } from "./store";

export type RecommendationAction =
  | { type: "reassign-task"; taskId: string; toPersonId: string }
  | { type: "add-support"; taskId: string; toPersonId: string }
  | { type: "escalate-blocker"; blockerId: string }
  | { type: "reprioritize-task"; taskId: string; priority: "high" }
  | { type: "reschedule-task"; taskId: string; shiftWorkingDays: number };

export type Recommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  people: string[];
  project: string;
  text: string;
  applyText: string;
  action: RecommendationAction;
};

function nextActionFor(store: Store, projectId: string) {
  const active = store
    .tasksFor(projectId)
    .filter((tk) => tk.status !== "done")
    .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime());
  if (!active.length) return null;
  return active.find((tk) => tk.status === "blocked") || active[0];
}

export function generateRecommendations(
  store: Store,
  scopePersonId?: string | null,
  thresholds?: WorkloadThresholds
): Recommendation[] {
  const recs: Recommendation[] = [];
  const capRoster = store.capacityRoster().map((p) => ({ person: p, cap: computeCapacity(p.id, store, thresholds) }));
  let counter = 0;
  const push = (rec: Omit<Recommendation, "id">) => {
    recs.push({ id: `rec_${counter++}_${rec.action.type}`, ...rec });
  };

  // 1) Overloaded people -> reassign a not-started task to someone with spare capacity
  capRoster
    .filter((r) => r.cap.band === "overloaded")
    .forEach((r) => {
      const candidateTask = store.data.tasks
        .filter((tk) => tk.assignee_id === r.person.id && tk.status === "not-started")
        .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0];
      const available = capRoster
        .filter((o) => o.person.id !== r.person.id && o.cap.band === "available")
        .sort((a, b) => (a.cap.pct ?? 0) - (b.cap.pct ?? 0))[0];
      if (candidateTask && available) {
        push({
          severity: "high",
          people: [r.person.id, available.person.id],
          project: candidateTask.project_id,
          text: `<b>${r.person.name}</b> is overloaded (${r.cap.pct}% of capacity). Reassign <b>${candidateTask.name}</b> to <b>${available.person.name}</b>, who has capacity to spare (${available.cap.pct}%).`,
          applyText: `Reassign "${candidateTask.name}" from ${r.person.name} to ${available.person.name}.`,
          action: { type: "reassign-task", taskId: candidateTask.id, toPersonId: available.person.id },
        });
      }
    });

  // 2) Overloaded/needs-support owner on a solo in-progress task -> add support
  capRoster
    .filter((r) => r.cap.band === "overloaded" || r.cap.band === "needs-support")
    .forEach((r) => {
      const heavyTask = store.data.tasks
        .filter((tk) => tk.assignee_id === r.person.id && tk.status === "in-progress" && !tk.assignee2_id)
        .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0];
      if (!heavyTask) return;
      const helper = capRoster
        .filter(
          (o) =>
            o.person.id !== r.person.id &&
            ["available", "balanced"].includes(o.cap.band) &&
            !store.isAssignedTo(heavyTask, o.person.id)
        )
        .sort((a, b) => (a.cap.pct ?? 0) - (b.cap.pct ?? 0))[0];
      if (helper) {
        push({
          severity: "medium",
          people: [r.person.id, helper.person.id],
          project: heavyTask.project_id,
          text: `<b>${heavyTask.name}</b> is running heavy for <b>${r.person.name}</b>. Add <b>${helper.person.name}</b> as support (${helper.cap.pct}% capacity used).`,
          applyText: `Add ${helper.person.name} as a second assignee on "${heavyTask.name}".`,
          action: { type: "add-support", taskId: heavyTask.id, toPersonId: helper.person.id },
        });
      }
    });

  // 3) Blocked projects with a logged, owned blocker -> escalate urgency
  store.data.projects.forEach((p) => {
    const tasks = store.tasksFor(p.id);
    if (computeHealth(p, tasks, store.data.blockers) !== "blocked") return;
    const openB = openBlockersFor(p.id, store.data.blockers)[0];
    if (openB && openB.urgency !== "high") {
      push({
        severity: "high",
        people: [openB.owner_id].filter((x): x is string => !!x),
        project: p.id,
        text: `<b>${p.name}</b> is blocked — "${openB.title}". ${openB.action_needed}`,
        applyText: `Mark this blocker as high urgency so it surfaces for immediate attention.`,
        action: { type: "escalate-blocker", blockerId: openB.id },
      });
    }
  });

  // 4) Deadline close + progress low -> bump the project's next task to high priority
  store.data.projects.forEach((p) => {
    const tasks = store.tasksFor(p.id);
    const pct = projectProgress(p, tasks);
    const daysToEnd = p.end_date ? dayDiff(today(), fromISO(p.end_date)) : 9999;
    if (daysToEnd >= 0 && daysToEnd <= 14 && pct < 60 && computeHealth(p, tasks, store.data.blockers) !== "blocked") {
      const next = nextActionFor(store, p.id);
      if (next && next.priority !== "high" && p.owner_id) {
        push({
          severity: "medium",
          people: [p.owner_id],
          project: p.id,
          text: `<b>${p.name}</b> is due in ${daysToEnd} day${daysToEnd === 1 ? "" : "s"} at only ${pct}% progress. Raise the priority on <b>${next.name}</b> so it gets attention now.`,
          applyText: `Set the priority of "${next.name}" to High.`,
          action: { type: "reprioritize-task", taskId: next.id, priority: "high" },
        });
      }
    }
  });

  // 5) Tasks due very soon still at medium/low priority for someone under urgent-task pressure
  capRoster
    .filter((r) => r.cap.reasons.some((rs) => rs.tag === "urgent"))
    .forEach((r) => {
      const soonTask = store.data.tasks
        .filter((tk) => {
          const d = dayDiff(today(), fromISO(tk.due_date));
          return store.isAssignedTo(tk, r.person.id) && tk.status !== "done" && tk.priority !== "high" && d >= 0 && d <= 3;
        })
        .sort((a, b) => fromISO(a.due_date).getTime() - fromISO(b.due_date).getTime())[0];
      if (soonTask) {
        push({
          severity: "medium",
          people: [r.person.id],
          project: soonTask.project_id,
          text: `<b>${r.person.name}</b> has several urgent deadlines close together. Raise <b>${soonTask.name}</b> to High priority so it's not missed.`,
          applyText: `Set the priority of "${soonTask.name}" to High.`,
          action: { type: "reprioritize-task", taskId: soonTask.id, priority: "high" },
        });
      }
    });

  // 6) A not-started task colliding with 3+ other tasks for the same person -> reschedule
  capRoster.forEach((r) => {
    const dayCounts: Record<string, number> = {};
    store.data.tasks
      .filter((tk) => store.isAssignedTo(tk, r.person.id) && tk.status !== "done")
      .forEach((tk) => {
        taskWorkingDays(tk).forEach((d) => {
          const k = toISO(d);
          dayCounts[k] = (dayCounts[k] || 0) + 1;
        });
      });
    const crowded = store.data.tasks.find((tk) => {
      if (tk.assignee_id !== r.person.id || tk.status !== "not-started") return false;
      const start = fromISO(tk.start_date);
      return dayDiff(today(), start) > 0 && (dayCounts[toISO(start)] || 0) >= 3;
    });
    if (crowded) {
      const start = fromISO(crowded.start_date);
      push({
        severity: "low",
        people: [r.person.id],
        project: crowded.project_id,
        text: `<b>${crowded.name}</b> is scheduled to start on a day <b>${r.person.name}</b> already has ${dayCounts[toISO(start)]} other tasks running. Push the start date out by 3 working days.`,
        applyText: `Move the start date of "${crowded.name}" out by 3 working days.`,
        action: { type: "reschedule-task", taskId: crowded.id, shiftWorkingDays: 3 },
      });
    }
  });

  const seen = new Set<string>();
  const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const unique = recs
    .filter((r) => {
      if (seen.has(r.text)) return false;
      seen.add(r.text);
      return true;
    })
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  if (scopePersonId) {
    return unique.filter((r) => r.people.includes(scopePersonId));
  }
  return unique;
}
