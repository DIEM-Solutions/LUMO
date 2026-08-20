"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";
import { logActivity } from "@/lib/data/activity";
import { fmt, fromISO } from "@/lib/domain/dates";
import { parseMentionedIds } from "@/lib/domain/mentions";
import type { BlockerUrgency, Person, Priority, ProjectType, TaskStatus } from "@/lib/types";

async function allPeople(supabase: SupabaseClient): Promise<Person[]> {
  const { data } = await supabase.from("people").select("*");
  return (data ?? []) as Person[];
}

/**
 * Notifies anyone newly @mentioned in a task's notes (compared against
 * notes_mentioned_ids, so re-saving without new mentions doesn't
 * re-notify), and persists the current mention set for next time.
 */
async function syncNoteMentions(
  supabase: SupabaseClient,
  task: { id: string; project_id: string; name: string; notes: string; notes_mentioned_ids?: string[] },
  actorId: string | null,
  actorName: string
) {
  const people = await allPeople(supabase);
  const currentMentions = parseMentionedIds(task.notes, people);
  const previouslyNotified = new Set(task.notes_mentioned_ids ?? []);
  const newMentions = currentMentions.filter((id) => !previouslyNotified.has(id) && id !== actorId);

  if (newMentions.length) {
    const label = newMentions.map((id) => people.find((p) => p.id === id)?.name ?? "someone").join(" and ");
    await logActivity({
      kind: "note_mention",
      actorId,
      projectId: task.project_id,
      refId: task.id,
      title: `${actorName} mentioned ${label} in "${task.name}"`,
      recipientIds: newMentions,
    });
  }

  await supabase.from("tasks").update({ notes_mentioned_ids: currentMentions }).eq("id", task.id);
}

function revalidateProjectViews() {
  revalidatePath("/projects");
  revalidatePath("/home");
  revalidatePath("/planning");
  revalidatePath("/team");
  revalidatePath("/recap");
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * activity_log titles are shown both in someone's personal notification
 * list AND in the general company-wide activity feed -- so they're always
 * phrased in the third person ("Sara assigned X to Alex"), never "to you".
 */
async function namesFor(supabase: SupabaseClient, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((v): v is string => !!v)));
  if (!uniqueIds.length) return new Map();
  const { data } = await supabase.from("people").select("id, name").in("id", uniqueIds);
  return new Map((data ?? []).map((p) => [p.id as string, p.name as string]));
}

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
  nextDeliverable: string;
  priority: Priority;
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
      next_deliverable: input.nextDeliverable.trim() || null,
      priority: input.priority,
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
    recipientIds: Array.from(team),
  });

  revalidateProjectViews();
  return project;
}

export async function updateProject(id: string, input: ProjectFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const team = new Set(input.teamIds);
  team.add(input.ownerId);

  const { data: existingTeamRows } = await supabase.from("project_team").select("person_id").eq("project_id", id);
  const oldTeam = new Set((existingTeamRows ?? []).map((r) => r.person_id as string));

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
      next_deliverable: input.nextDeliverable.trim() || null,
      priority: input.priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("project_team").delete().eq("project_id", id);
  await supabase.from("project_team").insert(Array.from(team).map((person_id) => ({ project_id: id, person_id })));

  const actorName = person?.name ?? "Someone";
  const added = Array.from(team).filter((pid) => !oldTeam.has(pid));
  const removed = Array.from(oldTeam).filter((pid) => !team.has(pid));

  if (added.length || removed.length) {
    await logActivity({
      kind: "team_changed",
      actorId: person?.id ?? null,
      projectId: id,
      refId: id,
      title: `${actorName} changed the team on "${input.name}"`,
      recipientIds: [...added, ...removed],
    });
  }

  await logActivity({
    kind: "project_updated",
    actorId: person?.id ?? null,
    projectId: id,
    refId: id,
    title: `${actorName} updated "${input.name}"`,
    recipientIds: Array.from(team),
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
  workloadHours: number;
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
      workload_hours: input.workloadHours,
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

    if (input.notes.trim()) {
      await syncNoteMentions(
        supabase,
        { id: data.id, project_id: input.projectId, name: input.name, notes: input.notes, notes_mentioned_ids: [] },
        person?.id ?? null,
        person?.name ?? "Someone"
      );
    }
  }

  const createRecipients = [input.assigneeId, input.assignee2Id].filter((v): v is string => !!v);
  const createNames = await namesFor(supabase, createRecipients);
  const assigneeLabel = createRecipients.map((id) => createNames.get(id) ?? "someone").join(" and ");
  await logActivity({
    kind: "task_created",
    actorId: person?.id ?? null,
    projectId: input.projectId,
    refId: data?.id ?? null,
    title: assigneeLabel
      ? `${person?.name ?? "Someone"} assigned "${input.name}" to ${assigneeLabel}`
      : `${person?.name ?? "Someone"} created "${input.name}"`,
    recipientIds: createRecipients,
  });

  revalidateProjectViews();
}

export async function updateTask(id: string, input: TaskFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { data: existing } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();

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
      workload_hours: input.workloadHours,
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

  await syncNoteMentions(
    supabase,
    { id, project_id: input.projectId, name: input.name, notes: input.notes, notes_mentioned_ids: existing?.notes_mentioned_ids ?? [] },
    person?.id ?? null,
    person?.name ?? "Someone"
  );

  const actorName = person?.name ?? "Someone";
  const assignees = [input.assigneeId, input.assignee2Id].filter((v): v is string => !!v);

  if (existing) {
    const wasAssignee = new Set([existing.assignee_id, existing.assignee2_id].filter(Boolean) as string[]);
    const newlyAssigned = assignees.filter((a) => !wasAssignee.has(a));
    if (newlyAssigned.length) {
      const newNames = await namesFor(supabase, newlyAssigned);
      const label = newlyAssigned.map((id) => newNames.get(id) ?? "someone").join(" and ");
      await logActivity({
        kind: "task_assigned",
        actorId: person?.id ?? null,
        projectId: input.projectId,
        refId: id,
        title: `${actorName} assigned "${input.name}" to ${label}`,
        recipientIds: newlyAssigned,
      });
    }

    if (input.status === "done" && existing.status !== "done") {
      await logActivity({
        kind: "task_completed",
        actorId: person?.id ?? null,
        projectId: input.projectId,
        refId: id,
        title: `${actorName} completed "${input.name}"`,
        recipientIds: assignees,
      });
    } else {
      const changes: string[] = [];
      if (existing.due_date !== input.dueDate) changes.push(`due date → ${fmt(fromISO(input.dueDate))}`);
      if (existing.priority !== input.priority) changes.push(`priority → ${input.priority}`);
      if (existing.status !== input.status) changes.push(`status → ${input.status}`);
      const remaining = assignees.filter((a) => !newlyAssigned.includes(a));
      if (changes.length && remaining.length) {
        await logActivity({
          kind: "task_updated",
          actorId: person?.id ?? null,
          projectId: input.projectId,
          refId: id,
          title: `${actorName} updated "${input.name}"`,
          detail: changes.join(", "),
          recipientIds: remaining,
        });
      }
    }

    if (input.approvalPersonId && existing.approval_person_id !== input.approvalPersonId) {
      const approverNames = await namesFor(supabase, [input.approvalPersonId]);
      const approverName = approverNames.get(input.approvalPersonId) ?? "someone";
      await logActivity({
        kind: "approval_requested",
        actorId: person?.id ?? null,
        projectId: input.projectId,
        refId: id,
        title: `${actorName} needs ${approverName}'s approval on "${input.name}"`,
        recipientIds: [input.approvalPersonId],
      });
    }
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
    .select("name, project_id, assignee_id, assignee2_id, blocker_reason, status")
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

    const recipients = [data.assignee_id, data.assignee2_id].filter((v): v is string => !!v);
    const actorName = person?.name ?? "Someone";
    if (status === "done" && data.status !== "done") {
      await logActivity({
        kind: "task_completed",
        actorId: person?.id ?? null,
        projectId: data.project_id,
        refId: id,
        title: `${actorName} completed "${data.name}"`,
        recipientIds: recipients,
      });
    } else if (data.status !== status && recipients.length) {
      await logActivity({
        kind: "task_updated",
        actorId: person?.id ?? null,
        projectId: data.project_id,
        refId: id,
        title: `${actorName} updated "${data.name}"`,
        detail: `status → ${status}`,
        recipientIds: recipients,
      });
    }
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

async function notifyBlockerChange(supabase: SupabaseClient, blockerId: string, actorId: string | null, actorName: string, verb: string, extraRecipient?: string | null) {
  const { data: blocker } = await supabase.from("blockers").select("project_id, owner_id, title").eq("id", blockerId).maybeSingle();
  if (!blocker) return;
  const { data: project } = await supabase.from("projects").select("owner_id, name").eq("id", blocker.project_id).maybeSingle();
  const recipients = [blocker.owner_id, project?.owner_id, extraRecipient].filter((v): v is string => !!v);
  if (!recipients.length) return;
  await logActivity({
    kind: "project_updated",
    actorId,
    projectId: blocker.project_id,
    refId: blockerId,
    title: `${actorName} ${verb} a blocker on "${project?.name ?? "a project"}"`,
    recipientIds: recipients,
  });
}

export async function updateBlocker(id: string, input: BlockerFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
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
  await notifyBlockerChange(supabase, id, person?.id ?? null, person?.name ?? "Someone", "updated", input.ownerId);
  revalidateProjectViews();
}

export async function resolveBlocker(id: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase.from("blockers").update({ status: "resolved" }).eq("id", id);
  if (error) throw new Error(error.message);
  await notifyBlockerChange(supabase, id, person?.id ?? null, person?.name ?? "Someone", "resolved");
  revalidateProjectViews();
}

export async function reopenBlocker(id: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase.from("blockers").update({ status: "open" }).eq("id", id);
  if (error) throw new Error(error.message);
  await notifyBlockerChange(supabase, id, person?.id ?? null, person?.name ?? "Someone", "reopened");
  revalidateProjectViews();
}
