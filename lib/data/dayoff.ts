import { createClient } from "@/lib/supabase/server";
import type { DayOff } from "@/lib/types";

export async function loadDayOff(): Promise<DayOff[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("day_off")
    .select("*")
    .order("start_date", { ascending: false });
  return (data ?? []) as DayOff[];
}
