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

  const { error: notifyError } = await supabase
    .from("notification_reads")
    .upsert(recipients.map((personId) => ({ person_id: personId, activity_id: row.id, read_at: null })));
  if (notifyError) {
    // This write failing silently is exactly what let notifications go
    // dark for 13 days without anyone noticing -- log it loudly so a
    // future RLS/policy drift shows up in the server logs immediately
    // instead of being discovered by a user reporting "I stopped
    // getting notifications."
    console.error("logActivity: failed to create notification_reads rows", notifyError, { activityId: row.id, recipients });
  }
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
