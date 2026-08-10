import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { ProjectsClient } from "@/components/projects/ProjectsClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";
import { loadAppSettings } from "@/lib/data/settings";

export default async function ProjectsPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [data, settings] = await Promise.all([loadPortalData(), loadAppSettings()]);
  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Projects & Tasks" />
      <main className="content">
        <ProjectsClient
          data={data}
          canCreateProjects={perms.canCreateProjects}
          thresholds={settings.workload_thresholds}
          projectCategories={settings.project_categories}
          taskStatusLabels={settings.task_status_labels}
        />
      </main>
    </>
  );
}
