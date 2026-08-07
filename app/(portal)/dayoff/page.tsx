import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { DayOffClient } from "@/components/dayoff/DayOffClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadDayOff } from "@/lib/data/dayoff";
import { loadPortalData } from "@/lib/data/portal";
import { loadAppSettings, loadPublicHolidays } from "@/lib/data/settings";
import type { WorkingCalendar } from "@/lib/domain/dates";

export default async function DayOffPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [dayOff, data, settings, holidays] = await Promise.all([
    loadDayOff(),
    loadPortalData(),
    loadAppSettings(),
    loadPublicHolidays(),
  ]);
  const perms = personPermissions(person);
  const calendar: WorkingCalendar = {
    workingDays: settings.working_days,
    holidays: new Set(holidays.map((h) => h.date)),
  };

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Request Day Off" />
      <main className="content">
        <DayOffClient
          currentPerson={person}
          people={data.people}
          dayOff={dayOff}
          canApprove={perms.canApproveDayOff}
          calendar={calendar}
        />
      </main>
    </>
  );
}
