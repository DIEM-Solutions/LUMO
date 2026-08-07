import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { ExecutiveHome } from "@/components/home/ExecutiveHome";
import { EmployeeHome } from "@/components/home/EmployeeHome";
import { getCurrentPerson } from "@/lib/auth/session";
import { createStore } from "@/lib/domain/store";
import { loadPortalData } from "@/lib/data/portal";
import { loadRecentActivity } from "@/lib/data/activity";
import { loadAppSettings } from "@/lib/data/settings";

export default async function HomePage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [data, activity, settings] = await Promise.all([loadPortalData(), loadRecentActivity(12), loadAppSettings()]);
  const store = createStore(data);
  const isExec = person.role_type === "ceo" || person.role_type === "admin";
  const ceoId = data.people.find((p) => p.role_type === "ceo")?.id ?? null;
  const thresholds = settings.workload_thresholds;

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title={isExec ? "Home" : "My Workspace"} />
      <main className="content">
        {isExec ? (
          <ExecutiveHome store={store} ceoId={ceoId} activity={activity} thresholds={thresholds} />
        ) : (
          <EmployeeHome store={store} personId={person.id} activity={activity} thresholds={thresholds} />
        )}
      </main>
    </>
  );
}
