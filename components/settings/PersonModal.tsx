"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createPerson, inviteTeamMember, setPersonActive, updatePerson } from "@/app/(portal)/settings/actions";
import { JOB_LEVELS } from "@/lib/domain/hierarchy";
import type { Permissions, Person, RoleType } from "@/lib/types";

const PERMISSION_FIELDS: { key: keyof Permissions; label: string }[] = [
  { key: "canCreateProjects", label: "Create & delete projects" },
  { key: "canEditTeam", label: "Manage team & settings (admin)" },
  { key: "canFinalizeRecap", label: "Finalize weekly recap" },
  { key: "canApproveDayOff", label: "Approve day-off requests" },
];

const NO_PROJECT_CREATE_LEVELS = new Set(["Intern", "Junior Innovation Lead"]);

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
  const [birthday, setBirthday] = useState(person?.birthday ?? "");
  const [permissions, setPermissions] = useState<Permissions>(person?.permissions ?? {});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [invitingExisting, setInvitingExisting] = useState(false);

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
      birthday: birthday || null,
      permissions,
    };
    try {
      if (person) {
        await updatePerson(person.id, input);
        toast("Team member updated");
      } else {
        await createPerson(input);
        if (input.email && sendInvite) {
          try {
            await inviteTeamMember(input.email);
            toast("Team member added — invite email sent");
          } catch {
            toast("Team member added, but the invite email failed to send — try again from their profile");
          }
        } else {
          toast("Team member added");
        }
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleInviteExisting() {
    if (!person?.email) return;
    setInvitingExisting(true);
    try {
      await inviteTeamMember(person.email);
      toast("Invite email sent");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInvitingExisting(false);
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
          This creates their profile and, if you leave the box below checked, emails them an invite to set up their portal login — no extra steps needed.
        </div>
      )}
      {person && !person.auth_user_id && (
        <div className="hint-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>This person hasn&apos;t logged in yet — they have no portal access.</span>
          <Button variant="ghost" size="sm" onClick={handleInviteExisting} disabled={invitingExisting || !person.email}>
            {invitingExisting ? "Sending…" : "Send invite"}
          </Button>
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
          {!person && email.trim() && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, fontWeight: 500, color: "var(--ink-soft)" }}>
              <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
              Send them a portal invite email
            </label>
          )}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Job title</label>
          {roleType === "employee" ? (
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">— Unassigned —</option>
              {JOB_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. CEO, General Manager" />
          )}
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
      <div className="field-row">
        <div className="field">
          <label>Birthday (optional)</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </div>
        <div className="field" />
      </div>
      {roleType === "employee" && (
        <div className="field">
          <label>Permissions</label>
          <div className="chip-select-row">
            {PERMISSION_FIELDS.map((f) => {
              const locked = f.key === "canCreateProjects" && NO_PROJECT_CREATE_LEVELS.has(role);
              return (
                <button
                  type="button"
                  key={f.key}
                  className={`chip-select${permissions[f.key] && !locked ? " checked" : ""}`}
                  onClick={() => !locked && togglePerm(f.key)}
                  disabled={locked}
                  title={locked ? "Interns and Junior Innovation Leads can't create projects" : undefined}
                  style={locked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="field-hint">Everyone can upload documents by default.</div>
        </div>
      )}
    </Modal>
  );
}
