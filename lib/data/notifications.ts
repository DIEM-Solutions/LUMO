import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";
import type { ActivityLogEntry } from "@/lib/types";

export type NotificationItem = ActivityLogEntry & { unread: boolean };

export async function loadNotifications(limit = 20): Promise<NotificationItem[]> {
  const person = await getCurrentPerson();
  if (!person) return [];

  const supabase = await createClient();
  const [{ data: entries }, { data: reads }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("*")
      .or(`actor_id.neq.${person.id},actor_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notification_reads").select("activity_id").eq("person_id", person.id),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.activity_id as string));
  return ((entries ?? []) as ActivityLogEntry[]).map((e) => ({ ...e, unread: !readIds.has(e.id) }));
}
