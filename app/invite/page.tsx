"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DiemWordmark } from "@/components/shell/DiemWordmark";

export default function InvitePage() {
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, [supabase]);

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

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.assign("/home");
  }

  return (
    <div id="loginScreen">
      <div className="login-card">
        <div className="diem-wordmark lg">
          <DiemWordmark large />
        </div>

        {checking ? (
          <p className="login-sub">Checking your invite…</p>
        ) : !hasSession ? (
          <>
            <h1 className="login-title">Invite expired</h1>
            <p className="login-sub">
              This invite link is no longer valid. Ask your admin to resend your invite from Settings, or{" "}
              <a href="/login">sign in</a> if you already have a password.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="login-title">Welcome to DIEM Portal</h1>
            <p className="login-sub">Set a password to finish setting up your account.</p>

            <div className="field">
              <label htmlFor="password">Password</label>
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
              <label htmlFor="confirmPassword">Confirm password</label>
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

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Setting up…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
