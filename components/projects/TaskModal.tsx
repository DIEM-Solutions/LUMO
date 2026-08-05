"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createTask, deleteTask, updateTask } from "@/app/(portal)/projects/actions";
import { addDays, toISO, today } from "@/lib/domain/dates";
import type { Person, Priority, Project, Task, TaskStatus } from "@/lib/types";

const STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In Progress",
  done: "Done",
  blocked: "Blocked",
};
const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export function TaskModal({
  open,
  onClose,
  task,
  people,
  projects,
  presetProjectId,
  presetPersonId,
  forceStatus,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  people: Person[];
  projects: Project[];
  presetProjectId?: string;
  presetPersonId?: string;
  forceStatus?: TaskStatus;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(task?.name ?? "");
  const [projectId, setProjectId] = useState(task?.project_id ?? presetProjectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? presetPersonId ?? people[0]?.id ?? "");
  const [assignee2Id, setAssignee2Id] = useState(task?.assignee2_id ?? "");
  const [status, setStatus] = useState<TaskStatus>(forceStatus ?? task?.status ?? "not-started");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? toISO(addDays(today(), 7)));
  const [weight, setWeight] = useState(task?.weight ?? 10);
  const [startDate, setStartDate] = useState(task?.start_date ?? toISO(today()));
  const [workloadDays, setWorkloadDays] = useState(task?.workload_days ?? 1);
  const [includeWeekends, setIncludeWeekends] = useState(task?.include_weekends ?? false);
  const [blockerReason, setBlockerReason] = useState(task?.blocker_reason ?? "");
  const [approvalPersonId, setApprovalPersonId] = useState(task?.approval_person_id ?? "");
  const [dependency, setDependency] = useState(task?.dependency ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError("Give the task a name.");
      return;
    }
    if (status === "blocked" && !blockerReason.trim()) {
      setError("Add a blocker reason, or choose a different status.");
      return;
    }
    setSaving(true);
    const input = {
      name: name.trim(),
      projectId,
      assigneeId,
      assignee2Id: assignee2Id || null,
      status,
      priority,
      dueDate,
      weight: Math.max(0, Math.min(100, weight)),
      startDate,
      workloadDays: Math.max(0.5, workloadDays),
      includeWeekends,
      blockerReason,
      approvalPersonId: approvalPersonId || null,
      dependency: dependency.trim(),
      notes: notes.trim(),
    };
    try {
      if (task) {
        await updateTask(task.id, input);
        toast("Task updated");
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
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          {task ? (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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
          <label>Weight (% of project)</label>
          <input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(+e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Estimated workload (working days)</label>
          <input type="number" min={0.5} step={0.5} value={workloadDays} onChange={(e) => setWorkloadDays(+e.target.value)} />
        </div>
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
      <div className="field">
        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context worth logging" />
      </div>
    </Modal>
  );
}
