"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UnlinkedAccount({ email }: { email?: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main style={{ padding: 48, maxWidth: 480, margin: "10vh auto", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Account not linked</h1>
      <p style={{ opacity: 0.75, lineHeight: 1.5, marginBottom: 24 }}>
        {email ? (
          <>
            You are signed in as <strong>{email}</strong>, but no team profile is
            linked to this login yet. Ask an admin to connect your account, or
            run the person-link migration in Supabase.
          </>
        ) : (
          <>
            Your login works, but no team profile is linked. Contact an admin.
          </>
        )}
      </p>
      <button type="button" className="btn btn-primary" onClick={handleSignOut}>
        Sign out
      </button>
    </main>
  );
}
