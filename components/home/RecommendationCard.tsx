"use client";

import { useTransition } from "react";
import { applyRecommendation } from "@/app/(portal)/actions";
import { useToast } from "@/components/ui/Toast";
import type { Recommendation } from "@/lib/domain/recommendations";

export function RecommendationList({
  recommendations,
  emptyText,
}: {
  recommendations: Recommendation[];
  emptyText: string;
}) {
  if (!recommendations.length) {
    return <div className="empty-state">{emptyText}</div>;
  }
  return (
    <div>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function handleApply() {
    if (!confirm(rec.applyText)) return;
    startTransition(async () => {
      await applyRecommendation(rec.action);
      toast("Recommendation applied.");
    });
  }

  return (
    <div className="rec-card">
      <div className="rc-icon">💡</div>
      <div className="rc-body">
        <div className="rc-text" dangerouslySetInnerHTML={{ __html: rec.text }} />
        <button type="button" className="linklike" style={{ marginTop: 8, fontWeight: 700 }} onClick={handleApply} disabled={isPending}>
          {isPending ? "Applying…" : "Apply →"}
        </button>
      </div>
    </div>
  );
}
