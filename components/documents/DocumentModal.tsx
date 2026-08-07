"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createDocument, deleteDocument, updateDocument } from "@/app/(portal)/documents/actions";
import type { Document, Project } from "@/lib/types";

const CATEGORIES = ["Contract", "Proposal", "Deliverable", "Meeting Notes", "Reference", "Other"];

export function DocumentModal({
  onClose,
  document,
  projects,
  canDelete,
}: {
  onClose: () => void;
  document: Document | null;
  projects: Project[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(document?.name ?? "");
  const [projectId, setProjectId] = useState(document?.project_id ?? "");
  const [category, setCategory] = useState(document?.category ?? "Other");
  const [folder, setFolder] = useState(document?.folder ?? "");
  const [linkUrl, setLinkUrl] = useState(document?.link_url ?? "");
  const [tagsInput, setTagsInput] = useState(document?.tags?.join(", ") ?? "");
  const [fileNote, setFileNote] = useState(document?.file_note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError("Give the document a name.");
      return;
    }
    setSaving(true);
    const input = {
      name: name.trim(),
      projectId: projectId || null,
      category,
      folder: folder.trim(),
      linkUrl: linkUrl.trim(),
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      fileNote: fileNote.trim(),
    };
    try {
      if (document) {
        await updateDocument(document.id, input);
        toast("Document updated");
      } else {
        await createDocument(input);
        toast("Document added");
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!document) return;
    if (!confirm(`Remove "${document.name}" from the repository?`)) return;
    setSaving(true);
    await deleteDocument(document.id);
    toast("Document removed");
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={document ? "Edit document" : "Add document"}
      wide
      footer={
        <>
          {document && canDelete ? (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="modal-foot-actions">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {document ? "Save changes" : "Add document"}
            </Button>
          </div>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MoC Incubator — Handover Deck" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Project (optional)</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— Not linked to a project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Folder (optional)</label>
          <input type="text" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. Client Handovers" />
        </div>
        <div className="field">
          <label>Tags (comma-separated)</label>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. handover, final" />
        </div>
      </div>
      <div className="field">
        <label>Link</label>
        <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Paste the Drive / SharePoint link" />
        <div className="field-hint">There&apos;s no file storage set up yet — link to wherever the file actually lives for now.</div>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea value={fileNote} onChange={(e) => setFileNote(e.target.value)} placeholder="Any context worth logging" />
      </div>
    </Modal>
  );
}
