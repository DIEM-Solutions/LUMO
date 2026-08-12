"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { reopenBlocker, resolveBlocker, updateBlocker } from "@/app/(portal)/projects/actions";
import type { Blocker, BlockerUrgency, Person } from "@/lib/types";

const URGENCY_LABEL: Record<BlockerUrgency, string> = { high: "High", medium: "Medium", low: "Low" };

export function BlockerModal({ onClose, blocker, people }: { onClose: () => void; blocker: Blocker; people: Person[] }) {
  const router = useRouter();
  const toast = useToast();

  const [cause, setCause] = useState(blocker.cause);
  const [impact, setImpact] = useState(blocker.impact);
  const [ownerId, setOwnerId] = useState(blocker.owner_id ?? "");
  const [urgency, setUrgency] = useState<BlockerUrgency>(blocker.urgency);
  const [actionNeeded, setActionNeeded] = useState(blocker.action_needed);
  const [suggestedSolution, setSuggestedSolution] = useState(blocker.suggested_solution);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateBlocker(blocker.id, {
        cause,
        impact,
        ownerId: ownerId || null,
        urgency,
        actionNeeded,
        suggestedSolution,
      });
      toast("Blocker updated");
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleResolved() {
    setSaving(true);
    try {
      if (blocker.status === "open") {
        await resolveBlocker(blocker.id);
        toast("Blocker resolved");
      } else {
        await reopenBlocker(blocker.id);
        toast("Blocker reopened");
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={blocker.title}
      wide
      footer={
        <>
          <Button
            variant={blocker.status === "open" ? "primary" : "ghost"}
            size="sm"
            onClick={handleToggleResolved}
            disabled={saving}
          >
            {blocker.status === "open" ? "Mark resolved" : "Reopen"}
          </Button>
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Save changes
            </Button>
          </div>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label>Cause</label>
          <input type="text" value={cause} onChange={(e) => setCause(e.target.value)} placeholder="What's causing the delay" />
        </div>
        <div className="field">
          <label>Urgency</label>
          <select value={urgency} onChange={(e) => setUrgency(e.target.value as BlockerUrgency)}>
            {(Object.keys(URGENCY_LABEL) as BlockerUrgency[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Impact</label>
        <input type="text" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="What does this put at risk" />
      </div>
      <div className="field">
        <label>Owner</label>
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">— Unassigned —</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Action needed</label>
        <textarea value={actionNeeded} onChange={(e) => setActionNeeded(e.target.value)} placeholder="What needs to happen to clear this" />
      </div>
      <div className="field">
        <label>Suggested solution</label>
        <textarea value={suggestedSolution} onChange={(e) => setSuggestedSolution(e.target.value)} placeholder="Optional — a proposed way forward" />
      </div>
    </Modal>
  );
}
