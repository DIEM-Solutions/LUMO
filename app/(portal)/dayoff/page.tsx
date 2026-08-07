import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { DayOffClient } from "@/components/dayoff/DayOffClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadDayOff } from "@/lib/data/dayoff";
import { loadPortalData } from "@/lib/data/portal";

export default async function DayOffPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [dayOff, data] = await Promise.all([loadDayOff(), loadPortalData()]);
  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Request Day Off" />
      <main className="content">
        <DayOffClient
          currentPerson={person}
          people={data.people}
          dayOff={dayOff}
          canApprove={perms.canApproveDayOff}
        />
      </main>
    </>
  );
}
