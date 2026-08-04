"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  project_type: "client" | "internal";
  category: string | null;
  priority: "low" | "medium" | "high";
  start_date: string | null;
  end_date: string | null;
  progress_override: number | null;
  health_override: string | null;
};

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProjects() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, project_type, category, priority, start_date, end_date, progress_override, health_override"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
      } else {
        setProjects(data ?? []);
      }

      setLoading(false);
    }

    loadProjects();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7FB",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <p style={{ color: "#63637A", margin: 0 }}>DIEM Portal</p>
            <h1 style={{ marginTop: "4px" }}>Projects</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              borderRadius: "999px",
              border: "1px solid #E8E8F2",
              background: "white",
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </header>

        {loading && <p>Chargement des projets…</p>}

        {message && (
          <p style={{ color: "#C23F10" }}>
            Erreur Supabase : {message}
          </p>
        )}

        {!loading && !message && projects.length === 0 && (
          <p>Aucun projet trouvé.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {projects.map((project) => (
            <article
              key={project.id}
              style={{
                background: "white",
                border: "1px solid #E8E8F2",
                borderRadius: "18px",
                padding: "22px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background:
                    project.project_type === "client"
                      ? "#EAEAFC"
                      : "#F0EAF8",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {project.project_type}
              </span>

              <h2 style={{ marginBottom: "8px" }}>{project.name}</h2>

              <p style={{ color: "#63637A" }}>
                Category: {project.category ?? "—"}
              </p>

              <p>Priority: {project.priority}</p>
              <p>Progress: {project.progress_override ?? 0}%</p>
              <p>Health: {project.health_override ?? "—"}</p>

              <p style={{ color: "#63637A", fontSize: "14px" }}>
                {project.start_date ?? "—"} →{" "}
                {project.end_date ?? "—"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}