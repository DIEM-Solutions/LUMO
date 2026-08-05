import { Topbar } from "@/components/shell/Topbar";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function SettingsPage() {
  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Settings" />
      <main className="content">
        <Card>
          <EmptyState icon="—">Settings is coming in a follow-up pass.</EmptyState>
        </Card>
      </main>
    </>
  );
}
