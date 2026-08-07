"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Permissions, PortalBranding, RoleType, WorkloadThresholds } from "@/lib/types";

function revalidateSettingsConsumers() {
  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/team");
  revalidatePath("/projects");
  revalidatePath("/planning");
  revalidatePath("/recap");
  revalidatePath("/dayoff");
}

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

export type AppSettingsInput = {
  workloadThresholds: WorkloadThresholds;
  workingDays: number[];
  projectCategories: string[];
  documentTags: string[];
  branding: PortalBranding;
};

export async function updateAppSettings(input: AppSettingsInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({
    id: 1,
    workload_thresholds: input.workloadThresholds,
    working_days: input.workingDays,
    project_categories: input.projectCategories,
    document_tags: input.documentTags,
    branding: input.branding,
  });
  if (error) throw new Error(error.message);
  revalidateSettingsConsumers();
}

export async function addPublicHoliday(date: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").insert({ date, name });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dayoff");
}

export async function deletePublicHoliday(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dayoff");
}
