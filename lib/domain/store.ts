import type { Blocker, DayOff, Person, Project, Task } from "@/lib/types";

export type PortalData = {
  people: Person[];
  projects: Project[];
  tasks: Task[];
  blockers: Blocker[];
  dayOff: DayOff[];
};

export function createStore(data: PortalData) {
  const personById = (id: string | null | undefined) =>
    data.people.find((p) => p.id === id) ?? null;
  const projectById = (id: string | null | undefined) =>
    data.projects.find((p) => p.id === id) ?? null;
  const tasksFor = (projectId: string) => data.tasks.filter((t) => t.project_id === projectId);
  const isAssignedTo = (task: Task, personId: string) =>
    task.assignee_id === personId || task.assignee2_id === personId;
  const openBlockersFor = (projectId: string) =>
    data.blockers.filter((b) => b.project_id === projectId && b.status === "open");
  const projectsForPerson = (personId: string) =>
    data.projects.filter((p) => (p.team_ids ?? []).includes(personId) || p.owner_id === personId);
  const activeTasksForPerson = (personId: string) =>
    data.tasks.filter((t) => isAssignedTo(t, personId) && t.status !== "done");
  const capacityRoster = () => data.people.filter((p) => p.role_type !== "ceo");
  const calendarRoster = () => data.people;

  return {
    data,
    personById,
    projectById,
    tasksFor,
    isAssignedTo,
    openBlockersFor,
    projectsForPerson,
    activeTasksForPerson,
    capacityRoster,
    calendarRoster,
  };
}

export type Store = ReturnType<typeof createStore>;
