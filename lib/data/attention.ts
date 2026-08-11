import { createClient } from "@/lib/supabase/server";

export async function loadDismissedAttentionKeys(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("dismissed_attention_items").select("kind,ref");
  return new Set((data ?? []).map((row) => `${row.kind}:${row.ref}`));
}
