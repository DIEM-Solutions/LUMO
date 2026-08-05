"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createProject, deleteProject, updateProject } from "@/app/(portal)/projects/actions";
import { toISO, addDays, today } from "@/lib/domain/dates";
import type { Person, Project } from "@/lib/types";

export function ProjectModal({
  open,
  onClose,
  project,
  people,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  people: Person[];
}) {
  const router = useRouter();
  const toast = useToast();
  const eligibleOwners = people.filter((p) => p.role_type !== "ceo");

  const [name, setName] = useState("");
  const [type, setType] = useState<"client" | "internal">("client");
  const [clientOrCategory, setClientOrCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state is only initialized on mount; re-sync whenever the modal opens
  // so edit always shows the current project (or empty defaults for create).
  useEffect(() => {
    if (!open) return;
    const owners = people.filter((p) => p.role_type !== "ceo");
    setName(project?.name ?? "");
    setType(project?.type ?? "client");
    setClientOrCategory(project ? project.client ?? project.category ?? "" : "");
    setStartDate(project?.start_date ?? toISO(today()));
    setEndDate(project?.end_date ?? toISO(addDays(today(), 60)));
    setOwnerId(project?.owner_id ?? owners[0]?.id ?? "");
    setTeamIds(project?.team_ids ?? []);
    setError("");
  }, [open, project, people]);

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    setSaving(true);
    const input = { name: name.trim(), type, clientOrCategory: clientOrCategory.trim(), startDate, endDate, ownerId, teamIds };
    try {
      if (project) {
        await updateProject(project.id, input);
        toast("Project updated");
      } else {
        await createProject(input);
        toast("Project created");
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}" and all its tasks? This can't be undone.`)) return;
    setSaving(true);
    await deleteProject(project.id);
    toast("Project deleted");
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      subtitle={project?.name}
      wide
      footer={
        <>
          {project ? (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </div>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label>Project name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp — Growth Strategy" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as "client" | "internal")}>
            <option value="client">Client</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div className="field">
          <label>{type === "client" ? "Client name" : "Internal category"}</label>
          <input type="text" value={clientOrCategory} onChange={(e) => setClientOrCategory(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Due date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Owner</label>
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {eligibleOwners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Supporting team members</label>
        <div className="chip-select-row">
          {eligibleOwners.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`chip-select${teamIds.includes(p.id) ? " checked" : ""}`}
              onClick={() => toggleTeam(p.id)}
            >
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="field-hint">The owner is added automatically. Health and stage are calculated automatically from tasks.</div>
      </div>
    </Modal>
  );
}
