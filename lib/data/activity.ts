import { createClient } from "@/lib/supabase/server";
import type { ActivityKind, ActivityLogEntry } from "@/lib/types";

/**
 * Logs an event and creates an unread inbox row for each recipient.
 * Recipients are the actual people who should be notified -- not a
 * broadcast to everyone. The actor is automatically excluded (no one
 * needs to be notified of their own action), and duplicate ids collapse
 * to one row per person.
 */
export async function logActivity(entry: {
  kind: ActivityKind;
  actorId: string | null;
  projectId?: string | null;
  refId?: string | null;
  title: string;
  detail?: string | null;
  recipientIds: string[];
}) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("activity_log")
    .insert({
      kind: entry.kind,
      actor_id: entry.actorId,
      project_id: entry.projectId ?? null,
      ref_id: entry.refId ?? null,
      title: entry.title,
      detail: entry.detail ?? null,
    })
    .select("id")
    .single();
  if (error || !row) return;

  const recipients = Array.from(new Set(entry.recipientIds)).filter((id) => id && id !== entry.actorId);
  if (!recipients.length) return;

  await supabase
    .from("notification_reads")
    .upsert(recipients.map((personId) => ({ person_id: personId, activity_id: row.id, read_at: null })));
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
