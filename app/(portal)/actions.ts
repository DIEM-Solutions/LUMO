"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecommendationAction } from "@/lib/domain/recommendations";
import { addDays, fromISO, isWeekend, toISO } from "@/lib/domain/dates";

export async function applyRecommendation(action: RecommendationAction) {
  const supabase = await createClient();

  if (action.type === "reassign-task") {
    await supabase.from("tasks").update({ assignee_id: action.toPersonId }).eq("id", action.taskId);
  } else if (action.type === "add-support") {
    await supabase.from("tasks").update({ assignee2_id: action.toPersonId }).eq("id", action.taskId);
  } else if (action.type === "escalate-blocker") {
    await supabase.from("blockers").update({ urgency: "high" }).eq("id", action.blockerId);
  } else if (action.type === "reprioritize-task") {
    await supabase.from("tasks").update({ priority: action.priority }).eq("id", action.taskId);
  } else if (action.type === "reschedule-task") {
    const { data: task } = await supabase
      .from("tasks")
      .select("start_date, due_date, include_weekends")
      .eq("id", action.taskId)
      .maybeSingle();
    if (task?.start_date) {
      let cursor = fromISO(task.start_date);
      let moved = 0;
      while (moved < action.shiftWorkingDays) {
        cursor = addDays(cursor, 1);
        if (task.include_weekends || !isWeekend(cursor)) moved++;
      }
      const newStart = toISO(cursor);
      const due = task.due_date ? fromISO(task.due_date) : cursor;
      const newDue = due <= cursor ? toISO(addDays(cursor, action.shiftWorkingDays)) : task.due_date;
      await supabase.from("tasks").update({ start_date: newStart, due_date: newDue }).eq("id", action.taskId);
    }
  }

  revalidatePath("/home");
  revalidatePath("/projects");
  revalidatePath("/planning");
  revalidatePath("/team");
}

export async function quickSetTaskStatus(taskId: string, status: "in-progress" | "done") {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", taskId);
  revalidatePath("/home");
  revalidatePath("/projects");
  revalidatePath("/planning");
}
