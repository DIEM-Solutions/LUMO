"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createPerson, setPersonActive, updatePerson } from "@/app/(portal)/settings/actions";
import type { Permissions, Person, RoleType } from "@/lib/types";

const PERMISSION_FIELDS: { key: keyof Permissions; label: string }[] = [
  { key: "canCreateProjects", label: "Create & delete projects" },
  { key: "canEditTeam", label: "Manage team & settings (admin)" },
  { key: "canFinalizeRecap", label: "Finalize weekly recap" },
  { key: "canUploadDocuments", label: "Upload documents" },
  { key: "canApproveDayOff", label: "Approve day-off requests" },
];

export function PersonModal({ onClose, person }: { onClose: () => void; person: Person | null }) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [roleType, setRoleType] = useState<RoleType>(person?.role_type ?? "employee");
  const [email, setEmail] = useState(person?.email ?? "");
  const [capacityBaseline, setCapacityBaseline] = useState<string>(person?.capacity_baseline?.toString() ?? "10");
  const [workingArrangement, setWorkingArrangement] = useState(person?.working_arrangement ?? "Full-Time");
  const [leaveBalanceDays, setLeaveBalanceDays] = useState(person?.leave_balance_days ?? 15);
  const [nextAssessmentDate, setNextAssessmentDate] = useState(person?.next_assessment_date ?? "");
  const [permissions, setPermissions] = useState<Permissions>(person?.permissions ?? {});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function togglePerm(key: keyof Permissions) {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Give this person a name.");
      return;
    }
    setSaving(true);
    const input = {
      name: name.trim(),
      role: role.trim(),
      roleType,
      email: email.trim(),
      capacityBaseline: capacityBaseline.trim() ? Number(capacityBaseline) : null,
      workingArrangement: workingArrangement.trim(),
      leaveBalanceDays: Number(leaveBalanceDays) || 15,
      nextAssessmentDate: nextAssessmentDate || null,
      permissions,
    };
    try {
      if (person) {
        await updatePerson(person.id, input);
        toast("Team member updated");
      } else {
        await createPerson(input);
        toast("Team member added");
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!person) return;
    setSaving(true);
    await setPersonActive(person.id, !(person.active ?? true));
    toast(person.active ?? true ? "Deactivated" : "Reactivated");
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={person ? "Edit team member" : "Add team member"}
      wide
      footer={
        <>
          {person ? (
            <Button variant={person.active === false ? "primary" : "danger"} size="sm" onClick={handleToggleActive} disabled={saving}>
              {person.active === false ? "Reactivate" : "Deactivate"}
            </Button>
          ) : (
            <span />
          )}
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {person ? "Save changes" : "Add person"}
            </Button>
          </div>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}
      {!person && (
        <div className="hint-banner">
          This creates their profile. To let them sign in, invite them via Supabase Dashboard → Authentication → Users, using this exact email — their login links to this profile automatically.
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label>Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Farah" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@dieminnovate.com" />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Job title</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Innovation Lead" />
        </div>
        <div className="field">
          <label>Access level</label>
          <select value={roleType} onChange={(e) => setRoleType(e.target.value as RoleType)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="ceo">Executive</option>
          </select>
          <div className="field-hint">Admin and Executive automatically get every permission below.</div>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Weekly capacity (working days)</label>
          <input type="number" min={0} step={0.5} value={capacityBaseline} onChange={(e) => setCapacityBaseline(e.target.value)} />
        </div>
        <div className="field">
          <label>Working arrangement</label>
          <select value={workingArrangement} onChange={(e) => setWorkingArrangement(e.target.value)}>
            <option>Full-Time</option>
            <option>Part-Time</option>
            <option>Intern</option>
            <option>Contractor</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Leave balance (days / year)</label>
          <input type="number" min={0} value={leaveBalanceDays} onChange={(e) => setLeaveBalanceDays(+e.target.value)} />
        </div>
        <div className="field">
          <label>Next assessment date (optional)</label>
          <input type="date" value={nextAssessmentDate} onChange={(e) => setNextAssessmentDate(e.target.value)} />
        </div>
      </div>
      {roleType === "employee" && (
        <div className="field">
          <label>Permissions</label>
          <div className="chip-select-row">
            {PERMISSION_FIELDS.map((f) => (
              <button
                type="button"
                key={f.key}
                className={`chip-select${permissions[f.key] ? " checked" : ""}`}
                onClick={() => togglePerm(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
