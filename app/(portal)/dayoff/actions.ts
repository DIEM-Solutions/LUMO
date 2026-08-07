"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { logActivity } from "@/lib/data/activity";
import { toISO, today } from "@/lib/domain/dates";

export type DayOffRequestInput = {
  personId: string;
  startDate: string;
  endDate: string;
  type: string;
  note: string;
  markApproved: boolean;
};

export async function submitDayOff(input: DayOffRequestInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const perms = personPermissions(person);

  const isBackfillForSelfOrOther = perms.canApproveDayOff;
  const status = isBackfillForSelfOrOther && input.markApproved ? "approved" : "pending";

  const { data, error } = await supabase
    .from("day_off")
    .insert({
      person_id: input.personId,
      start_date: input.startDate,
      end_date: input.endDate,
      type: input.type,
      note: input.note,
      submitted_date: toISO(today()),
      status,
      decided_by: status === "approved" ? person?.id ?? null : null,
      decided_date: status === "approved" ? toISO(today()) : null,
      employee_seen: status === "approved",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    kind: "dayoff_requested",
    actorId: person?.id ?? null,
    refId: data?.id ?? null,
    title: `${person?.name ?? "Someone"} requested ${input.type || "time off"}`,
  });

  revalidatePath("/dayoff");
  revalidatePath("/team");
  revalidatePath("/planning");
  revalidatePath("/home");
}

export async function decideDayOff(id: string, status: "approved" | "rejected", comment: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data, error } = await supabase
    .from("day_off")
    .update({
      status,
      comment,
      decided_by: person?.id ?? null,
      decided_date: toISO(today()),
      employee_seen: false,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    kind: "dayoff_decided",
    actorId: person?.id ?? null,
    refId: id,
    title: `${person?.name ?? "An admin"} ${status} a day-off request`,
    detail: data?.person_id ?? null,
  });

  revalidatePath("/dayoff");
  revalidatePath("/team");
  revalidatePath("/planning");
  revalidatePath("/home");
}

export async function markDayOffSeen(id: string) {
  const supabase = await createClient();
  await supabase.from("day_off").update({ employee_seen: true }).eq("id", id);
  revalidatePath("/dayoff");
}
