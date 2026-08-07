import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadNotifications } from "@/lib/data/notifications";
import { NotificationBell } from "@/components/shell/NotificationBell";

export async function Topbar({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  const supabase = await createClient();
  const [notifications, { data: projects }] = await Promise.all([
    loadNotifications(),
    supabase.from("projects").select("id,name"),
  ]);
  const projectNames = Object.fromEntries((projects ?? []).map((p) => [p.id as string, p.name as string]));

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="topbar-right">
        {actions}
        <NotificationBell items={notifications} projectNames={projectNames} />
      </div>
    </header>
  );
}
