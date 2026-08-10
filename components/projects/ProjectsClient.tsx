"use client";

import { useMemo, useState } from "react";
import { computeHealth } from "@/lib/domain/health";
import { createStore } from "@/lib/domain/store";
import type { PortalData } from "@/lib/domain/store";
import { ProjectCard } from "./ProjectCard";
import { MatrixTable } from "./MatrixTable";
import { KanbanBoard } from "./KanbanBoard";
import { ProjectModal } from "./ProjectModal";
import { TaskModal } from "./TaskModal";
import type { HealthValue, Task, TaskStatus, TaskStatusLabels, WorkloadThresholds } from "@/lib/types";

type Subtab = "overview" | "matrix" | "kanban";

export function ProjectsClient({
  data,
  canCreateProjects,
  thresholds,
  projectCategories,
  taskStatusLabels,
}: {
  data: PortalData;
  canCreateProjects: boolean;
  thresholds: WorkloadThresholds;
  projectCategories: string[];
  taskStatusLabels: TaskStatusLabels;
}) {
  const store = useMemo(() => createStore(data), [data]);

  const [subtab, setSubtab] = useState<Subtab>("overview");
  const [typeFilter, setTypeFilter] = useState<"all" | "client" | "internal">("all");
  const [healthFilter, setHealthFilter] = useState<"all" | HealthValue>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [forceStatus, setForceStatus] = useState<TaskStatus | undefined>(undefined);

  const filteredProjects = data.projects.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (healthFilter !== "all") {
      const health = computeHealth(p, store.tasksFor(p.id), data.blockers);
      if (health !== healthFilter) return false;
    }
    if (personFilter !== "all" && !((p.team_ids ?? []).includes(personFilter) || p.owner_id === personFilter)) return false;
    return true;
  });

  const healthCounts = { "on-track": 0, "at-risk": 0, blocked: 0 };
  data.projects.forEach((p) => {
    healthCounts[computeHealth(p, store.tasksFor(p.id), data.blockers)]++;
  });

  const client = filteredProjects.filter((p) => p.type === "client");
  const internal = filteredProjects.filter((p) => p.type === "internal");

  const kanbanTasks = data.tasks.filter((tk) => filteredProjects.some((p) => p.id === tk.project_id));

  const editingProject = editingProjectId ? data.projects.find((p) => p.id === editingProjectId) ?? null : null;

  return (
    <>
      <div className="panel-head-row">
        <div className="subtabs">
          <button className={`subtab-btn${subtab === "overview" ? " active" : ""}`} onClick={() => setSubtab("overview")}>
            Overview
          </button>
          <button className={`subtab-btn${subtab === "matrix" ? " active" : ""}`} onClick={() => setSubtab("matrix")}>
            Allocation Matrix
          </button>
          <button className={`subtab-btn${subtab === "kanban" ? " active" : ""}`} onClick={() => setSubtab("kanban")}>
            Kanban
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canCreateProjects && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingProjectId(null);
                setProjectModalOpen(true);
              }}
            >
              + New project
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingTask(null);
              setForceStatus(undefined);
              setTaskModalOpen(true);
            }}
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <button className={`filter-pill${typeFilter === "all" ? " active" : ""}`} onClick={() => setTypeFilter("all")}>
          All types
        </button>
        <button className={`filter-pill${typeFilter === "client" ? " active" : ""}`} onClick={() => setTypeFilter("client")}>
          Client
        </button>
        <button className={`filter-pill${typeFilter === "internal" ? " active" : ""}`} onClick={() => setTypeFilter("internal")}>
          Internal
        </button>
        <div className="filter-sep" />
        <button className={`filter-pill${healthFilter === "all" ? " active" : ""}`} onClick={() => setHealthFilter("all")}>
          All health
        </button>
        <button className={`filter-pill${healthFilter === "on-track" ? " active" : ""}`} onClick={() => setHealthFilter("on-track")}>
          On track <span className="cnt">{healthCounts["on-track"]}</span>
        </button>
        <button className={`filter-pill${healthFilter === "at-risk" ? " active" : ""}`} onClick={() => setHealthFilter("at-risk")}>
          At risk <span className="cnt">{healthCounts["at-risk"]}</span>
        </button>
        <button className={`filter-pill${healthFilter === "blocked" ? " active" : ""}`} onClick={() => setHealthFilter("blocked")}>
          Blocked <span className="cnt">{healthCounts.blocked}</span>
        </button>
        <div className="filter-sep" />
        <select className="filter-select" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
          <option value="all">Everyone</option>
          {data.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {subtab === "overview" &&
        (filteredProjects.length ? (
          typeFilter === "all" ? (
            <>
              {client.length > 0 && (
                <div className="proj-group">
                  <div className="proj-group-head">
                    <span className="proj-group-dot" style={{ background: "var(--client-fg)" }} />
                    <h3>Client projects</h3>
                    <span className="proj-group-count">{client.length}</span>
                  </div>
                  <div className="card-grid">
                    {client.map((p) => (
                      <ProjectCard project={p} store={store} key={p.id} />
                    ))}
                  </div>
                </div>
              )}
              {internal.length > 0 && (
                <div className="proj-group">
                  <div className="proj-group-head">
                    <span className="proj-group-dot" style={{ background: "var(--internal-fg)" }} />
                    <h3>Internal projects</h3>
                    <span className="proj-group-count">{internal.length}</span>
                  </div>
                  <div className="card-grid">
                    {internal.map((p) => (
                      <ProjectCard project={p} store={store} key={p.id} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-grid">
              {filteredProjects.map((p) => (
                <ProjectCard project={p} store={store} key={p.id} />
              ))}
            </div>
          )
        ) : (
          <div className="empty-state">No projects match these filters.</div>
        ))}

      {subtab === "matrix" && <MatrixTable projects={filteredProjects} store={store} thresholds={thresholds} />}

      {subtab === "kanban" && (
        <KanbanBoard
          tasks={kanbanTasks}
          people={data.people}
          projects={data.projects}
          onOpenTask={(task) => {
            setEditingTask(task);
            setForceStatus(undefined);
            setTaskModalOpen(true);
          }}
          onNeedsBlockerReason={(task) => {
            setEditingTask(task);
            setForceStatus("blocked");
            setTaskModalOpen(true);
          }}
          statusLabels={taskStatusLabels}
        />
      )}

      {projectModalOpen && (
        <ProjectModal
          onClose={() => setProjectModalOpen(false)}
          project={editingProject}
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
          forceStatus={forceStatus}
          statusLabels={taskStatusLabels}
        />
      )}
    </>
  );
}
