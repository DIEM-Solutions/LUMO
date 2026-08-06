import Link from "next/link";
import { computeCapacity } from "@/lib/domain/capacity";
import { round } from "@/lib/domain/dates";
import type { Store } from "@/lib/domain/store";
import { Avatar } from "@/components/ui/primitives";
import type { Project } from "@/lib/types";

function clientInternalSplit(personId: string, store: Store) {
  const tasks = store.activeTasksForPerson(personId);
  if (!tasks.length) return null;
  let client = 0;
  let internal = 0;
  tasks.forEach((tk) => {
    const p = store.projectById(tk.project_id);
    if (!p) return;
    if (p.type === "client") client++;
    else internal++;
  });
  const total = client + internal;
  if (!total) return null;
  return { clientPct: round((client / total) * 100), internalPct: round((internal / total) * 100) };
}

export function MatrixTable({ projects, store }: { projects: Project[]; store: Store }) {
  const people = store.data.people.filter((p) => p.role_type !== "ceo");

  return (
    <>
      <div className="matrix-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Team member</th>
              {projects.map((p) => (
                <th className="matrix-proj-head" key={p.id}>
                  <div className="mph-name">{p.name}</div>
                  <span className={`tag ${p.type}`}>{p.type === "client" ? "Client" : "Internal"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const cap = computeCapacity(person.id, store);
              const split = clientInternalSplit(person.id, store);
              return (
                <tr key={person.id}>
                  <td className="matrix-person-cell">
                    <Avatar person={person} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="mp-name">{person.name}</div>
                      <div className="mp-role">{person.role}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span className={`cap-status-pill ${cap.band}`}>{cap.label}</span>
                        {cap.pct != null && (
                          <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                            {cap.pct}%{cap.source === "reported" ? "*" : ""}
                          </span>
                        )}
                      </div>
                      {split && (
                        <div
                          className="matrix-split-bar"
                          title={`${split.clientPct}% client · ${split.internalPct}% internal`}
                        >
                          <div style={{ width: `${split.clientPct}%`, background: "var(--client-fg)" }} />
                          <div style={{ width: `${split.internalPct}%`, background: "var(--internal-fg)" }} />
                        </div>
                      )}
                    </div>
                  </td>
                  {projects.map((p) => {
                    const isOwner = p.owner_id === person.id;
                    const onTeam = (p.team_ids ?? []).includes(person.id);
                    if (!isOwner && !onTeam) {
                      return (
                        <td className="matrix-cell" key={p.id}>
                          <span className="matrix-chip dash">—</span>
                        </td>
                      );
                    }
                    const taskCount = store
                      .tasksFor(p.id)
                      .filter((tk) => store.isAssignedTo(tk, person.id) && tk.status !== "done").length;
                    return (
                      <td className="matrix-cell" key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className={`matrix-chip${isOwner ? " owner" : ""}`}
                          title={`${taskCount} active task${taskCount === 1 ? "" : "s"} on this project`}
                        >
                          {isOwner ? "Owner" : "Member"}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10 }}>
        * reported, not recalculated · bar under name = client / internal split of active tasks
      </div>
    </>
  );
}
