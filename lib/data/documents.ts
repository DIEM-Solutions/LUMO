import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";

export async function loadDocuments(): Promise<Document[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("updated_date", { ascending: false });
  return (data ?? []) as Document[];
}
