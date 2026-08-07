import { dayDiff, fromISO, today } from "@/lib/domain/dates";
import type { ActivityKind, ActivityLogEntry, Project } from "@/lib/types";

export const ACTIVITY_ICON: Record<ActivityKind, string> = {
  task_completed: "✓",
  task_created: "+",
  document_uploaded: "📄",
  project_updated: "📋",
  dayoff_requested: "🌴",
  dayoff_decided: "🌴",
};

export function relativeTime(iso: string): string {
  const d = fromISO(iso.slice(0, 10));
  const diffDays = dayDiff(d, today());
  const created = new Date(iso);
  const hours = Math.floor((Date.now() - created.getTime()) / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return created.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeedList({
  entries,
  projects,
  limit,
}: {
  entries: ActivityLogEntry[];
  projects: Project[];
  limit?: number;
}) {
  const list = limit ? entries.slice(0, limit) : entries;

  if (!list.length) {
    return <div className="empty-state">Nothing&apos;s happened yet — activity will show up here as the team works.</div>;
  }

  return (
    <div className="activity-list">
      {list.map((e) => {
        const proj = e.project_id ? projects.find((p) => p.id === e.project_id) : null;
        return (
          <div className="activity-row" key={e.id}>
            <div className={`activity-icon ${e.kind}`}>{ACTIVITY_ICON[e.kind]}</div>
            <div className="activity-body">
              <div className="activity-title">{e.title}</div>
              <div className="activity-meta">
                {proj ? `${proj.name} · ` : ""}
                {relativeTime(e.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
