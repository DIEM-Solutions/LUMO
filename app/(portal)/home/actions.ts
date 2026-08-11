"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";

export async function dismissAttentionItem(kind: string, ref: string) {
  const caller = await getCurrentPerson();
  const perms = personPermissions(caller);
  if (!perms.isAdmin) {
    throw new Error("Only admins can dismiss priorities.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("dismissed_attention_items")
    .upsert({ kind, ref, dismissed_by: caller!.id });
  if (error) throw new Error(error.message);
  revalidatePath("/home");
  revalidatePath("/recap");
}
