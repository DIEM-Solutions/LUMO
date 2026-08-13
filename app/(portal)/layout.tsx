import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { UnlinkedAccount } from "@/components/auth/UnlinkedAccount";
import { getCurrentPerson } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadAppSettings } from "@/lib/data/settings";
import { loadNotifications, unreadCountsBySection } from "@/lib/data/notifications";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [person, settings, notifications] = await Promise.all([
    getCurrentPerson(),
    loadAppSettings(),
    loadNotifications(),
  ]);

  if (!person) {
    return <UnlinkedAccount email={user.email} />;
  }

  const unreadBySection = unreadCountsBySection(notifications);

  return (
    <ToastProvider>
      <div id="appShell" className="active">
        <Sidebar person={person} logoUrl={settings.branding.logo_url} unreadBySection={unreadBySection} />
        <div className="main-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
