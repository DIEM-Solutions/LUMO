"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/lib/icons";
import { Avatar } from "@/components/ui/primitives";
import { DiemWordmark } from "@/components/shell/DiemWordmark";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types";

const SECTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects & Tasks", icon: "projects" },
  { href: "/recap", label: "Weekly Recap", icon: "recap" },
  { href: "/planning", label: "Planning", icon: "planning" },
  { href: "/team", label: "Team", icon: "capacity" },
  { href: "/documents", label: "Documents", icon: "documents" },
  { href: "/dayoff", label: "Request Day Off", icon: "dayoff" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({
  person,
  logoUrl,
  unreadCount = 0,
}: {
  person: Person | null;
  logoUrl?: string | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isExec = person?.role_type === "ceo" || person?.role_type === "admin";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-head">
        <button
          type="button"
          className="burger-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 20 20" fill="none" width="19" height="19">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {unreadCount > 0 && <span className="burger-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>
        <div className="diem-wordmark">
          <DiemWordmark logoUrl={logoUrl} />
        </div>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((s) => {
          const active = pathname?.startsWith(s.href);
          const label = s.label === "Home" && !isExec ? "My Workspace" : s.label;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`nav-item${active ? " active" : ""}`}
              title={label}
            >
              <Icon name={s.icon} />
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="sidebar-profile-btn" onClick={handleLogout} title="Log out">
          <Avatar person={person} />
          <div className="sp-info">
            <div className="sp-name">{person?.name ?? "…"}</div>
            <div className="sp-role">Log out</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
