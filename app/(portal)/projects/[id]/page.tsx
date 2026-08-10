import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadPortalData } from "@/lib/data/portal";
import { loadAppSettings } from "@/lib/data/settings";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [data, settings] = await Promise.all([loadPortalData(), loadAppSettings()]);
  const project = data.projects.find((p) => p.id === id);
  if (!project) notFound();

  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="Projects & Tasks" title={project.name} />
      <main className="content">
        <ProjectDetailClient
          data={data}
          projectId={id}
          canEdit={perms.canCreateProjects}
          projectCategories={settings.project_categories}
          taskStatusLabels={settings.task_status_labels}
        />
      </main>
    </>
  );
}
