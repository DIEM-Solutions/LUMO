"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const supabase = createClient();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords don't match.");
      return;
    }
    if (password === currentPassword) {
      setMessage("New password must be different from your current password.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setMessage(userError?.message ?? "Could not verify your account. Please sign in again.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setMessage("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
    toast("Password updated");
  }

  return (
    <>
      <div className="panel-head-row">
        <h2>Change password</h2>
        <Link href="/settings" className="linklike">
          ← Back to Settings
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
          <p className="field-hint" style={{ marginBottom: 16 }}>
            Enter your current password, then choose a new one.
          </p>

          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {message && <div className="form-error">{message}</div>}

          <Button type="submit" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </>
  );
}
