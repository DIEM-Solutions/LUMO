import { Topbar } from "@/components/shell/Topbar";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function DayOffPage() {
  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Request Day Off" />
      <main className="content">
        <Card>
          <EmptyState icon="—">Day Off is coming in a follow-up pass.</EmptyState>
        </Card>
      </main>
    </>
  );
}
