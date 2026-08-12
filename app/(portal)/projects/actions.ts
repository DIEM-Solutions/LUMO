"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";
import { logActivity } from "@/lib/data/activity";
import type { BlockerUrgency, Priority, ProjectType, TaskStatus } from "@/lib/types";

function revalidateProjectViews() {
  revalidatePath("/projects");
  revalidatePath("/home");
  revalidatePath("/planning");
  revalidatePath("/team");
  revalidatePath("/recap");
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Keeps the structured `blockers` table in sync with a task's own
 * status/blocker_reason so a blocked task always has a matching,
 * editable Blocker record — and so it auto-resolves the moment the
 * task stops being blocked, instead of leaving a stale open blocker
 * nobody can find or close.
 */
async function syncBlockerForTask(
  supabase: SupabaseClient,
  task: { id: string; project_id: string; name: string; status: TaskStatus; assignee_id: string | null; blocker_reason: string }
) {
  const { data: existing } = await supabase
    .from("blockers")
    .select("id")
    .eq("related_task_id", task.id)
    .eq("status", "open")
    .maybeSingle();

  if (task.status === "blocked") {
    if (existing) {
      await supabase
        .from("blockers")
        .update({ title: `Blocked: ${task.name}`, cause: task.blocker_reason || "" })
        .eq("id", existing.id);
    } else {
      await supabase.from("blockers").insert({
        project_id: task.project_id,
        related_task_id: task.id,
        title: `Blocked: ${task.name}`,
        cause: task.blocker_reason || "",
        impact: "",
        owner_id: task.assignee_id,
        urgency: "medium",
        action_needed: "",
        suggested_solution: "",
        date_raised: new Date().toISOString().slice(0, 10),
        status: "open",
      });
    }
  } else if (existing) {
    await supabase.from("blockers").update({ status: "resolved" }).eq("id", existing.id);
  }
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
  const person = await getCurrentPerson();
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

  await logActivity({
    kind: "project_updated",
    actorId: person?.id ?? null,
    projectId: project.id,
    refId: project.id,
    title: `${person?.name ?? "Someone"} created "${input.name}"`,
  });

  revalidateProjectViews();
  return project;
}

export async function updateProject(id: string, input: ProjectFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
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

  await logActivity({
    kind: "project_updated",
    actorId: person?.id ?? null,
    projectId: id,
    refId: id,
    title: `${person?.name ?? "Someone"} updated "${input.name}"`,
  });

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
  const person = await getCurrentPerson();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
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
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (data) {
    await syncBlockerForTask(supabase, {
      id: data.id,
      project_id: input.projectId,
      name: input.name,
      status: input.status,
      assignee_id: input.assigneeId,
      blocker_reason: input.blockerReason,
    });
  }

  await logActivity({
    kind: "task_created",
    actorId: person?.id ?? null,
    projectId: input.projectId,
    refId: data?.id ?? null,
    title: `${person?.name ?? "Someone"} created "${input.name}"`,
  });

  revalidateProjectViews();
}

export async function updateTask(id: string, input: TaskFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
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

  await syncBlockerForTask(supabase, {
    id,
    project_id: input.projectId,
    name: input.name,
    status: input.status,
    assignee_id: input.assigneeId,
    blocker_reason: input.blockerReason,
  });

  if (input.status === "done") {
    await logActivity({
      kind: "task_completed",
      actorId: person?.id ?? null,
      projectId: input.projectId,
      refId: id,
      title: `${person?.name ?? "Someone"} completed "${input.name}"`,
    });
  }

  revalidateProjectViews();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  revalidateProjectViews();
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { data } = await supabase
    .from("tasks")
    .select("name, project_id, assignee_id, blocker_reason")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("tasks").update({ status }).eq("id", id);

  if (data) {
    await syncBlockerForTask(supabase, {
      id,
      project_id: data.project_id,
      name: data.name,
      status,
      assignee_id: data.assignee_id,
      blocker_reason: data.blocker_reason ?? "",
    });
  }

  if (status === "done" && data) {
    await logActivity({
      kind: "task_completed",
      actorId: person?.id ?? null,
      projectId: data.project_id,
      refId: id,
      title: `${person?.name ?? "Someone"} completed "${data.name}"`,
    });
  }

  revalidateProjectViews();
}

export type BlockerFormInput = {
  cause: string;
  impact: string;
  ownerId: string | null;
  urgency: BlockerUrgency;
  actionNeeded: string;
  suggestedSolution: string;
};

export async function updateBlocker(id: string, input: BlockerFormInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blockers")
    .update({
      cause: input.cause,
      impact: input.impact,
      owner_id: input.ownerId,
      urgency: input.urgency,
      action_needed: input.actionNeeded,
      suggested_solution: input.suggestedSolution,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProjectViews();
}

export async function resolveBlocker(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("blockers").update({ status: "resolved" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProjectViews();
}

export async function reopenBlocker(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("blockers").update({ status: "open" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProjectViews();
}
