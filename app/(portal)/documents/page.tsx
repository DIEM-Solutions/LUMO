import { Topbar } from "@/components/shell/Topbar";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function DocumentsPage() {
  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Documents" />
      <main className="content">
        <Card>
          <EmptyState icon="—">Documents is coming in a follow-up pass.</EmptyState>
        </Card>
      </main>
    </>
  );
}
