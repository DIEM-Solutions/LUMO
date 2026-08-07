import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Person } from "@/lib/types";

export default async function SettingsPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const perms = personPermissions(person);
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("*").order("name");

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Settings" />
      <main className="content">
        <SettingsClient currentPerson={person} people={(data ?? []) as Person[]} isAdmin={perms.canEditTeam} />
      </main>
    </>
  );
}
