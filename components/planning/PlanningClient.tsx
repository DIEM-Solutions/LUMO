"use client";

import { useState } from "react";
import { PlanningBoard } from "./PlanningBoard";
import { CalendarView } from "./CalendarView";
import { TaskModal } from "@/components/projects/TaskModal";
import type { PortalData } from "@/lib/domain/store";
import type { Task } from "@/lib/types";

export function PlanningClient({ data }: { data: PortalData }) {
  const [subtab, setSubtab] = useState<"planning" | "calendar">("planning");
  const [rangeDays, setRangeDays] = useState(14);
  const [personFilter, setPersonFilter] = useState("all");
  const [compareFilter, setCompareFilter] = useState("none");
  const [projectFilter, setProjectFilter] = useState("all");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [presetPersonId, setPresetPersonId] = useState<string | undefined>(undefined);

  function openTask(task: Task) {
    setEditingTask(task);
    setPresetPersonId(undefined);
    setTaskModalOpen(true);
  }

  function addTaskFor(personId: string) {
    setEditingTask(null);
    setPresetPersonId(personId);
    setTaskModalOpen(true);
  }

  return (
    <>
      <div className="panel-head-row">
        <div className="subtabs">
          <button className={`subtab-btn${subtab === "planning" ? " active" : ""}`} onClick={() => setSubtab("planning")}>
            Two-Week Planning
          </button>
          <button className={`subtab-btn${subtab === "calendar" ? " active" : ""}`} onClick={() => setSubtab("calendar")}>
            Calendar
          </button>
        </div>
      </div>

      {subtab === "planning" ? (
        <PlanningBoard
          data={data}
          rangeDays={rangeDays}
          onRangeChange={setRangeDays}
          personFilter={personFilter}
          onPersonChange={(id) => {
            setPersonFilter(id);
            if (id === "all") setCompareFilter("none");
          }}
          compareFilter={compareFilter}
          onCompareChange={setCompareFilter}
          projectFilter={projectFilter}
          onProjectChange={setProjectFilter}
          onOpenTask={openTask}
          onAddTaskFor={addTaskFor}
        />
      ) : (
        <CalendarView
          data={data}
          personFilter={personFilter}
          onPersonChange={setPersonFilter}
          projectFilter={projectFilter}
          onProjectChange={setProjectFilter}
          onOpenTask={openTask}
        />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={editingTask}
        people={data.people}
        projects={data.projects}
        presetPersonId={presetPersonId}
      />
    </>
  );
}
