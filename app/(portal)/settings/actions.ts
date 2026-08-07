"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Permissions, RoleType } from "@/lib/types";

export type PersonFormInput = {
  name: string;
  role: string;
  roleType: RoleType;
  email: string;
  capacityBaseline: number | null;
  workingArrangement: string;
  leaveBalanceDays: number;
  nextAssessmentDate: string | null;
  permissions: Permissions;
};

export async function createPerson(input: PersonFormInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("people").insert({
    name: input.name,
    role: input.role || null,
    role_type: input.roleType,
    email: input.email || null,
    capacity_baseline: input.capacityBaseline,
    working_arrangement: input.workingArrangement || null,
    leave_balance_days: input.leaveBalanceDays,
    next_assessment_date: input.nextAssessmentDate,
    permissions: input.permissions,
    active: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/team");
}

export async function updatePerson(id: string, input: PersonFormInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("people")
    .update({
      name: input.name,
      role: input.role || null,
      role_type: input.roleType,
      email: input.email || null,
      capacity_baseline: input.capacityBaseline,
      working_arrangement: input.workingArrangement || null,
      leave_balance_days: input.leaveBalanceDays,
      next_assessment_date: input.nextAssessmentDate,
      permissions: input.permissions,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/team");
}

export async function setPersonActive(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("people").update({ active }).eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/team");
}
