import { createClient } from "@/lib/supabase/server";
import type { Blocker, DayOff, Person, Project, Task } from "@/lib/types";
import type { PortalData } from "@/lib/domain/store";

/**
 * Loads the shared-workspace dataset every phase-1 page/domain function needs
 * (RLS already scopes what the caller is allowed to see). `projects` come back
 * with `team_ids` attached from the `project_team` join table so the domain
 * layer can treat it exactly like the original prototype's `Project.team[]`.
 *
 * `people`/`projects`/`project_team` are cheap and near-universally needed,
 * so they're always fetched. `tasks`/`blockers`/`dayOff` scale with real
 * usage and several pages don't touch them at all (or only need one
 * project's worth) -- callers can skip them, or scope tasks/blockers to a
 * single project, to avoid pulling the whole company's data for a page
 * that only needed a fraction of it.
 */
export async function loadPortalData(
  opts: { tasks?: boolean; blockers?: boolean; dayOff?: boolean; projectId?: string } = {}
): Promise<PortalData> {
  const { tasks: wantTasks = true, blockers: wantBlockers = true, dayOff: wantDayOff = true, projectId } = opts;
  const supabase = await createClient();

  let tasksQuery = supabase.from("tasks").select("*");
  let blockersQuery = supabase.from("blockers").select("*");
  if (projectId) {
    tasksQuery = tasksQuery.eq("project_id", projectId);
    blockersQuery = blockersQuery.eq("project_id", projectId);
  }

  const [peopleRes, projectsRes, teamRes, tasksRes, blockersRes, dayOffRes] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_team").select("project_id, person_id"),
    wantTasks ? tasksQuery : Promise.resolve({ data: [] as Task[] }),
    wantBlockers ? blockersQuery : Promise.resolve({ data: [] as Blocker[] }),
    wantDayOff ? supabase.from("day_off").select("*") : Promise.resolve({ data: [] as DayOff[] }),
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
