import Link from "next/link";
import { computeHealth, isProjectPastTargetDate, openBlockersFor } from "@/lib/domain/health";
import { computeStage } from "@/lib/domain/stage";
import { projectProgress } from "@/lib/domain/progress";
import { fmt, fromISO } from "@/lib/domain/dates";
import type { Store } from "@/lib/domain/store";
import { HealthFlag, PeopleChips, PriorityTag, RunwayBar, StagePill, TypeTag } from "@/components/ui/primitives";
import type { Project } from "@/lib/types";

export function ProjectCard({ project: p, store }: { project: Project; store: Store }) {
  const tasks = store.tasksFor(p.id);
  const stage = computeStage(p, tasks);
  const health = computeHealth(p, tasks, store.data.blockers);
  const pct = projectProgress(p, tasks);
  const activeCt = tasks.filter((tk) => tk.status === "in-progress").length;
  const completedCt = tasks.filter((tk) => tk.status === "done").length;
  const keyBlocker = openBlockersFor(p.id, store.data.blockers)[0];
  const pastTarget = isProjectPastTargetDate(p, tasks);
  const team = (p.team_ids ?? []).map((id) => store.personById(id)).filter(Boolean);
  const owner = store.personById(p.owner_id);
  let flagText = keyBlocker?.title ?? null;
  if (flagText && flagText.length > 64) flagText = flagText.slice(0, 64) + "…";

  return (
    <Link href={`/projects/${p.id}`} className="project-card">
      <div className="pc-top">
        <div className="tags">
          <TypeTag type={p.type} />
          {p.priority && <PriorityTag priority={p.priority} />}
        </div>
      </div>
      <div className="pc-title">{p.name}</div>
      <div className="pc-sub">{owner?.name ?? ""} · Owner</div>
      <div className="pc-row2">
        <StagePill stage={stage} />
        <HealthFlag health={health} />
      </div>
      <div className="pc-people">
        <PeopleChips people={team} />
      </div>
      <div className="runway">
        <div className="runway-labels">
          <span>Progress</span>
          <span className="pct">
            {pct}%{p.progress_manual?.enabled && <span className="adjusted-tag" style={{ marginLeft: 4 }}>Adjusted</span>}
          </span>
        </div>
        <RunwayBar pct={pct} stage={stage} />
      </div>
      <div className="pc-stat-row">
        <span className="pc-stat">{activeCt} active</span>
        <span className="pc-stat">{completedCt} done</span>
        {p.next_deliverable && (
          <span className="pc-stat" title="Next deliverable">
            🎯 {p.next_deliverable.length > 34 ? p.next_deliverable.slice(0, 34) + "…" : p.next_deliverable}
          </span>
        )}
      </div>
      <div className="pc-meta">
        <span>
          {p.start_date ? fmt(fromISO(p.start_date)) : "—"} → {p.end_date ? fmt(fromISO(p.end_date)) : "—"}
        </span>
        {pastTarget && <span className="pc-past-target">Past target date</span>}
      </div>
      {flagText && <div className="pc-blocked-warn">⚠ {flagText}</div>}
      <span className="pc-open">View details →</span>
    </Link>
  );
}
