"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth/session";
import { logActivity } from "@/lib/data/activity";
import { toISO, today } from "@/lib/domain/dates";

export type DocumentFormInput = {
  name: string;
  projectId: string | null;
  category: string;
  folder: string;
  linkUrl: string;
  tags: string[];
  fileNote: string;
};

export async function createDocument(input: DocumentFormInput) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      name: input.name,
      project_id: input.projectId,
      category: input.category,
      folder: input.folder || null,
      link_url: input.linkUrl || null,
      tags: input.tags,
      file_note: input.fileNote,
      uploaded_by: person?.id ?? null,
      upload_date: toISO(today()),
      updated_date: toISO(today()),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  let recipientIds: string[] = [];
  if (input.projectId) {
    const [{ data: team }, { data: project }] = await Promise.all([
      supabase.from("project_team").select("person_id").eq("project_id", input.projectId),
      supabase.from("projects").select("owner_id").eq("id", input.projectId).maybeSingle(),
    ]);
    recipientIds = Array.from(
      new Set([...(team ?? []).map((r) => r.person_id as string), project?.owner_id].filter((v): v is string => !!v))
    );
  }

  await logActivity({
    kind: "document_uploaded",
    actorId: person?.id ?? null,
    projectId: input.projectId,
    refId: data?.id ?? null,
    title: `${person?.name ?? "Someone"} added "${input.name}"`,
    recipientIds,
  });

  revalidatePath("/documents");
}

export async function updateDocument(id: string, input: DocumentFormInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      name: input.name,
      project_id: input.projectId,
      category: input.category,
      folder: input.folder || null,
      link_url: input.linkUrl || null,
      tags: input.tags,
      file_note: input.fileNote,
      updated_date: toISO(today()),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();
  await supabase.from("documents").delete().eq("id", id);
  revalidatePath("/documents");
}
