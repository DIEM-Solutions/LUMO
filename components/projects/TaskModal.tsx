"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createTask, deleteTask, updateTask } from "@/app/(portal)/projects/actions";
import { addDays, toISO, today } from "@/lib/domain/dates";
import { MentionTextarea } from "./MentionTextarea";
import type { Person, Priority, Project, Task, TaskStatus, TaskStatusLabels } from "@/lib/types";

const DEFAULT_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In Progress",
  done: "Done",
  blocked: "Blocked",
};
const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export function TaskModal({
  onClose,
  task,
  people,
  projects,
  allTasks,
  presetProjectId,
  presetPersonId,
  presetParentTaskId,
  forceStatus,
  statusLabels,
}: {
  onClose: () => void;
  task: Task | null;
  people: Person[];
  projects: Project[];
  allTasks: Task[];
  presetProjectId?: string;
  presetPersonId?: string;
  presetParentTaskId?: string;
  forceStatus?: TaskStatus;
  statusLabels?: TaskStatusLabels;
}) {
  const STATUS_LABEL: Record<TaskStatus, string> = {
    "not-started": statusLabels?.["not-started"] ?? DEFAULT_STATUS_LABEL["not-started"],
    "in-progress": statusLabels?.["in-progress"] ?? DEFAULT_STATUS_LABEL["in-progress"],
    done: statusLabels?.done ?? DEFAULT_STATUS_LABEL.done,
    blocked: statusLabels?.blocked ?? DEFAULT_STATUS_LABEL.blocked,
  };
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(task?.name ?? "");
  const [projectId, setProjectId] = useState(task?.project_id ?? presetProjectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? presetPersonId ?? people[0]?.id ?? "");
  const [assignee2Id, setAssignee2Id] = useState(task?.assignee2_id ?? "");
  const [status, setStatus] = useState<TaskStatus>(forceStatus ?? task?.status ?? "not-started");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? toISO(addDays(today(), 7)));
  const [startDate, setStartDate] = useState(task?.start_date ?? toISO(today()));
  const [workloadHours, setWorkloadHours] = useState(task?.workload_hours ?? 8);
  const [includeWeekends, setIncludeWeekends] = useState(task?.include_weekends ?? false);
  const [blockerReason, setBlockerReason] = useState(task?.blocker_reason ?? "");
  const [approvalPersonId, setApprovalPersonId] = useState(task?.approval_person_id ?? "");
  const [dependency, setDependency] = useState(task?.dependency ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [parentTaskId, setParentTaskId] = useState(task?.parent_task_id ?? presetParentTaskId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // A task can be a parent (has subtasks under it) or a subtask (has a
  // parent) but not both -- keeps the hierarchy to one level, which covers
  // "split into as many parts as needed" without open-ended nesting.
  const parentOptions = allTasks.filter(
    (t) => t.project_id === projectId && t.id !== task?.id && !t.parent_task_id
  );
  const hasSubtasks = !!task && allTasks.some((t) => t.parent_task_id === task.id);
  const subtasks = task ? allTasks.filter((t) => t.parent_task_id === task.id) : [];

  async function handleSave(overrideStatus?: TaskStatus) {
    const effectiveStatus = overrideStatus ?? status;
    if (!name.trim()) {
      setError("Give the task a name.");
      return;
    }
    if (effectiveStatus === "blocked" && !blockerReason.trim()) {
      setError("Add a blocker reason, or choose a different status.");
      return;
    }
    setSaving(true);
    const input = {
      name: name.trim(),
      projectId,
      assigneeId,
      assignee2Id: assignee2Id || null,
      status: effectiveStatus,
      priority,
      dueDate,
      startDate,
      workloadHours: Math.max(0.5, workloadHours),
      includeWeekends,
      blockerReason,
      approvalPersonId: approvalPersonId || null,
      dependency: dependency.trim(),
      notes: notes.trim(),
      parentTaskId: hasSubtasks ? null : parentTaskId || null,
    };
    try {
      if (task) {
        await updateTask(task.id, input);
        toast(effectiveStatus === "done" ? "Task completed" : "Task updated");
      } else {
        await createTask(input);
        toast("Task created");
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleMarkComplete() {
    setStatus("done");
    handleSave("done");
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`Delete "${task.name}"?`)) return;
    setSaving(true);
    await deleteTask(task.id);
    toast("Task deleted");
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          {task ? (
            <div className="modal-foot-actions">
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
              {status !== "done" && (
                <Button variant="ghost" size="sm" onClick={handleMarkComplete} disabled={saving}>
                  ✓ Mark as Complete
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => handleSave()} disabled={saving}>
              {task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label>Task name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Draft client proposal" />
      </div>
      <div className="field">
        <label>Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Assignee</label>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Second assignee (optional)</label>
          <select value={assignee2Id} onChange={(e) => setAssignee2Id(e.target.value)}>
            <option value="">— None —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Estimated workload (hours)</label>
        <input type="number" min={0.5} step={0.5} value={workloadHours} onChange={(e) => setWorkloadHours(+e.target.value)} />
        <div className="field-hint">Also used to weight this task&apos;s share of the project&apos;s overall progress.</div>
      </div>
      <div className="field">
        <label>Include weekends in this task?</label>
        <div className="subtabs" style={{ width: "100%" }}>
          <button type="button" className={`subtab-btn${!includeWeekends ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setIncludeWeekends(false)}>
            No — skip Sat &amp; Sun
          </button>
          <button type="button" className={`subtab-btn${includeWeekends ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setIncludeWeekends(true)}>
            Yes — may use Sat &amp; Sun
          </button>
        </div>
      </div>
      {status === "blocked" && (
        <div className="field">
          <label>Blocker reason</label>
          <textarea value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} placeholder="What's blocking this task?" />
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label>Waiting for approval from (optional)</label>
          <select value={approvalPersonId} onChange={(e) => setApprovalPersonId(e.target.value)}>
            <option value="">— No approval needed —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Dependency (optional)</label>
          <input type="text" value={dependency} onChange={(e) => setDependency(e.target.value)} placeholder="e.g. Waiting on client data" />
        </div>
      </div>
      {hasSubtasks ? (
        <div className="field">
          <label>Subtasks ({subtasks.length})</label>
          <div className="field-hint">
            This task is split into {subtasks.length} subtask{subtasks.length === 1 ? "" : "s"} — each has its own assignee, status and workload. Add more anytime with &quot;+ Add task&quot;, setting this as the parent.
          </div>
        </div>
      ) : (
        <div className="field">
          <label>Parent task (optional)</label>
          <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)}>
            <option value="">— None, this is a standalone task —</option>
            {parentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="field-hint">Set this to split a task into parts — pick the task being split as the parent here.</div>
        </div>
      )}
      <div className="field">
        <label>Notes</label>
        <MentionTextarea value={notes} onChange={setNotes} people={people} placeholder="Any context worth logging — type @ to mention someone" />
      </div>
    </Modal>
  );
}
