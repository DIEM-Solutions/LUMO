"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function quickSetTaskStatus(taskId: string, status: "in-progress" | "done") {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", taskId);
  revalidatePath("/home");
  revalidatePath("/projects");
  revalidatePath("/planning");
}
