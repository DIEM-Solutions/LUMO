"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Priority, ProjectType, TaskStatus } from "@/lib/types";

function revalidateProjectViews() {
  revalidatePath("/projects");
  revalidatePath("/home");
  revalidatePath("/planning");
  revalidatePath("/team");
}

export type ProjectFormInput = {
  name: string;
  type: ProjectType;
  clientOrCategory: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  teamIds: string[];
};

export async function createProject(input: ProjectFormInput) {
  const supabase = await createClient();
  const team = new Set(input.teamIds);
  team.add(input.ownerId);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      type: input.type,
      client: input.type === "client" ? input.clientOrCategory : null,
      category: input.type === "internal" ? input.clientOrCategory : null,
      start_date: input.startDate,
      end_date: input.endDate,
      owner_id: input.ownerId,
    })
    .select()
    .single();

  if (error || !project) throw new Error(error?.message ?? "Failed to create project");

  await supabase.from("project_team").insert(Array.from(team).map((person_id) => ({ project_id: project.id, person_id })));

  revalidateProjectViews();
  return project;
}

export async function updateProject(id: string, input: ProjectFormInput) {
  const supabase = await createClient();
  const team = new Set(input.teamIds);
  team.add(input.ownerId);

  await supabase
    .from("projects")
    .update({
      name: input.name,
      type: input.type,
      client: input.type === "client" ? input.clientOrCategory : null,
      category: input.type === "internal" ? input.clientOrCategory : null,
      start_date: input.startDate,
      end_date: input.endDate,
      owner_id: input.ownerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("project_team").delete().eq("project_id", id);
  await supabase.from("project_team").insert(Array.from(team).map((person_id) => ({ project_id: id, person_id })));

  revalidateProjectViews();
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidateProjectViews();
}

export type TaskFormInput = {
  name: string;
  projectId: string;
  assigneeId: string;
  assignee2Id: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  weight: number;
  startDate: string;
  workloadDays: number;
  includeWeekends: boolean;
  blockerReason: string;
  approvalPersonId: string | null;
  dependency: string;
  notes: string;
};

export async function createTask(input: TaskFormInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    name: input.name,
    project_id: input.projectId,
    assignee_id: input.assigneeId,
    assignee2_id: input.assignee2Id,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    weight: input.weight,
    start_date: input.startDate,
    workload_days: input.workloadDays,
    include_weekends: input.includeWeekends,
    blocker_reason: input.status === "blocked" ? input.blockerReason : "",
    approval_person_id: input.approvalPersonId,
    dependency: input.dependency,
    notes: input.notes,
  });
  if (error) throw new Error(error.message);
  revalidateProjectViews();
}

export async function updateTask(id: string, input: TaskFormInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      name: input.name,
      project_id: input.projectId,
      assignee_id: input.assigneeId,
      assignee2_id: input.assignee2Id,
      status: input.status,
      priority: input.priority,
      due_date: input.dueDate,
      weight: input.weight,
      start_date: input.startDate,
      workload_days: input.workloadDays,
      include_weekends: input.includeWeekends,
      blocker_reason: input.status === "blocked" ? input.blockerReason : "",
      approval_person_id: input.approvalPersonId,
      dependency: input.dependency,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProjectViews();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  revalidateProjectViews();
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidateProjectViews();
}
