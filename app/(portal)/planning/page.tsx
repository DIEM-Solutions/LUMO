import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { PlanningClient } from "@/components/planning/PlanningClient";
import { getCurrentPerson } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";

export default async function PlanningPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const data = await loadPortalData();

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Planning" />
      <main className="content">
        <PlanningClient data={data} />
      </main>
    </>
  );
}
