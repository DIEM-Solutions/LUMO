"use client";

import { useMemo, useState } from "react";
import { fmt, fromISO } from "@/lib/domain/dates";
import { DocumentModal } from "./DocumentModal";
import type { Document, Project } from "@/lib/types";

const UNFILED = "Unfiled";

export function DocumentsClient({
  documents,
  projects,
  canUpload,
}: {
  documents: Document[];
  projects: Project[];
  canUpload: boolean;
}) {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const projectById = (id: string | null) => (id ? projects.find((p) => p.id === id) ?? null : null);

  const folders = useMemo(() => {
    const set = new Set(documents.map((d) => (d.folder?.trim() ? d.folder.trim() : UNFILED)));
    return Array.from(set).sort((a, b) => (a === UNFILED ? 1 : b === UNFILED ? -1 : a.localeCompare(b)));
  }, [documents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      const folder = d.folder?.trim() ? d.folder.trim() : UNFILED;
      if (projectFilter !== "all" && d.project_id !== projectFilter) return false;
      if (folderFilter !== "all" && folder !== folderFilter) return false;
      if (!q) return true;
      const haystack = [d.name, d.category, folder, ...(d.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [documents, search, projectFilter, folderFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Document[]>();
    filtered.forEach((d) => {
      const folder = d.folder?.trim() ? d.folder.trim() : UNFILED;
      const list = map.get(folder) ?? [];
      list.push(d);
      map.set(folder, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a === UNFILED ? 1 : b === UNFILED ? -1 : a.localeCompare(b)));
  }, [filtered]);

  return (
    <>
      <div className="panel-head-row">
        <h2>Documents</h2>
        {canUpload && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingDoc(null);
              setModalOpen(true);
            }}
          >
            + Add document
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="filter-select"
          style={{ minWidth: 200, cursor: "text" }}
          placeholder="Search name, tag, folder…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className="filter-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length ? (
        grouped.map(([folder, docs]) => (
          <div className="proj-group" key={folder}>
            <div className="proj-group-head">
              <span className="proj-group-dot" style={{ background: folder === UNFILED ? "var(--ink-faint)" : "var(--diem-purple)" }} />
              <h3>{folder}</h3>
              <span className="proj-group-count">{docs.length}</span>
            </div>
            <div className="doc-table">
              <div className="doc-row doc-head">
                <div>Name</div>
                <div>Project</div>
                <div>Category</div>
                <div>Tags</div>
                <div>Updated</div>
                <div />
              </div>
              {docs.map((d) => {
                const proj = projectById(d.project_id);
                return (
                  <div
                    className="doc-row"
                    key={d.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setEditingDoc(d);
                      setModalOpen(true);
                    }}
                  >
                    <div className="doc-name">{d.name}</div>
                    <div>{proj?.name ?? "—"}</div>
                    <div>{d.category}</div>
                    <div>
                      {d.tags?.length ? (
                        <div className="tag-chip-row">
                          {d.tags.map((t) => (
                            <span className="tag-chip" key={t}>{t}</span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div>{fmt(fromISO(d.updated_date))}</div>
                    <div className="doc-actions">
                      {d.link_url && (
                        <a
                          className="icon-btn"
                          href={d.link_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open link"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="card">
          <div className="empty-state">
            {documents.length ? "No documents match your search." : "No documents yet — add the first one to get started."}
          </div>
        </div>
      )}

      {modalOpen && (
        <DocumentModal
          onClose={() => setModalOpen(false)}
          document={editingDoc}
          projects={projects}
          canDelete={canUpload}
        />
      )}
    </>
  );
}
