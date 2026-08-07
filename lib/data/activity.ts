import { createClient } from "@/lib/supabase/server";
import type { ActivityKind, ActivityLogEntry } from "@/lib/types";

export async function logActivity(entry: {
  kind: ActivityKind;
  actorId: string | null;
  projectId?: string | null;
  refId?: string | null;
  title: string;
  detail?: string | null;
}) {
  const supabase = await createClient();
  await supabase.from("activity_log").insert({
    kind: entry.kind,
    actor_id: entry.actorId,
    project_id: entry.projectId ?? null,
    ref_id: entry.refId ?? null,
    title: entry.title,
    detail: entry.detail ?? null,
  });
}

export async function loadRecentActivity(limit = 40): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityLogEntry[];
}
