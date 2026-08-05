import Link from "next/link";
import type { NeedsAttentionItem } from "@/lib/domain/needsAttention";

const HREF_BY_KIND: Record<NeedsAttentionItem["kind"], string> = {
  project: "/projects",
  person: "/team",
  approval: "/projects",
};

export function NeedsAttentionCard({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <div className="attn-card">
      {items.length ? (
        items
          .slice(0, 5)
          .map((item) => (
            <Link
              key={`${item.kind}:${item.ref}`}
              href={HREF_BY_KIND[item.kind]}
              className={`attn-row sev-${item.severity}`}
            >
              <div className="attn-main">
                <div className="attn-name">{item.title}</div>
                <div className="attn-meta">{item.why || item.impact}</div>
              </div>
              <div className="attn-right">
                <span className="attn-arrow">→</span>
              </div>
            </Link>
          ))
      ) : (
        <div className="attn-empty">✓ Nothing needs your attention right now.</div>
      )}
    </div>
  );
}
