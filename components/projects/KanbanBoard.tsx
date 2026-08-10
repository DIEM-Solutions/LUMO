"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { setTaskStatus } from "@/app/(portal)/projects/actions";
import { dayDiff, fromISO, today } from "@/lib/domain/dates";
import type { Person, Project, Task, TaskStatus, TaskStatusLabels } from "@/lib/types";

const DEFAULT_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const KANBAN_COL_META: { status: TaskStatus; color: string }[] = [
  { status: "not-started", color: "var(--stage-ns-fg)" },
  { status: "in-progress", color: "var(--stage-prog-fg)" },
  { status: "done", color: "var(--stage-done-fg)" },
  { status: "blocked", color: "var(--health-blocked)" },
];

function dueLabel(due: Date) {
  const d = dayDiff(today(), due);
  if (d < 0) return { text: `${-d}d overdue`, overdue: true };
  if (d === 0) return { text: "Due today", overdue: false };
  return { text: `${d}d left`, overdue: false };
}

export function KanbanBoard({
  tasks,
  people,
  projects,
  onOpenTask,
  onNeedsBlockerReason,
  statusLabels,
}: {
  tasks: Task[];
  people: Person[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
  onNeedsBlockerReason: (task: Task) => void;
  statusLabels?: TaskStatusLabels;
}) {
  const router = useRouter();
  const toast = useToast();
  const dragTaskId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const personById = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const projectById = (id: string) => projects.find((p) => p.id === id) ?? null;
  const labelFor = (status: TaskStatus) => statusLabels?.[status] ?? DEFAULT_STATUS_LABEL[status];
  const KANBAN_COLS = KANBAN_COL_META.map((c) => ({ ...c, label: labelFor(c.status) }));

  async function handleDrop(status: TaskStatus) {
    setDragOverCol(null);
    const task = tasks.find((t) => t.id === dragTaskId.current);
    if (!task) return;
    if (status === "blocked" && !task.blocker_reason) {
      onNeedsBlockerReason(task);
      return;
    }
    await setTaskStatus(task.id, status);
    toast(`Moved to ${labelFor(status)}`);
    router.refresh();
  }

  return (
    <div className="kanban-scroll-wrap">
      <div className="kanban-scroll">
        <div className="kanban-board">
          {KANBAN_COLS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className={`kanban-col${dragOverCol === col.status ? " dragover" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.status);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col.status);
                }}
              >
                <div className="kanban-col-head">
                  <div className="kanban-col-title">
                    <span className="kdot" style={{ background: col.color }} />
                    {col.label}
                  </div>
                  <span className="kanban-col-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map((tk) => {
                    const d = dueLabel(fromISO(tk.due_date));
                    const proj = projectById(tk.project_id);
                    return (
                      <div
                        key={tk.id}
                        className="kanban-card"
                        draggable
                        onClick={() => onOpenTask(tk)}
                        onDragStart={() => {
                          dragTaskId.current = tk.id;
                        }}
                      >
                        <div className="kc-proj">{proj?.name ?? ""}</div>
                        <div className="kc-name">{tk.name}</div>
                        <div className="kc-foot">
                          <div className="kc-people">
                            <Avatar person={personById(tk.assignee_id)} size="sm" />
                            {tk.assignee2_id && <Avatar person={personById(tk.assignee2_id)} size="sm" />}
                          </div>
                          <span className={`kc-due${d.overdue ? " overdue" : ""}`}>{d.text}</span>
                        </div>
                        <div className="kc-tags">
                          <span className={`tag priority-${tk.priority}`}>{tk.priority}</span>
                          <span className="tag" style={{ background: "var(--bg-deep)", color: "var(--ink-soft)" }}>
                            {tk.weight}% wt
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
