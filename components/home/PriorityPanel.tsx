import { NeedsAttentionCard } from "@/components/home/NeedsAttentionCard";
import type { NeedsAttentionItem } from "@/lib/domain/needsAttention";

export function PriorityPanel({ priorityItems }: { priorityItems: NeedsAttentionItem[] }) {
  return (
    <div className="ceo-section">
      <div className="ceo-section-head">
        <h2>My Priorities</h2>
        {priorityItems.length > 0 && <span className="section-title" style={{ margin: 0 }}>{priorityItems.length} item{priorityItems.length === 1 ? "" : "s"}</span>}
      </div>
      <div className="field-hint" style={{ marginBottom: 10 }}>What you personally need to know, review, decide, or act on.</div>
      <NeedsAttentionCard items={priorityItems} canDismiss />
    </div>
  );
}
