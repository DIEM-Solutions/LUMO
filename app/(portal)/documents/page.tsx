import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { DocumentsClient } from "@/components/documents/DocumentsClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadDocuments } from "@/lib/data/documents";
import { loadPortalData } from "@/lib/data/portal";

export default async function DocumentsPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [documents, data] = await Promise.all([loadDocuments(), loadPortalData()]);
  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Documents" />
      <main className="content">
        <DocumentsClient documents={documents} projects={data.projects} canUpload={perms.canUploadDocuments} />
      </main>
    </>
  );
}
