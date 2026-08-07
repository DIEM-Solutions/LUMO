"use client";

import { useState } from "react";
import { Avatar, Card } from "@/components/ui/primitives";
import { PersonModal } from "./PersonModal";
import type { Person } from "@/lib/types";

const ROLE_TYPE_LABEL: Record<string, string> = { ceo: "Executive", admin: "Admin", employee: "Employee" };

export function SettingsClient({ currentPerson, people, isAdmin }: { currentPerson: Person; people: Person[]; isAdmin: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

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
        <h2>Team management</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingPerson(null);
            setModalOpen(true);
          }}
        >
          + Add team member
        </button>
      </div>

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

      {modalOpen && <PersonModal onClose={() => setModalOpen(false)} person={editingPerson} />}
    </>
  );
}
