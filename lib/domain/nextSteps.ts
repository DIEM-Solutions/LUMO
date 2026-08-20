import type { Task } from "@/lib/types";
import { dayDiff, fromISO, today } from "./dates";
import type { Store } from "./store";

export type NextStep = {
  task: Task;
  id: string;
  action: string;
  taskName: string;
  project: string;
  assignee: string | null;
  assignee2: string | null;
  due: Date;
  priority: Task["priority"];
  status: Task["status"];
  overdue: boolean;
  blocked: boolean;
  remainingHours: number | null;
  dependency: string;
  approvalPerson: string | null;
  waitingApproval: boolean;
  waitingInfo: boolean;
};

const PRI_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function computeNextSteps(store: Store, scopePersonId?: string | null): NextStep[] {
  const active = store.data.tasks.filter((tk) => tk.status !== "done");
  const steps: NextStep[] = active.map((tk) => {
    const due = fromISO(tk.due_date);
    const overdue = dayDiff(today(), due) < 0;
    const waitingApproval = !!tk.approval_person_id;
    const waitingInfo = !!tk.dependency && tk.status !== "blocked";
    return {
      task: tk,
      id: tk.id,
      action: tk.next_step || tk.name,
      taskName: tk.name,
      project: tk.project_id,
      assignee: tk.assignee_id,
      assignee2: tk.assignee2_id,
      due,
      priority: tk.priority,
      status: tk.status,
      overdue,
      blocked: tk.status === "blocked",
      remainingHours: tk.remaining_hours != null ? tk.remaining_hours : tk.workload_hours,
      dependency: tk.status === "blocked" ? tk.blocker_reason : tk.dependency || "",
      approvalPerson: tk.approval_person_id,
      waitingApproval,
      waitingInfo,
    };
  });

  steps.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (PRI_RANK[a.priority] !== PRI_RANK[b.priority]) return PRI_RANK[a.priority] - PRI_RANK[b.priority];
    return a.due.getTime() - b.due.getTime();
  });

  if (!scopePersonId) return steps;
  return steps.filter(
    (s) => s.assignee === scopePersonId || s.assignee2 === scopePersonId || s.approvalPerson === scopePersonId
  );
}
