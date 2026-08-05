import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { UnlinkedAccount } from "@/components/auth/UnlinkedAccount";
import { getCurrentPerson } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const person = await getCurrentPerson();

  if (!person) {
    return <UnlinkedAccount email={user.email} />;
  }

  return (
    <ToastProvider>
      <div id="appShell" className="active">
        <Sidebar person={person} />
        <div className="main-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
