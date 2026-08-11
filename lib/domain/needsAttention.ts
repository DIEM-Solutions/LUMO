import type { WorkloadThresholds } from "@/lib/types";
import { computeCapacity } from "./capacity";
import { dayDiff, fromISO, today } from "./dates";
import { computeHealth, projectElapsedPct } from "./health";
import { computeNextSteps } from "./nextSteps";
import { projectProgress } from "./progress";
import { computeStage } from "./stage";
import type { Store } from "./store";

export type NeedsAttentionItem = {
  severity: "critical" | "warning";
  kind: "project" | "person" | "approval";
  ref: string;
  projectId?: string;
  title: string;
  why: string;
  impact: string;
  action: string;
};

const SEV_RANK: Record<string, number> = { critical: 0, warning: 1 };

/**
 * Phase-1 scope: projects (health/overdue/behind-schedule), overloaded people,
 * and pending task approvals — the entities already live in this pass. Decisions,
 * support requests and day-off requests join this list once those pages ship.
 */
export function buildNeedsAttention(
  store: Store,
  ceoId: string | null,
  thresholds?: WorkloadThresholds,
  dismissedKeys?: Set<string>
): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];

  store.data.projects.forEach((p) => {
    const tasks = store.tasksFor(p.id);
    const health = computeHealth(p, tasks, store.data.blockers);
    const stage = computeStage(p, tasks);
    const pct = projectProgress(p, tasks);
    const blockedCt = tasks.filter((tk) => tk.status === "blocked").length;
    const overdueCt = tasks.filter((tk) => tk.status !== "done" && dayDiff(today(), fromISO(tk.due_date)) < 0).length;
    const daysToEnd = p.end_date ? dayDiff(today(), fromISO(p.end_date)) : 9999;
    const owner = store.personById(p.owner_id);
    const impactLabel = p.type === "client" ? "Client delivery at risk" : "Internal delivery at risk";

    let why: string | null = null;
    let impact: string | null = null;
    let severity: "critical" | "warning" | null = null;

    if (health === "blocked") {
      severity = "critical";
      why = `${blockedCt} blocked task${blockedCt === 1 ? "" : "s"}`;
      impact = impactLabel;
    } else if (health === "at-risk") {
      severity = "warning";
      why = daysToEnd >= 0 ? `${daysToEnd}d to deadline at ${pct}% complete` : `${-daysToEnd}d past due at ${pct}% complete`;
      impact = impactLabel;
    } else if (overdueCt > 0) {
      severity = "warning";
      why = `${overdueCt} overdue task${overdueCt === 1 ? "" : "s"}`;
      impact = "Deadline slipping";
    } else if (stage !== "done") {
      const gap = projectElapsedPct(p) - pct;
      if (gap >= 30) {
        severity = gap >= 45 ? "critical" : "warning";
        why = `progress trailing timeline by ${gap}pt`;
        impact = "Behind schedule";
      }
    }

    if (why && severity) {
      items.push({
        severity,
        kind: "project",
        ref: p.id,
        projectId: p.id,
        title: p.name,
        why,
        impact: impact ?? "",
        action: `Review with ${owner ? owner.name.split(" ")[0] : "the owner"}`,
      });
    }
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

  if (ceoId) {
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
  }

  const visible = dismissedKeys ? items.filter((i) => !dismissedKeys.has(`${i.kind}:${i.ref}`)) : items;
  return visible.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}
