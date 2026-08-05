import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { getCurrentPerson } from "@/lib/auth/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();

  if (!person) {
    redirect("/login");
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
