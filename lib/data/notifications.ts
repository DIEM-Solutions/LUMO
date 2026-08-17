import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";
import type { ActivityLogEntry } from "@/lib/types";

export type NotificationItem = ActivityLogEntry & { unread: boolean };

export function notificationSectionHref(kind: ActivityLogEntry["kind"]): string | null {
  switch (kind) {
    case "task_completed":
    case "task_created":
    case "project_updated":
    case "task_assigned":
    case "task_updated":
    case "note_mention":
    case "approval_requested":
    case "team_changed":
      return "/projects";
    case "document_uploaded":
      return "/documents";
    case "dayoff_requested":
    case "dayoff_decided":
      return "/dayoff";
    case "support_request_updated":
      return "/team";
    default:
      return null;
  }
}

export function unreadCountsBySection(items: NotificationItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item.unread) continue;
    const href = notificationSectionHref(item.kind);
    if (!href) continue;
    counts[href] = (counts[href] ?? 0) + 1;
  }
  return counts;
}

export async function loadNotifications(limit = 20): Promise<NotificationItem[]> {
  const person = await getCurrentPerson();
  if (!person) return [];

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notification_reads")
    .select("read_at, activity_log(*)")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false, referencedTable: "activity_log" })
    .limit(limit);

  return ((rows ?? []) as unknown as { read_at: string | null; activity_log: ActivityLogEntry | null }[])
    .filter((r) => r.activity_log)
    .map((r) => ({ ...(r.activity_log as ActivityLogEntry), unread: r.read_at === null }));
}
