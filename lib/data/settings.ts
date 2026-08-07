import { createClient } from "@/lib/supabase/server";
import type { AppSettings, PublicHoliday } from "@/lib/types";
import { DEFAULT_WORKLOAD_THRESHOLDS } from "@/lib/domain/capacity";

const FALLBACK_SETTINGS: AppSettings = {
  id: 1,
  workload_thresholds: DEFAULT_WORKLOAD_THRESHOLDS,
  recap_settings: { finalizeReminders: true },
  working_days: [1, 2, 3, 4, 5],
  project_categories: [],
  document_tags: [],
  branding: {},
};

export async function loadAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return FALLBACK_SETTINGS;
  return {
    id: data.id,
    workload_thresholds: data.workload_thresholds ?? FALLBACK_SETTINGS.workload_thresholds,
    recap_settings: data.recap_settings ?? FALLBACK_SETTINGS.recap_settings,
    working_days: data.working_days ?? FALLBACK_SETTINGS.working_days,
    project_categories: data.project_categories ?? [],
    document_tags: data.document_tags ?? [],
    branding: data.branding ?? {},
  };
}

export async function loadPublicHolidays(): Promise<PublicHoliday[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_holidays").select("*").order("date", { ascending: true });
  return (data ?? []) as PublicHoliday[];
}
