import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { DocumentsClient } from "@/components/documents/DocumentsClient";
import { getCurrentPerson, personPermissions } from "@/lib/auth/session";
import { loadDocuments } from "@/lib/data/documents";
import { loadPortalData } from "@/lib/data/portal";
import { loadAppSettings } from "@/lib/data/settings";

export default async function DocumentsPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const [documents, data, settings] = await Promise.all([loadDocuments(), loadPortalData(), loadAppSettings()]);
  const perms = personPermissions(person);

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Documents" />
      <main className="content">
        <DocumentsClient
          documents={documents}
          projects={data.projects}
          canUpload={perms.canUploadDocuments}
          documentTags={settings.document_tags}
        />
      </main>
    </>
  );
}
