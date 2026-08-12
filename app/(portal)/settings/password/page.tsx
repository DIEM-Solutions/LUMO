import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/Topbar";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { getCurrentPerson } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  return (
    <>
      <Topbar eyebrow="DIEM Portal" title="Change password" />
      <main className="content">
        <ChangePasswordForm />
      </main>
    </>
  );
}
