"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { dismissAttentionItem } from "@/app/(portal)/home/actions";
import type { NeedsAttentionItem } from "@/lib/domain/needsAttention";

function hrefFor(item: NeedsAttentionItem): string {
  if ((item.kind === "project" || item.kind === "approval" || item.kind === "task" || item.kind === "mention") && item.projectId) {
    return `/projects/${item.projectId}`;
  }
  if (item.kind === "person") return "/team";
  return "/projects";
}

export function NeedsAttentionCard({ items, canDismiss }: { items: NeedsAttentionItem[]; canDismiss?: boolean }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function handleDismiss(e: React.MouseEvent, item: NeedsAttentionItem) {
    e.preventDefault();
    e.stopPropagation();
    const key = `${item.kind}:${item.ref}`;
    setDismissing(key);
    try {
      await dismissAttentionItem(item.kind, item.ref);
      router.refresh();
    } finally {
      setDismissing(null);
    }
  }

  return (
    <div className="attn-card">
      {items.length ? (
        items.slice(0, 5).map((item) => {
          const key = `${item.kind}:${item.ref}`;
          return (
            <Link key={key} href={hrefFor(item)} className={`attn-row sev-${item.severity}`}>
              <div className="attn-main">
                <div className="attn-name">{item.title}</div>
                <div className="attn-meta">{item.why || item.impact}</div>
              </div>
              <div className="attn-right">
                {canDismiss && (
                  <button
                    type="button"
                    className="linklike"
                    style={{ fontSize: 11.5, marginRight: 4 }}
                    title="I've solved this — remove it"
                    onClick={(e) => handleDismiss(e, item)}
                    disabled={dismissing === key}
                  >
                    {dismissing === key ? "…" : "✕"}
                  </button>
                )}
                <span className="attn-arrow">→</span>
              </div>
            </Link>
          );
        })
      ) : (
        <div className="attn-empty">✓ Nothing needs your attention right now.</div>
      )}
    </div>
  );
}
