"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { submitDayOff } from "@/app/(portal)/dayoff/actions";
import { toISO, today } from "@/lib/domain/dates";
import type { Person } from "@/lib/types";

const TYPES = ["Annual leave", "Sick leave", "Unpaid leave", "Other"];

export function DayOffRequestModal({
  onClose,
  currentPerson,
  people,
  canApprove,
}: {
  onClose: () => void;
  currentPerson: Person;
  people: Person[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [personId, setPersonId] = useState(currentPerson.id);
  const [type, setType] = useState(TYPES[0]);
  const [startDate, setStartDate] = useState(toISO(today()));
  const [endDate, setEndDate] = useState(toISO(today()));
  const [note, setNote] = useState("");
  const [markApproved, setMarkApproved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }
    setSaving(true);
    try {
      await submitDayOff({ personId, startDate, endDate, type, note: note.trim(), markApproved });
      toast(markApproved && canApprove ? "Time off logged" : "Request submitted");
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
      title={canApprove ? "Log time off" : "Request time off"}
      footer={
        <div className="modal-foot-actions" style={{ marginLeft: "auto" }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : canApprove ? "Save" : "Submit request"}
          </Button>
        </div>
      }
    >
      {error && <div className="form-error">{error}</div>}
      {canApprove && (
        <div className="field">
          <label>For</label>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="field-hint">Use this to backfill leave taken before the portal existed.</div>
        </div>
      )}
      <div className="field">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any context worth logging" />
      </div>
      {canApprove && (
        <label className="field-inline-check">
          <input type="checkbox" checked={markApproved} onChange={(e) => setMarkApproved(e.target.checked)} />
          Mark as already approved (skip the approval step)
        </label>
      )}
    </Modal>
  );
}
