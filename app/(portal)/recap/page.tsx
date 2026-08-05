import { Topbar } from "@/components/shell/Topbar";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function RecapPage() {
  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Weekly Recap" />
      <main className="content">
        <Card>
          <EmptyState icon="—">Weekly Recap is coming in a follow-up pass.</EmptyState>
        </Card>
      </main>
    </>
  );
}
