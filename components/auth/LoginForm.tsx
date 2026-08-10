"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DiemWordmark } from "@/components/shell/DiemWordmark";

export function LoginForm({ logoUrl }: { logoUrl?: string | null }) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Full navigation so the session cookie is on the next document request.
    window.location.assign("/home");
  }

  return (
    <div id="loginScreen">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="diem-wordmark lg">
          <DiemWordmark logoUrl={logoUrl} large />
        </div>

        <h1 className="login-title">Portal</h1>
        <p className="login-sub">Log in to your DIEM account.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && <div className="form-error">{message}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Please wait..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
