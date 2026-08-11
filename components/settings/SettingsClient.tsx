"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { updateMyBirthday } from "@/app/(portal)/settings/actions";
import { PersonModal } from "./PersonModal";
import { WorkspaceSettingsPanel } from "./WorkspaceSettingsPanel";
import type { AppSettings, Person, PublicHoliday } from "@/lib/types";

const ROLE_TYPE_LABEL: Record<string, string> = { ceo: "Executive", admin: "Admin", employee: "Employee" };

export function SettingsClient({
  currentPerson,
  people,
  isAdmin,
  settings,
  holidays,
}: {
  currentPerson: Person;
  people: Person[];
  isAdmin: boolean;
  settings: AppSettings;
  holidays: PublicHoliday[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [tab, setTab] = useState<"team" | "workspace">("team");
  const router = useRouter();
  const toast = useToast();
  const [birthday, setBirthday] = useState(currentPerson.birthday ?? "");
  const [savingBirthday, setSavingBirthday] = useState(false);

  async function handleSaveBirthday() {
    setSavingBirthday(true);
    try {
      await updateMyBirthday(birthday || null);
      toast("Birthday saved");
      router.refresh();
    } finally {
      setSavingBirthday(false);
    }
  }

  if (!isAdmin) {
    return (
      <>
        <div className="panel-head-row">
          <h2>My Profile</h2>
        </div>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar person={currentPerson} size="lg" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{currentPerson.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{currentPerson.role} · {currentPerson.email}</div>
            </div>
          </div>
          <div className="myproj-grid" style={{ marginTop: 18 }}>
            <div>
              <span className="myproj-lbl">Weekly capacity</span>
              <span className="myproj-val">{currentPerson.capacity_baseline ?? "—"} days</span>
            </div>
            <div>
              <span className="myproj-lbl">Working arrangement</span>
              <span className="myproj-val">{currentPerson.working_arrangement ?? "—"}</span>
            </div>
            <div>
              <span className="myproj-lbl">Leave balance</span>
              <span className="myproj-val">{currentPerson.leave_balance_days} days / year</span>
            </div>
          </div>
          <div className="field" style={{ marginTop: 18, maxWidth: 240 }}>
            <label>Birthday</label>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleSaveBirthday} disabled={savingBirthday || birthday === (currentPerson.birthday ?? "")} style={{ marginTop: 10 }}>
            {savingBirthday ? "Saving…" : "Save birthday"}
          </Button>
          <div className="field-hint" style={{ marginTop: 16 }}>
            Team management, roles, and permissions are handled by an admin — reach out if something here needs to change.
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="panel-head-row">
        <h2>Settings</h2>
        {tab === "team" && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingPerson(null);
              setModalOpen(true);
            }}
          >
            + Add team member
          </button>
        )}
      </div>

      <div className="subtabs" style={{ marginBottom: 18 }}>
        <button className={`subtab-btn${tab === "team" ? " active" : ""}`} onClick={() => setTab("team")}>
          Team management
        </button>
        <button className={`subtab-btn${tab === "workspace" ? " active" : ""}`} onClick={() => setTab("workspace")}>
          Workspace settings
        </button>
      </div>

      {tab === "team" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Access</th>
                <th>Email</th>
                <th>Capacity</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className={p.active === false ? "admin-inactive" : ""}>
                  <td>
                    <div className="admin-row-name">
                      <Avatar person={p} size="sm" />
                      {p.name}
                    </div>
                  </td>
                  <td>{p.role ?? "—"}</td>
                  <td>{ROLE_TYPE_LABEL[p.role_type]}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>{p.capacity_baseline != null ? `${p.capacity_baseline}d/wk` : "—"}</td>
                  <td>
                    <span className={`cap-status-pill ${p.active === false ? "unknown" : "available"}`}>
                      {p.active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="linklike"
                      onClick={() => {
                        setEditingPerson(p);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkspaceSettingsPanel settings={settings} holidays={holidays} />
      )}

      {modalOpen && <PersonModal onClose={() => setModalOpen(false)} person={editingPerson} />}
    </>
  );
}
