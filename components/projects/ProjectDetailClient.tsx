"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { computeHealth } from "@/lib/domain/health";
import { projectProgress } from "@/lib/domain/progress";
import { computeStage } from "@/lib/domain/stage";
import { createStore, type PortalData } from "@/lib/domain/store";
import { fmt, fromISO } from "@/lib/domain/dates";
import {
  Avatar,
  AvatarStack,
  Card,
  HealthFlag,
  PriorityTag,
  RunwayBar,
  StagePill,
  TaskStatusPill,
  TypeTag,
  UrgencyDot,
} from "@/components/ui/primitives";
import { ProjectModal } from "./ProjectModal";
import { TaskModal } from "./TaskModal";
import { BlockerModal } from "./BlockerModal";
import { MentionText } from "./MentionText";
import { useToast } from "@/components/ui/Toast";
import { setTaskStatus } from "@/app/(portal)/projects/actions";
import type { Blocker, Task, TaskStatus, TaskStatusLabels } from "@/lib/types";

function TaskRow({
  tk,
  store,
  taskStatusLabels,
  pending,
  onToggle,
  onOpen,
  subtaskCount,
  indent,
}: {
  tk: Task;
  store: ReturnType<typeof createStore>;
  taskStatusLabels: TaskStatusLabels;
  pending: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onOpen: () => void;
  subtaskCount?: number;
  indent?: boolean;
}) {
  const assignee = store.personById(tk.assignee_id);
  const assignee2 = store.personById(tk.assignee2_id);
  return (
    <div className="card" style={{ cursor: "pointer", padding: indent ? 14 : undefined }} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <button
            type="button"
            className={`task-check${tk.status === "done" ? " checked" : ""}`}
            onClick={onToggle}
            disabled={pending}
            aria-label={tk.status === "done" ? "Mark as not started" : "Mark as complete"}
            title={tk.status === "done" ? "Mark as not started" : "Mark as complete"}
          >
            {tk.status === "done" && (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none">
                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: indent ? 13 : 14,
                textDecoration: tk.status === "done" ? "line-through" : "none",
                opacity: tk.status === "done" ? 0.6 : 1,
              }}
            >
              {tk.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
              Due {fmt(fromISO(tk.due_date))} · {tk.weight}% weight
              {subtaskCount ? ` · ${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="kc-people">
            <Avatar person={assignee} size="sm" />
            {assignee2 && <Avatar person={assignee2} size="sm" />}
          </div>
          <TaskStatusPill status={tk.status} labels={taskStatusLabels} />
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailClient({
  data,
  projectId,
  canEdit,
  projectCategories,
  taskStatusLabels,
}: {
  data: PortalData;
  projectId: string;
  canEdit: boolean;
  projectCategories: string[];
  taskStatusLabels: TaskStatusLabels;
}) {
  const router = useRouter();
  const toast = useToast();
  const store = useMemo(() => createStore(data), [data]);
  const project = store.projectById(projectId)!;
  const tasks = store.tasksFor(projectId);
  const topLevelTasks = store.topLevelTasksFor(projectId);
  const blockers = data.blockers.filter((b) => b.project_id === projectId);
  const notedTasks = tasks.filter((tk) => tk.notes && tk.notes.trim().length > 0);
  const team = (project.team_ids ?? []).map((id) => store.personById(id)).filter(Boolean);
  const owner = store.personById(project.owner_id);

  const stage = computeStage(project, tasks);
  const health = computeHealth(project, tasks, data.blockers);
  const pct = projectProgress(project, tasks);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [showResolvedBlockers, setShowResolvedBlockers] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());

  const openBlockers = blockers.filter((b) => b.status === "open");
  const resolvedBlockers = blockers.filter((b) => b.status === "resolved");

  async function handleToggleTaskDone(tk: Task, e: React.MouseEvent) {
    e.stopPropagation();
    const nextStatus: TaskStatus = tk.status === "done" ? "not-started" : "done";
    setPendingTaskIds((s) => new Set(s).add(tk.id));
    try {
      await setTaskStatus(tk.id, nextStatus);
      router.refresh();
    } catch {
      toast("Couldn't update task");
    } finally {
      setPendingTaskIds((s) => {
        const next = new Set(s);
        next.delete(tk.id);
        return next;
      });
    }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/projects" className="linklike">← Back to Projects & Tasks</Link>
      </div>

      <Card>
        <div className="pc-top">
          <div className="tags">
            <TypeTag type={project.type} />
            <PriorityTag priority={project.priority} />
          </div>
          {canEdit && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProjectModalOpen(true)}>
              Edit project
            </button>
          )}
        </div>
        <h2 style={{ marginTop: 11 }}>{project.name}</h2>
        <div className="pc-sub">{owner?.name ?? ""} · Owner{project.client ? ` · ${project.client}` : project.category ? ` · ${project.category}` : ""}</div>
        <div className="pc-row2" style={{ marginTop: 12 }}>
          <StagePill stage={stage} />
          <HealthFlag health={health} />
        </div>
        <div className="pc-people" style={{ marginTop: 12 }}>
          <AvatarStack people={team} />
        </div>
        <div className="runway">
          <div className="runway-labels">
            <span>Progress</span>
            <span className="pct">{pct}%</span>
          </div>
          <RunwayBar pct={pct} stage={stage} />
        </div>
        <div className="pc-meta">
          <span>
            {project.start_date ? fmt(fromISO(project.start_date)) : "—"} → {project.end_date ? fmt(fromISO(project.end_date)) : "—"}
          </span>
        </div>
        {project.next_deliverable && stage !== "done" && (
          <div className="pc-stat-row">
            <span className="pc-stat">🎯 Next: {project.next_deliverable}</span>
          </div>
        )}
      </Card>

      <div className="section-block" style={{ marginTop: 24 }}>
        <div className="panel-head-row">
          <h2>Tasks ({tasks.length})</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingTask(null);
              setTaskModalOpen(true);
            }}
          >
            + Add task
          </button>
        </div>
        {topLevelTasks.length ? (
          <div className="stack-gap">
            {topLevelTasks.map((tk) => {
              const subtasks = store.subtasksFor(tk.id);
              return (
                <div key={tk.id}>
                  <TaskRow
                    tk={tk}
                    store={store}
                    taskStatusLabels={taskStatusLabels}
                    pending={pendingTaskIds.has(tk.id)}
                    onToggle={(e) => handleToggleTaskDone(tk, e)}
                    onOpen={() => {
                      setEditingTask(tk);
                      setTaskModalOpen(true);
                    }}
                    subtaskCount={subtasks.length}
                  />
                  {subtasks.length > 0 && (
                    <div className="stack-gap" style={{ gap: 8, marginTop: 8, marginLeft: 30 }}>
                      {subtasks.map((sub) => (
                        <TaskRow
                          key={sub.id}
                          tk={sub}
                          store={store}
                          taskStatusLabels={taskStatusLabels}
                          pending={pendingTaskIds.has(sub.id)}
                          onToggle={(e) => handleToggleTaskDone(sub, e)}
                          onOpen={() => {
                            setEditingTask(sub);
                            setTaskModalOpen(true);
                          }}
                          indent
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Card><div className="empty-state">No tasks yet.</div></Card>
        )}
      </div>

      {notedTasks.length > 0 && (
        <div className="section-block" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Notes</h2>
          <div className="stack-gap">
            {notedTasks.map((tk) => (
              <div className="card" key={tk.id}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{tk.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                  <MentionText text={tk.notes} people={data.people} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {blockers.length > 0 && (
        <div className="section-block" style={{ marginTop: 24 }}>
          <div className="panel-head-row">
            <h2 style={{ fontSize: 18 }}>Blockers</h2>
            {resolvedBlockers.length > 0 && (
              <button className="linklike" onClick={() => setShowResolvedBlockers((v) => !v)}>
                {showResolvedBlockers ? "Hide" : "Show"} {resolvedBlockers.length} resolved
              </button>
            )}
          </div>
          {openBlockers.length === 0 && !showResolvedBlockers && (
            <div className="empty-state">No open blockers on this project.</div>
          )}
          {(showResolvedBlockers ? blockers : openBlockers).map((b) => (
            <div
              className={`blocker-card urgency-${b.urgency} status-${b.status}`}
              key={b.id}
              style={{ cursor: "pointer" }}
              onClick={() => setEditingBlocker(b)}
            >
              <div className="blocker-head">
                <div>
                  <div className="blocker-title">
                    {b.title}
                    {b.status === "resolved" && <span style={{ marginLeft: 8, fontWeight: 600, fontSize: 11 }}>· Resolved</span>}
                  </div>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700 }}>
                  <UrgencyDot urgency={b.urgency} /> {b.urgency}
                </span>
              </div>
              <div className="blocker-grid">
                <div className="blocker-field">
                  <div className="bf-lbl">Cause</div>
                  <div className="bf-val">{b.cause || "—"}</div>
                </div>
                <div className="blocker-field">
                  <div className="bf-lbl">Impact</div>
                  <div className="bf-val">{b.impact || "—"}</div>
                </div>
                <div className="blocker-field span2">
                  <div className="bf-lbl">Action needed</div>
                  <div className="bf-val">{b.action_needed || "—"}</div>
                </div>
              </div>
              <div className="field-hint" style={{ marginTop: 8 }}>Click to edit or resolve</div>
            </div>
          ))}
        </div>
      )}

      {projectModalOpen && (
        <ProjectModal
          onClose={() => setProjectModalOpen(false)}
          project={project}
          people={data.people}
          projectCategories={projectCategories}
        />
      )}
      {taskModalOpen && (
        <TaskModal
          onClose={() => setTaskModalOpen(false)}
          task={editingTask}
          people={data.people}
          projects={data.projects}
          allTasks={data.tasks}
          presetProjectId={projectId}
          statusLabels={taskStatusLabels}
        />
      )}
      {editingBlocker && (
        <BlockerModal onClose={() => setEditingBlocker(null)} blocker={editingBlocker} people={data.people} />
      )}
    </>
  );
}
