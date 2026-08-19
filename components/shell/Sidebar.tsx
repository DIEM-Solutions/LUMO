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
  unreadBySection = {},
}: {
  person: Person | null;
  logoUrl?: string | null;
  unreadBySection?: Record<string, number>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isCeo = person?.role_type === "ceo";
  const isExec = isCeo || person?.role_type === "admin";
  const sections = isCeo ? SECTIONS.filter((s) => s.href !== "/dayoff") : SECTIONS;

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
        </button>
        <div className="diem-wordmark">
          <DiemWordmark logoUrl={logoUrl} />
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((s) => {
          const active = pathname?.startsWith(s.href);
          const label = s.label === "Home" && !isExec ? "My Workspace" : s.label;
          const unread = unreadBySection[s.href] ?? 0;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`nav-item${active ? " active" : ""}`}
              title={label}
            >
              <Icon name={s.icon} />
              <span className="nav-label">{label}</span>
              {unread > 0 && <span className="nav-badge">{unread > 9 ? "9+" : unread}</span>}
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
