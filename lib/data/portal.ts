import { createClient } from "@/lib/supabase/server";
import type { Blocker, DayOff, Person, Project, Task } from "@/lib/types";
import type { PortalData } from "@/lib/domain/store";

/**
 * Loads the shared-workspace dataset every phase-1 page/domain function needs
 * (RLS already scopes what the caller is allowed to see). `projects` come back
 * with `team_ids` attached from the `project_team` join table so the domain
 * layer can treat it exactly like the original prototype's `Project.team[]`.
 */
export async function loadPortalData(): Promise<PortalData> {
  const supabase = await createClient();

  const [peopleRes, projectsRes, teamRes, tasksRes, blockersRes, dayOffRes] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_team").select("project_id, person_id"),
    supabase.from("tasks").select("*"),
    supabase.from("blockers").select("*"),
    supabase.from("day_off").select("*"),
  ]);

  const people = (peopleRes.data ?? []) as Person[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const blockers = (blockersRes.data ?? []) as Blocker[];
  const dayOff = (dayOffRes.data ?? []) as DayOff[];

  const teamByProject = new Map<string, string[]>();
  (teamRes.data ?? []).forEach((row) => {
    const list = teamByProject.get(row.project_id) ?? [];
    list.push(row.person_id);
    teamByProject.set(row.project_id, list);
  });

  const projects = ((projectsRes.data ?? []) as Project[]).map((p) => ({
    ...p,
    team_ids: teamByProject.get(p.id) ?? [],
  }));

  return { people, projects, tasks, blockers, dayOff };
}
