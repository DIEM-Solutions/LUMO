"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState(
    "Sara.chehade@dieminnovate.com"
  );
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

    router.push("/projects");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F7F7FB",
        padding: "24px",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          border: "1px solid #E8E8F2",
          borderRadius: "20px",
          padding: "32px",
        }}
      >
        <h1>DIEM Portal</h1>

        <p style={{ color: "#63637A", marginBottom: "24px" }}>
          Connectez-vous à votre espace.
        </p>

        <label htmlFor="email">Email</label>

        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "6px",
            marginBottom: "16px",
            border: "1px solid #E8E8F2",
            borderRadius: "10px",
          }}
        />

        <label htmlFor="password">Mot de passe</label>

        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "6px",
            marginBottom: "18px",
            border: "1px solid #E8E8F2",
            borderRadius: "10px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "999px",
            background: "#14131B",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        {message && (
          <p style={{ marginTop: "16px", color: "#C23F10" }}>
            {message}
          </p>
        )}
      </form>
    </main>
  );
}