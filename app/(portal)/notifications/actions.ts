"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";

export async function markNotificationRead(activityId: string) {
  const person = await getCurrentPerson();
  if (!person) return;
  const supabase = await createClient();
  await supabase.from("notification_reads").upsert({ person_id: person.id, activity_id: activityId });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(activityIds: string[]) {
  if (!activityIds.length) return;
  const person = await getCurrentPerson();
  if (!person) return;
  const supabase = await createClient();
  await supabase
    .from("notification_reads")
    .upsert(activityIds.map((activityId) => ({ person_id: person.id, activity_id: activityId })));
  revalidatePath("/", "layout");
}
