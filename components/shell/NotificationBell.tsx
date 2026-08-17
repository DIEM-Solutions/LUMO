"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_ICON, relativeTime } from "@/components/activity/ActivityFeedList";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(portal)/notifications/actions";
import type { NotificationItem } from "@/lib/data/notifications";

function hrefFor(item: NotificationItem): string {
  switch (item.kind) {
    case "task_completed":
    case "task_created":
    case "project_updated":
    case "task_assigned":
    case "task_updated":
    case "note_mention":
    case "approval_requested":
    case "team_changed":
      return item.project_id ? `/projects/${item.project_id}` : "/projects";
    case "document_uploaded":
      return "/documents";
    case "dayoff_requested":
    case "dayoff_decided":
      return "/dayoff";
    case "support_request_updated":
      return "/team";
    default:
      return "/home";
  }
}

export function NotificationBell({ items, projectNames }: { items: NotificationItem[]; projectNames: Record<string, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((i) => i.unread).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleItemClick(item: NotificationItem) {
    setOpen(false);
    if (item.unread) {
      await markNotificationRead(item.id);
    }
    router.push(hrefFor(item));
    router.refresh();
  }

  async function handleMarkAllRead() {
    const unreadIds = items.filter((i) => i.unread).map((i) => i.id);
    if (!unreadIds.length) return;
    await markAllNotificationsRead(unreadIds);
    router.refresh();
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
      >
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="linklike" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notif-panel-list">
            {items.length ? (
              items.map((item) => (
                <button key={item.id} className={`notif-item${item.unread ? " unread" : ""}`} onClick={() => handleItemClick(item)}>
                  <div className={`activity-icon ${item.kind}`}>{ACTIVITY_ICON[item.kind]}</div>
                  <div className="notif-item-body">
                    <div className="notif-item-title">{item.title}</div>
                    <div className="notif-item-meta">
                      {item.project_id && projectNames[item.project_id] ? `${projectNames[item.project_id]} · ` : ""}
                      {relativeTime(item.created_at)}
                    </div>
                  </div>
                  {item.unread && <span className="notif-dot" />}
                </button>
              ))
            ) : (
              <div className="empty-state">You&apos;re all caught up.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
