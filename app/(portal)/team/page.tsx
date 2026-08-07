import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { TeamClient } from "@/components/team/TeamClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";

export default async function TeamPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const data = await loadPortalData();
  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Team" />
      <main className="content">
        <TeamClient data={data} isAdmin={perms.isAdmin} />
      </main>
    </>
  );
}
