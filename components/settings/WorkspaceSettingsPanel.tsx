"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { addPublicHoliday, deletePublicHoliday, updateAppSettings } from "@/app/(portal)/settings/actions";
import { fmt, fromISO } from "@/lib/domain/dates";
import type { AppSettings, PublicHoliday } from "@/lib/types";

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function ChipListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setDraft("");
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="tag-chip-row" style={{ marginBottom: 8 }}>
          {items.map((item) => (
            <span className="tag-chip" key={item} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}
                aria-label={`Remove ${item}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
      />
    </div>
  );
}

export function WorkspaceSettingsPanel({ settings, holidays }: { settings: AppSettings; holidays: PublicHoliday[] }) {
  const router = useRouter();
  const toast = useToast();
  const [thresholds, setThresholds] = useState(settings.workload_thresholds);
  const [workingDays, setWorkingDays] = useState<number[]>(settings.working_days);
  const [categories, setCategories] = useState<string[]>(settings.project_categories);
  const [tags, setTags] = useState<string[]>(settings.document_tags);
  const [primaryColor, setPrimaryColor] = useState(settings.branding.primary_color ?? "#FF4F14");
  const [logoUrl, setLogoUrl] = useState(settings.branding.logo_url ?? "");
  const [saving, setSaving] = useState(false);

  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [addingHoliday, setAddingHoliday] = useState(false);

  function toggleDay(value: number) {
    setWorkingDays((days) => (days.includes(value) ? days.filter((d) => d !== value) : [...days, value].sort()));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateAppSettings({
        workloadThresholds: thresholds,
        workingDays,
        projectCategories: categories,
        documentTags: tags,
        branding: { primary_color: primaryColor, logo_url: logoUrl.trim() || undefined },
      });
      toast("Workspace settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddHoliday() {
    if (!holidayDate || !holidayName.trim()) return;
    setAddingHoliday(true);
    try {
      await addPublicHoliday(holidayDate, holidayName.trim());
      toast("Holiday added");
      setHolidayDate("");
      setHolidayName("");
      router.refresh();
    } finally {
      setAddingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id: string) {
    await deletePublicHoliday(id);
    toast("Holiday removed");
    router.refresh();
  }

  return (
    <div className="stack-gap">
      <Card>
        <div className="section-title">Capacity defaults</div>
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Workload thresholds control when a team member is flagged Balanced, Almost Full, Needs Support, or Overloaded on Home, Team, and Planning.
        </div>
        <div className="field-row">
          <div className="field">
            <label>Balanced from (%)</label>
            <input
              type="number"
              min={0}
              max={999}
              value={thresholds.balanced}
              onChange={(e) => setThresholds((t) => ({ ...t, balanced: +e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Almost full from (%)</label>
            <input
              type="number"
              min={0}
              max={999}
              value={thresholds.almostFull}
              onChange={(e) => setThresholds((t) => ({ ...t, almostFull: +e.target.value }))}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Needs support from (%)</label>
            <input
              type="number"
              min={0}
              max={999}
              value={thresholds.needsSupport}
              onChange={(e) => setThresholds((t) => ({ ...t, needsSupport: +e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Overloaded above (%)</label>
            <input
              type="number"
              min={0}
              max={999}
              value={thresholds.overloaded}
              onChange={(e) => setThresholds((t) => ({ ...t, overloaded: +e.target.value }))}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="section-title">Working days</div>
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Used for leave-balance calculations on the Day Off page — weekends and days off this list are never counted against someone&apos;s balance.
        </div>
        <div className="chip-select-row">
          {DAY_LABELS.map((d) => (
            <button
              type="button"
              key={d.value}
              className={`chip-select${workingDays.includes(d.value) ? " checked" : ""}`}
              onClick={() => toggleDay(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-title">Public holidays</div>
        {holidays.length > 0 ? (
          <div className="stack-gap" style={{ gap: 6, marginBottom: 12 }}>
            {holidays.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-soft)" }}>
                <span style={{ fontSize: 12.5 }}>
                  <b>{fmt(fromISO(h.date))}</b> — {h.name}
                </span>
                <button className="linklike" onClick={() => handleDeleteHoliday(h.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No public holidays configured.</div>
        )}
        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Name</label>
            <input type="text" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Independence Day" />
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleAddHoliday} disabled={addingHoliday || !holidayDate || !holidayName.trim()}>
          + Add holiday
        </Button>
      </Card>

      <Card>
        <div className="section-title">Project categories</div>
        <div className="field-hint" style={{ marginBottom: 10 }}>Suggested categories offered when creating or editing a project.</div>
        <ChipListEditor items={categories} onChange={setCategories} placeholder="Type a category, press Enter…" />
      </Card>

      <Card>
        <div className="section-title">Document tags</div>
        <div className="field-hint" style={{ marginBottom: 10 }}>Suggested tags offered when uploading a document.</div>
        <ChipListEditor items={tags} onChange={setTags} placeholder="Type a tag, press Enter…" />
      </Card>

      <Card>
        <div className="section-title">Portal branding</div>
        <div className="field-row">
          <div className="field">
            <label>Primary color</label>
            <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#FF4F14" />
          </div>
          <div className="field">
            <label>Logo URL (optional)</label>
            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
            <div className="field-hint">Leave blank to keep the default DIEM mark used across the portal today.</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save workspace settings"}
        </Button>
      </div>
    </div>
  );
}
