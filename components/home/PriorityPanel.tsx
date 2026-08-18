"use client";

import { useState } from "react";
import { NeedsAttentionCard } from "@/components/home/NeedsAttentionCard";
import type { NeedsAttentionItem } from "@/lib/domain/needsAttention";

export function PriorityPanel({
  priorityItems,
  overviewItems,
}: {
  priorityItems: NeedsAttentionItem[];
  overviewItems: NeedsAttentionItem[];
}) {
  const [tab, setTab] = useState<"mine" | "company">("mine");
  const items = tab === "mine" ? priorityItems : overviewItems;
  const hint =
    tab === "mine"
      ? "What you personally need to know, review, decide, or act on."
      : "Company-wide signals, regardless of your own involvement.";

  return (
    <div className="ceo-section">
      <div className="ceo-section-head">
        <div className="subtabs">
          <button type="button" className={`subtab-btn${tab === "mine" ? " active" : ""}`} onClick={() => setTab("mine")}>
            My Priorities {priorityItems.length > 0 && <span className="cnt">{priorityItems.length}</span>}
          </button>
          <button type="button" className={`subtab-btn${tab === "company" ? " active" : ""}`} onClick={() => setTab("company")}>
            Company Overview {overviewItems.length > 0 && <span className="cnt">{overviewItems.length}</span>}
          </button>
        </div>
      </div>
      <div className="field-hint" style={{ marginBottom: 10 }}>{hint}</div>
      <NeedsAttentionCard items={items} canDismiss={tab === "mine"} />
    </div>
  );
}
