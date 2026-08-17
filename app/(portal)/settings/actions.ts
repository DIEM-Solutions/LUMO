"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site-url";
import type { Permissions, PortalBranding, RoleType, TaskStatusLabels, WorkloadThresholds } from "@/lib/types";

const NO_PROJECT_CREATE_LEVELS = new Set(["Intern", "Junior Innovation Lead"]);

function normalizePermissions(role: string, roleType: RoleType, permissions: Permissions): Permissions {
  if (roleType !== "employee") return permissions;
  return {
    ...permissions,
    canUploadDocuments: true,
    canCreateProjects: NO_PROJECT_CREATE_LEVELS.has(role) ? false : permissions.canCreateProjects,
  };
}

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
  birthday: string | null;
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
    birthday: input.birthday,
    permissions: normalizePermissions(input.role, input.roleType, input.permissions),
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
      birthday: input.birthday,
      permissions: normalizePermissions(input.role, input.roleType, input.permissions),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/team");
}

export async function inviteTeamMember(email: string) {
  const caller = await getCurrentPerson();
  const perms = personPermissions(caller);
  if (!perms.canEditTeam) {
    throw new Error("You don't have permission to invite team members.");
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getSiteUrl()}/invite`,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
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
  taskStatusLabels: TaskStatusLabels;
};

export async function updateAppSettings(input: AppSettingsInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      workload_thresholds: input.workloadThresholds,
      working_days: input.workingDays,
      project_categories: input.projectCategories,
      document_tags: input.documentTags,
      branding: input.branding,
      task_status_labels: input.taskStatusLabels,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidateSettingsConsumers();
}

const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadBrandingLogo(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("No file selected.");
  if (!ALLOWED_LOGO_TYPES.has(file.type)) throw new Error("Please upload a PNG, JPG, SVG, or WebP image.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be smaller than 2MB.");

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);

  const { data: current } = await supabase.from("app_settings").select("branding").eq("id", 1).maybeSingle();
  const branding: PortalBranding = { ...(current?.branding ?? {}), logo_url: pub.publicUrl };
  const { error } = await supabase.from("app_settings").update({ branding }).eq("id", 1);
  if (error) throw new Error(error.message);

  revalidateSettingsConsumers();
  revalidatePath("/login");
  return pub.publicUrl;
}

export async function removeBrandingLogo() {
  const supabase = await createClient();
  const { data: current } = await supabase.from("app_settings").select("branding").eq("id", 1).maybeSingle();
  const branding: PortalBranding = { ...(current?.branding ?? {}) };
  delete branding.logo_url;
  const { error } = await supabase.from("app_settings").update({ branding }).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidateSettingsConsumers();
  revalidatePath("/login");
}

export async function addPublicHoliday(date: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").insert({ date, name });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dayoff");
  revalidatePath("/planning");
}

export async function deletePublicHoliday(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dayoff");
  revalidatePath("/planning");
}

export async function updateMyBirthday(birthday: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_birthday", { new_birthday: birthday });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
