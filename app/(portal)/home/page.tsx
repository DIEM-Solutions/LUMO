import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { ExecutiveHome } from "@/components/home/ExecutiveHome";
import { EmployeeHome } from "@/components/home/EmployeeHome";
import { getCurrentPerson } from "@/lib/auth/session";
import { createStore } from "@/lib/domain/store";
import { loadPortalData } from "@/lib/data/portal";
import { loadRecentActivity } from "@/lib/data/activity";
import { loadAppSettings } from "@/lib/data/settings";
import { loadDismissedAttentionKeys } from "@/lib/data/attention";
import { motivationalMessage, timeOfDayGreeting } from "@/lib/domain/greeting";
import { Greeting } from "@/components/home/Greeting";

export default async function HomePage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const isExec = person.role_type === "ceo" || person.role_type === "admin";

  const [data, activity, settings, dismissedKeys] = await Promise.all([
    loadPortalData(),
    loadRecentActivity(12),
    loadAppSettings(),
    isExec ? loadDismissedAttentionKeys() : Promise.resolve(new Set<string>()),
  ]);
  const store = createStore(data);
  const ceoId = data.people.find((p) => p.role_type === "ceo")?.id ?? null;
  const thresholds = settings.workload_thresholds;
  const now = new Date();

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title={isExec ? "Home" : "My Workspace"} />
      <main className="content">
        <Greeting greeting={timeOfDayGreeting(now)} message={motivationalMessage(now)} firstName={person.name.split(" ")[0]} />
        {isExec ? (
          <ExecutiveHome store={store} ceoId={ceoId} activity={activity} thresholds={thresholds} dismissedKeys={dismissedKeys} />
        ) : (
          <EmployeeHome store={store} personId={person.id} activity={activity} thresholds={thresholds} />
        )}
      </main>
    </>
  );
}
