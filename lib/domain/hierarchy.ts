export const JOB_LEVELS = [
  "Intern",
  "Junior Innovation Lead",
  "Innovation Lead 1",
  "Innovation Lead 2",
  "Senior Innovation Lead",
  "Partner",
] as const;

export type JobLevel = (typeof JOB_LEVELS)[number];

const RANK: Record<string, number> = Object.fromEntries(JOB_LEVELS.map((l, i) => [l, i]));

/** Higher = more senior. Unranked/custom titles (e.g. "CEO") sort last. */
export function jobLevelRank(role: string | null | undefined): number {
  if (!role) return -1;
  return RANK[role] ?? -1;
}

export function bySeniorityDesc(a: { role: string | null; name: string }, b: { role: string | null; name: string }) {
  const diff = jobLevelRank(b.role) - jobLevelRank(a.role);
  return diff !== 0 ? diff : a.name.localeCompare(b.name);
}
