import type { Project, Task, WorkloadThresholds } from "@/lib/types";
import { computeCapacity } from "./capacity";
import { dayDiff, fromISO, today } from "./dates";
import { computeHealth, projectElapsedPct } from "./health";
import { computeNextSteps } from "./nextSteps";
import { projectProgress } from "./progress";
import { computeStage } from "./stage";
import type { Store } from "./store";

export type NeedsAttentionItem = {
  severity: "critical" | "warning";
  kind: "project" | "person" | "approval" | "task" | "mention";
  ref: string;
  projectId?: string;
  title: string;
  why: string;
  impact: string;
  action: string;
};

const SEV_RANK: Record<string, number> = { critical: 0, warning: 1 };

/** Shared project-risk read used by both "my priorities" and the company overview. */
function projectRisk(store: Store, p: Project): { why: string; impact: string; severity: "critical" | "warning" } | null {
  const tasks = store.tasksFor(p.id);
  const health = computeHealth(p, tasks, store.data.blockers);
  const stage = computeStage(p, tasks);
  const pct = projectProgress(p, tasks);
  const blockedCt = tasks.filter((tk) => tk.status === "blocked").length;
  const overdueCt = tasks.filter((tk) => tk.status !== "done" && dayDiff(today(), fromISO(tk.due_date)) < 0).length;
  const daysToEnd = p.end_date ? dayDiff(today(), fromISO(p.end_date)) : 9999;
  const impactLabel = p.type === "client" ? "Client delivery at risk" : "Internal delivery at risk";

  if (health === "blocked") {
    return { severity: "critical", why: `${blockedCt} blocked task${blockedCt === 1 ? "" : "s"}`, impact: impactLabel };
  }
  if (health === "at-risk") {
    const why = daysToEnd >= 0 ? `${daysToEnd}d to deadline at ${pct}% complete` : `${-daysToEnd}d past due at ${pct}% complete`;
    return { severity: "warning", why, impact: impactLabel };
  }
  if (overdueCt > 0) {
    return { severity: "warning", why: `${overdueCt} overdue task${overdueCt === 1 ? "" : "s"}`, impact: "Deadline slipping" };
  }
  if (stage !== "done") {
    const gap = projectElapsedPct(p) - pct;
    if (gap >= 30) {
      return { severity: gap >= 45 ? "critical" : "warning", why: `progress trailing timeline by ${gap}pt`, impact: "Behind schedule" };
    }
  }
  if (daysToEnd >= 0 && daysToEnd <= 7 && stage !== "done") {
    return { severity: "warning", why: `Due in ${daysToEnd}d`, impact: "Upcoming deadline" };
  }
  return null;
}

/**
 * What does this specific person personally need to know, review, decide,
 * or act on? Every item here requires real involvement — ownership, team
 * membership, being the assignee/approver, or being @mentioned. General
 * company-wide risk (an overloaded teammate, a project you have nothing to
 * do with) belongs in buildCompanyOverview instead, never here.
 */
export function buildNeedsAttention(
  store: Store,
  ceoId: string | null,
  thresholds?: WorkloadThresholds,
  dismissedKeys?: Set<string>
): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];
  if (!ceoId) return items;

  const myTasks = store.data.tasks.filter((tk) => store.isAssignedTo(tk, ceoId));

  // 1. Overdue actions assigned to me
  myTasks.forEach((tk: Task) => {
    if (tk.status === "done") return;
    const d = dayDiff(today(), fromISO(tk.due_date));
    if (d >= 0) return;
    const proj = store.projectById(tk.project_id);
    items.push({
      severity: "critical",
      kind: "task",
      ref: tk.id,
      projectId: tk.project_id,
      title: tk.name,
      why: `${-d}d overdue`,
      impact: proj ? proj.name : "",
      action: "Finish or reassign",
    });
  });

  // 2. Items requiring my approval or decision
  computeNextSteps(store, null)
    .filter((s) => s.approvalPerson === ceoId && (!s.task.approval_decision || s.task.approval_decision.status === "info-requested"))
    .forEach((s) => {
      const proj = store.projectById(s.project);
      items.push({
        severity: s.overdue ? "critical" : "warning",
        kind: "approval",
        ref: s.id,
        projectId: s.project,
        title: s.action,
        why: "Waiting for your approval",
        impact: proj ? proj.name : "",
        action: "Approve, reject or request info",
      });
    });

  // 3. Tasks due soon
  myTasks.forEach((tk: Task) => {
    if (tk.status === "done") return;
    const d = dayDiff(today(), fromISO(tk.due_date));
    if (d < 0 || d > 3) return;
    const proj = store.projectById(tk.project_id);
    items.push({
      severity: "warning",
      kind: "task",
      ref: `due-${tk.id}`,
      projectId: tk.project_id,
      title: tk.name,
      why: d === 0 ? "Due today" : `Due in ${d}d`,
      impact: proj ? proj.name : "",
      action: "Review",
    });
  });

  // 4. Notes or updates mentioning me
  store.data.tasks.forEach((tk: Task) => {
    if (!tk.notes_mentioned_ids?.includes(ceoId)) return;
    const proj = store.projectById(tk.project_id);
    items.push({
      severity: "warning",
      kind: "mention",
      ref: `mention-${tk.id}`,
      projectId: tk.project_id,
      title: tk.name,
      why: "You were mentioned in a note",
      impact: proj ? proj.name : "",
      action: "Read the note",
    });
  });

  // 5 & 6. Important changes / upcoming deadlines on projects I'm involved in
  store.projectsForPerson(ceoId).forEach((p) => {
    const risk = projectRisk(store, p);
    if (!risk) return;
    items.push({
      severity: risk.severity,
      kind: "project",
      ref: p.id,
      projectId: p.id,
      title: p.name,
      why: risk.why,
      impact: risk.impact,
      action: "Review",
    });
  });

  const visible = dismissedKeys ? items.filter((i) => !dismissedKeys.has(`${i.kind}:${i.ref}`)) : items;
  return visible.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}

/**
 * Company-wide signals that aren't necessarily anyone's personal
 * responsibility -- an overloaded teammate, a project at risk regardless
 * of who's on it. Shown separately from personal priorities, never mixed
 * into them.
 */
export function buildCompanyOverview(store: Store, thresholds?: WorkloadThresholds): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];

  store.data.projects.forEach((p) => {
    const risk = projectRisk(store, p);
    if (!risk) return;
    const owner = store.personById(p.owner_id);
    items.push({
      severity: risk.severity,
      kind: "project",
      ref: p.id,
      projectId: p.id,
      title: p.name,
      why: risk.why,
      impact: risk.impact,
      action: `Review with ${owner ? owner.name.split(" ")[0] : "the owner"}`,
    });
  });

  store.capacityRoster().forEach((person) => {
    const cap = computeCapacity(person.id, store, thresholds);
    if (cap.status === "overloaded") {
      items.push({
        severity: "critical",
        kind: "person",
        ref: person.id,
        title: `${person.name} is overloaded`,
        why: `${cap.pct}% of capacity`,
        impact: cap.reasons[0]?.label || "Risk of missed deadlines",
        action: "Reallocate a task",
      });
    }
  });

  return items.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}
