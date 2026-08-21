import Link from "next/link";
import { computeHealth, isProjectPastTargetDate, openBlockersFor } from "@/lib/domain/health";
import { computeStage } from "@/lib/domain/stage";
import { projectProgress } from "@/lib/domain/progress";
import { fmt, fromISO } from "@/lib/domain/dates";
import type { Store } from "@/lib/domain/store";
import { AvatarStack, HealthFlag, PriorityTag, RunwayBar, StagePill, TypeTag } from "@/components/ui/primitives";
import type { Project } from "@/lib/types";

export function ProjectCard({ project: p, store }: { project: Project; store: Store }) {
  const tasks = store.tasksFor(p.id);
  const stage = computeStage(p, tasks);
  const health = computeHealth(p, tasks, store.data.blockers);
  const pct = projectProgress(p, tasks);
  const keyBlocker = openBlockersFor(p.id, store.data.blockers)[0];
  const pastTarget = isProjectPastTargetDate(p, tasks);
  const team = (p.team_ids ?? []).map((id) => store.personById(id)).filter(Boolean);
  const owner = store.personById(p.owner_id);
  let flagText = keyBlocker?.title ?? null;
  if (flagText && flagText.length > 48) flagText = flagText.slice(0, 48) + "…";

  return (
    <Link href={`/projects/${p.id}`} className="project-card">
      <div className="pc-top">
        <div className="tags">
          <TypeTag type={p.type} />
          {p.priority && <PriorityTag priority={p.priority} />}
        </div>
        <AvatarStack people={team} />
      </div>
      <div className="pc-title">{p.name}</div>
      <div className="pc-sub">{owner?.name.split(" ")[0] ?? "—"} · Owner</div>
      <div className="pc-row2">
        <StagePill stage={stage} />
        <HealthFlag health={health} />
      </div>
      <div className="runway">
        <div className="runway-labels">
          <span>Progress</span>
          <span className="pct">{pct}%</span>
        </div>
        <RunwayBar pct={pct} stage={stage} />
      </div>
      <div className="pc-meta">
        <span>
          {p.end_date ? fmt(fromISO(p.end_date)) : "—"}
          {pastTarget && (
            <span className="pc-past-target" title="Past target date">
              {" "}⚠
            </span>
          )}
        </span>
        {p.next_deliverable && stage !== "done" && (
          <span title={p.next_deliverable}>
            🎯 {p.next_deliverable.length > 28 ? p.next_deliverable.slice(0, 28) + "…" : p.next_deliverable}
          </span>
        )}
      </div>
      {flagText && <div className="pc-blocked-warn">⚠ {flagText}</div>}
    </Link>
  );
}
