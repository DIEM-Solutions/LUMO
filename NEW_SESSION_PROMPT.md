# Starter prompt for a new Claude Code session on this repo

Paste this as your first message to a fresh Claude Code session (a new
account, a new machine, whatever has zero prior context on this repo)
before asking it to make any change. Fill in the `<<...>>` part at the
bottom with the actual task.

---

You're working in the DIEM Portal repo (`diem-portal-app`) — an internal
Next.js 16 + Supabase app for DIEM Innovate: projects, tasks, team
capacity, a planning calendar, weekly recap, documents, day-off requests.

Before doing anything else:

1. Read `HANDOFF.md` in the repo root, in full. It's the real handoff
   doc — architecture, the permission model, how capacity/progress are
   calculated, past bugs and why they happened, and quick recipes for
   common changes. Don't skip it and don't rely on assumptions from
   other Next.js/Supabase projects you've seen — this one has its own
   conventions and a few hard-won lessons documented there.
2. Read `AGENTS.md`. This Next.js version has real breaking changes
   from what you may already "know" from training — check
   `node_modules/next/dist/docs/` for the actual current API before
   writing data-fetching or caching code, don't pattern-match from
   memory.
3. Note the ground rules that apply to every change here, not just
   this one:
   - Every Server Action that writes data must end with
     `revalidatePath(...)` for every page that shows that data, or the
     change won't appear until a hard refresh.
   - If you add or touch a permission check, the app-side check
     (`personPermissions()`) and the database RLS policy
     (`is_admin()` / `has_permission(...)`) must use the exact same
     rule. They've drifted apart before and it caused a real,
     hard-to-notice bug (silent save failures).
   - Never add a "manual override" column (jsonb or otherwise) without
     also building the real UI to set *and clear* it in the same
     change. Two different features shipped that way, both became
     permanently-stuck values because nothing ever wrote to them again
     after the first release — search "manual_utilization" and
     "progress_manual" in `HANDOFF.md` for the actual story.
   - Only `in-progress` tasks count toward anyone's workload/capacity
     — not-started and blocked tasks don't, on purpose
     (`computeLoadHours` in `lib/domain/capacity.ts`).
   - Database changes are a new numbered file in
     `supabase/migrations/`, never an edit to an old one. After
     writing it, tell the user to paste *just the SQL* into the
     Supabase SQL editor themselves — you don't have a way to run it.
   - Never ask for, accept, or use real login credentials to sign into
     the live app yourself, even if offered directly. Verify changes
     by reading the code, running `npx tsc --noEmit`, `npx eslint .`,
     and `npx next build` (all three, not just one), and asking the
     user to check the live result — not by logging in.
   - Deploy is just `git push origin main` — Vercel auto-deploys, no
     manual step. Don't touch Vercel settings.
   - Match the existing visual language before inventing new UI. Grep
     `app/globals.css` and nearby components for existing patterns
     (the `.plan-*` classes, `.cap-status-pill`, `CapacityBar`, etc.)
     before adding new markup — several views were already unified
     onto shared styles and it's easy to accidentally fork them again.

Now, here's the actual task:

<<Describe the change you want made — what page/feature, what should
happen, and why, in your own words. If it's a bug, describe exactly
what's wrong and where you saw it (a screenshot helps a lot). If it's
a new feature, say what problem it solves for you, not just what
button to add.>>
