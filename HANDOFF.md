# DIEM Portal — Handoff Document

Written by Sara Chehade, end of internship. This is the real story of how the portal works and why — not a generic README. Read this before touching the code.

---

## 1. What this actually is

An internal tool for DIEM: projects, tasks, team capacity, planning calendar, weekly recap, documents, day-off requests. Started as a static HTML prototype (`diem-portal-merged_4_8.html` at the repo root — kept for reference, not used anymore) with no backend and no real login. Rebuilt from scratch as a real app with a real database.

**Live app:** lumo-lime-three.vercel.app (also mapped to lumo.dieminnovate.com)
**Repo:** github.com/DIEM-Solutions/LUMO
**Stack:** Next.js 16 (App Router), Supabase (Postgres + Auth), deployed on Vercel.

---

## 2. The one rule that explains most of the architecture

**Every page fetches fresh from the database on every visit. Nothing is pre-built or stale.** No admin ever edits a JSON file or waits for a rebuild — they click Save, the database changes, the next person who loads a page sees it immediately.

This is why:
- Pages are Server Components (`app/(portal)/*/page.tsx`) that call `await` on data loaders directly, no client-side loading spinners for initial data.
- All writes go through Server Actions (`"use server"` functions in `actions.ts` files next to each feature). A Server Action always ends with `revalidatePath(...)` on every page that shows that data — if you add a new mutation and forget this, the change saves but nobody sees it until they hard-refresh. This is the #1 bug you'll hit if you add a feature and skip it.

---

## 3. Where the logic lives

- `app/(portal)/<feature>/page.tsx` — fetches data, no business logic.
- `app/(portal)/<feature>/actions.ts` — Server Actions, the only place that writes to the database.
- `components/<feature>/*.tsx` — UI. Client components (`"use client"`) hold form state and call the Server Actions.
- `lib/domain/*.ts` — **pure calculation functions, no database calls.** `computeStage`, `computeHealth`, `computeAutoProgress`, `computeCapacity`, `buildNeedsAttention`, etc. Given the same data, they always return the same answer. If you're debugging "why does this show the wrong number," start here, not in the UI.
- `lib/data/*.ts` — the actual Supabase queries (`loadPortalData`, `loadAppSettings`, `loadNotifications`...).
- `supabase/migrations/*.sql` — every database change, in order, numbered. Currently at 021. **Never edit an old migration file** — write a new numbered one, even for a one-line fix.

---

## 4. Permissions — how "who can do what" actually works

Two layers, and they must agree with each other or you get silent bugs:

1. **In the app:** `people.role_type` is `'ceo' | 'admin' | 'employee'`, plus a `people.permissions` jsonb column with flags like `canCreateProjects`, `canEditTeam`, `canApproveDayOff`. `personPermissions()` in `lib/auth/session.ts` combines both into one object components check.
2. **In the database (RLS):** every table has row-level security policies that check `is_admin()` (role_type only) or `has_permission('canX')` (role_type OR the jsonb flag).

**The bug that bit us:** `app_settings`'s RLS policy checked `is_admin()` only, but the Settings page UI let anyone with `canEditTeam` open the panel. An employee with that flag could edit branding, see "saved," and nothing would actually persist — RLS silently filtered the update, no error thrown. Fixed in migration 015. **If you add a new admin-only feature, make sure the RLS policy and the UI permission check use the exact same rule**, or you'll reproduce this bug.

---

## 5. Stage / Health / Progress — the core calculation

Every project shows a **stage** (not started / in progress / done), a **health** (on track / at risk / blocked), and a **progress %** — all computed live from real task data, always, with no manual override path anymore.

- `computeAutoProgress` (`lib/domain/progress.ts`): weighted average of task completion, weighted by each task's **`workload_hours`** — the same hours number already used for capacity, one source of truth instead of two. A `done` task counts 100%, `in-progress` counts 50% unless someone set a specific `progress_pct` override, `blocked`/`not-started` count 0% unless overridden.
- **The bug that bit us (#1):** `tasks.progress_pct` had a leftover `DEFAULT 0` from before this rebuild. Every new task silently got `progress_pct = 0` instead of `NULL`. The formula treats "not null" as "someone explicitly overrode this" — so a fresh in-progress task contributed 0% instead of the intended 50%, and a project with one in-progress task could show "Not Started." Fixed in migration 014.
- **The bug that bit us (#2, found late):** projects used to have a `progress_manual` override and tasks used to have a separate `weight` (%) field for progress weighting. Nothing in the UI ever wrote to `progress_manual` after a point, but the calculation still honored it whenever it was set — so a project could stay permanently stuck at a stale percentage (e.g. "90%") no matter how far the real tasks actually were, because auto-progress only outranked the manual figure once it reached exactly 100%. Both `progress_manual`/`progress_manual_log` and `weight` were dropped entirely in migration 018 — progress is now always the live computed number, full stop. **Lesson: a "manual override" column with no UI to set or clear it is a landmine, not a feature.** This is the same failure shape as `manual_utilization` in §6 below — watch for it if you're ever tempted to add a jsonb "override" column without also building the clear/reset path in the same change.

---

## 6. Capacity — hours, not days

Originally everything was measured in "days" (a task took 1.5 days, a person had 10 days of capacity per 2 weeks). Changed to real hours at Sara's team's request (8-hour workday standard). Migration 016 renamed and converted the columns:

- `tasks.workload_days` → `tasks.workload_hours` (×8)
- `tasks.remaining_days` → `tasks.remaining_hours` (×8)
- `people.capacity_baseline` → `people.weekly_capacity_hours` (×4 — it used to mean "days per 2-week window," now means "hours per week")

**Only `in-progress` tasks count toward someone's load.** `not-started` (no work has happened) and `blocked` (work has stalled) are both excluded — see `computeLoadByProject` / `computeLoadHours` in `lib/domain/capacity.ts`. This was a deliberate late change; if capacity numbers ever look wrong again, check these first, they're the single source of truth used by daily capacity, weekly capacity, the main capacity card, and the Team page's workload bars.

**How load is spread (`taskLoadDays`):** an in-progress task's *remaining* hours (`remaining_hours`, else `workload_hours`) are spread evenly over working days **from today to its due date**. Overdue or undated in-progress work is squeezed into what's left of the current week (to Friday). This is forward-looking on purpose. The old model spread a task's hours from its *start date*, so a long-running task whose original span was in the past counted **0h** even though it was still in progress, and everyone looked nearly empty. `taskWorkingDays` (start-date based) still exists but only for drawing chips on the Calendar tab; don't use it for capacity.

**"This week" = the rest of this week.** `computeWeeklyCapacity` measures from today to the end of the week on both sides: booked hours in that window vs. capacity for the remaining working days (weekly hours ÷ 5 per day), minus approved leave. On a Thursday, a 40h person shows "6h of 16h left this week". Always render these figures with `hoursOfLabel()` ("3h of 8h today" / "6h of 16h left this week"). A bare "6/16h" was ambiguous once "this week" started meaning the rest of it. On a weekend, "this week" is the coming week (`currentWeekStart`). A past week has nothing left to measure, so the Calendar tab hides its capacity pill for past weeks (`isPastWeek`). **Known limitation:** the week's working days are hardcoded Mon–Fri (`isWeekend`, `WORK_DAYS_PER_WEEK`, and a Friday end-of-week in `taskLoadDays`). Settings → Working days is only used by the Day Off page today. `computeCapacity` uses this same figure, so the card %, the heat map's "This week", the Team workload bar and Home all agree.

**The label always matches the %.** `computeCapacity`'s band is purely `bandFor(pct, thresholds)` against Settings → Capacity defaults. **The bug that bit us:** blocked/overdue tasks used to *override* the label ("Needs Support" for any overdue or blocked task, "Overloaded" for overdue + blocked or 9+ open tasks, where one blocked-and-past-due task counted as both). That produced "Overloaded" at 3% booked and emptied "Can provide support", and it also let not-started/blocked tasks drive the label, against the in-progress-only rule. Overdue/blocked work is now a **separate warning chip** (`CapWarningChip` in `components/ui/primitives.tsx`, `.reason-chip.warn`) from `cap.overdueCount` / `cap.blockedCount`, shown next to the pill on Team, Home and the Projects matrix. **Don't fold warnings back into the label.** If something should raise attention, add it to the chip.

**Team page specifics (`components/team/TeamClient.tsx`):**
- **Workload distribution bar:** the full width is the person's remaining capacity this week; each segment is a project's in-progress hours in that same window (`computeLoadByProject`). So the bar length equals the capacity %, labelled "x/yh". Over capacity, the bar is full and the label turns red with the %. (It used to normalize to the person's own total, so 2h of work drew a full bar.)
- **Main project** = the biggest segment of that bar (most in-progress hours this week). With no in-progress work it falls back to the soonest-ending active project they're a member of, labelled **"Next deadline"**, not "Main project".
- **Can provide support** = Available/Balanced by the same %, not on leave today, sorted most-available first, showing "% available" plus the warning chip. Overdue/blocked work doesn't exclude anyone.
- The CEO Home donut shows Needs support and Overloaded as separate slices (they used to be merged into "Overloaded").

**Dead column to know about:** `people.manual_utilization` (jsonb) still exists in the schema but nothing writes to it anymore — there's no UI for it. It used to silently override the real calculation with a frozen, never-updating number (this is why one person's capacity looked permanently stuck at "44/40" no matter what changed). The code no longer reads it. **Don't resurrect this pattern** — if you want a manual override for capacity, build a real UI for it with a way to clear it, don't just set a jsonb field once and forget it.

**Shared capacity UI:** `CapStatusPill` and `CapacityBar` (`components/ui/primitives.tsx`) render the 5-band color system (Available → Balanced → Almost full → Needs support → Overloaded, tokens `--cap-*-bg`/`--cap-*-fg` in `globals.css`). Reused as-is on the Team page and in the Calendar tab's week view (§9) — if you show a busyness number anywhere new, reuse these two components instead of inventing another badge style.

---

## 7. Notifications — how they actually reach the right person

Not a broadcast feed. Every notification-worthy action computes **actual recipients** (the assignee, the project owner, the approver, the mentioned person...) and only those people see it.

- `activity_log` — one row per event (what happened).
- `notification_reads` — one row per (event, recipient), inserted unread at creation time, marked read when opened. This is the per-person inbox.
- `logActivity()` in `lib/data/activity.ts` takes a `recipientIds` array. **If you add a new mutation that should notify someone, call `logActivity` with the real recipient IDs — don't broadcast to everyone "except the actor," that was the old (wrong) model.**
- Sidebar badges (`unreadCountsBySection` in `lib/data/notifications.ts`) map each activity `kind` to a nav section (`/projects`, `/documents`, `/dayoff`...). New notification kind → add it to that mapping or the badge won't show up anywhere.

**Task approvals:** a task can name a `approval_person_id` (set from the task modal), which used to only ever *ask* — nothing recorded an actual decision. `decideTaskApproval()` in `app/(portal)/projects/actions.ts` now lets the named approver record approved / rejected / info-requested (with an optional comment) directly from the task modal, storing it in `tasks.approval_decision` and notifying the assignee(s). The modal only shows the decision buttons to the person who matches `approval_person_id` — everyone else just sees "Waiting on {name}'s approval." The CEO's Home priorities already excluded decided approvals from "needs attention" (`needsAttention.ts` only surfaces a null or `info-requested` decision), so recording a real decision now correctly clears that item without any change needed there.

**The bug that bit us:** notifications silently stopped reaching anyone for 13 days (found by querying the live database directly — `activity_log` kept recording events correctly, but zero `notification_reads` rows were created for any recipient, for any actor, after a specific date). Root cause: inserting *someone else's* unread inbox row needs a specific RLS policy (`notification_reads_insert_any`) that was correctly set up when notifications were redesigned — it just drifted or got reverted outside the tracked migrations at some point (nothing in this repo's migration history since then touches that table). Fixed by re-asserting the policies in migration 020. The real lesson: `logActivity()`'s insert into `notification_reads` had **no error handling at all** — a failed write was completely invisible, which is exactly how this went unnoticed for nearly two weeks. It now logs a `console.error` on failure (check Vercel's server logs if notifications ever go quiet again — don't assume it's a code bug before checking the logs).

**@mentions:** typing `@Name` in a task's Notes field (`components/projects/MentionTextarea.tsx`) notifies that person once, tracked via `tasks.notes_mentioned_ids` so re-saving the same note without new mentions doesn't spam them again.

---

## 8. Subtasks

A subtask is just a normal task with `parent_task_id` set (migration 017). It has its own assignee, status, workload — it counts in every calculation exactly like a regular task. No special roll-up logic on purpose: a project's progress is still the weighted average of *every* task, subtasks included. Kept to one level of nesting (a subtask can't itself have subtasks) to keep the UI simple — see the `hasSubtasks` check in `TaskModal.tsx`.

---

## 9. Planning & Calendar — the shared grid pattern

Two subtabs on `/planning` (`components/planning/PlanningClient.tsx`): **Two-Week Planning** (`PlanningBoard.tsx`) and **Calendar** (`CalendarView.tsx`, Week/2-Weeks views only — Month and Day are still the older date-grid style and haven't been redone the same way, see §15). Both grids ended up sharing the same visual language after several rounds of real feedback, so they use the same CSS classes (`app/globals.css`, search `.plan-`):

- **Rows are people, columns are days**, name column sticky-left with an avatar, role, and (Calendar tab only) a live `CapStatusPill`/`CapacityBar` computed from `computeWeeklyCapacity` for the week being viewed.
- **`.plan-block`** is one task chip: single line, status-colored, always shows the task's full name and hours (`{name} · {hours}h`) — including on *every* day a multi-day task spans, not just the first. This was a deliberate, explicit product decision: a 3-day task should read the same on all 3 days, not go blank after day one.
- **Optional per-day time schedule** (migration 021, `tasks.daily_schedule` jsonb — array of `{date, start, end}`): separate from `workload_hours` (the task's total size). Lets someone pin specific clock hours on specific days (e.g. 9–11am Monday, 2–6pm Wednesday) without every day needing an entry or needing to match. When a day has an entry, the chip shows that time range instead of the total hours (`scheduleLabel()` in both `CalendarView.tsx` and `PlanningBoard.tsx`) — same fallback-to-total-hours behavior in both files, so if you add a third view showing task chips, copy that function rather than reinventing it.
- **Never render a `.plan-block` with empty text content.** An earlier version hid the task name on the "middle"/"end" days of a multi-day task to fake a connected Gantt-style bar — with no text inside, the box had nothing to establish a line box, so it collapsed to a near-invisible sliver a few pixels tall instead of a real chip. This is a real CSS trap worth knowing generally: a block element with padding but zero content can render far shorter than you'd expect. If you ever want a "connected bar" look again, give it real (even visually hidden) content, don't render truly empty divs.
- Each day cell caps at **3 visible tasks + a "+N more" line**; clicking "+N more" expands that one cell in place to show the rest (`expandedCells` state in `CalendarView.tsx`, same pattern reused if you touch `PlanningBoard.tsx`). This was chosen over a fixed-height-with-hidden-scrollbar approach on purpose — that earlier version silently clipped whatever didn't fit, which looked like a rendering bug. Capping the count and showing an explicit "+N more" always tells the truth about what's hidden. It's also click-triggered, not hover-triggered — there was an explicit ask to not rely on hover to reveal information anywhere in this UI.
- Day columns floor at `140–150px` (`minmax(140px,1fr)` / `minmax(150px,1fr)`) so a wider date range scrolls horizontally instead of squeezing every column down to unreadable widths — that was a real, reported bug (task names truncating to almost nothing at the 3-week range).

**Two-Week Planning is laid out differently from Calendar (deliberate, on request):** each task appears **once, on its due date** (the deliverable date) — not spread from its start date — so the grid answers "what is due when." Each person gets **one row per project they have open (not done) tasks on** (all open tasks, not only those due inside the visible weeks, so rows don't jump when switching 1/2/3 weeks), with a sticky **Project** column (Client/Internal `.tag`) and the person's name spanning all their rows. An **Overdue** column before today holds open tasks past their due date (the grid starts at today, so they'd otherwise vanish), and undated tasks show as a clickable **"No due date · N"** under the project name instead of being faked onto today. Day-off 🌴 markers show *alongside* tasks, not instead of them. The multi-day-chip rule above applies to the Calendar tab only now. Styles are modifier classes (`.plan-project-cell`, `.plan-row-cell`, `.plan-overdue-cell`, `.plan-person-end`...) so the shared base `.plan-*` rules — and the Calendar tab — are unaffected.

**If the two tabs ever look inconsistent again:** they're two separate components sharing CSS by convention, not by a shared component — a change to one doesn't automatically apply to the other. Worth considering merging them into one view at some point; they've been drifting toward showing the same information anyway.

---

## 10. Performance — what was actually slow and why

Two real, found-by-reading-the-code issues, both fixed:

1. **Every page fetched the entire company's data**, even pages that used a fraction of it (Documents only needed project names; Day Off only needed the people list). `loadPortalData()` in `lib/data/portal.ts` now takes optional flags (`{ tasks: false, blockers: false, dayOff: false }`) and a `projectId` to scope a single project's page down to just that project's tasks/blockers.
2. **The same data was fetched 2–3 times per navigation** — `auth.getUser()` (a real network call to Supabase's auth server) ran up to 3 times, settings and notifications each ran twice, because the root layout and the page both called the same functions independently. Fixed by wrapping `getCurrentPerson`, `loadAppSettings`, and `loadNotifications` in React's `cache()` (`lib/auth/session.ts`, `lib/data/settings.ts`, `lib/data/notifications.ts`) — the standard Next.js pattern for deduping identical fetches within one request.

**If the app feels slow again:** check whether a new page/component calls one of these shared loaders redundantly, or whether a new page is pulling `loadPortalData()` with no scoping when it only needs a slice of it.

---

## 11. How to deploy

```bash
git add <files>
git commit -m "..."
git push origin main
```

Vercel auto-deploys `main` on every push. No manual deploy step. Live in 1–2 minutes.

## 12. How to run a database migration

1. Write a new file: `supabase/migrations/0XX_description.sql` (next number after whatever's highest — check `supabase/migrations/`).
2. Open the Supabase project → SQL Editor.
3. Paste **only the SQL**, not any terminal commands or comments about how to run it.
4. Run it. "Success, no rows returned" is the expected result for most schema changes.
5. Commit the migration file to the repo too — it's the permanent record of the schema, even though running it and committing it are two separate manual steps.

---

## 13. Common changes — quick recipes

**Add a new task/project field:**
1. Migration: `alter table tasks add column ...`
2. `lib/types.ts` — add the field to the `Task` type.
3. `app/(portal)/projects/actions.ts` — add to `TaskFormInput`, and to both the `insert` and `update` calls.
4. `components/projects/TaskModal.tsx` — add the form field + state.

**Add a new notification type:**
1. Migration: extend the `activity_log.kind` check constraint.
2. `lib/types.ts` — add to the `ActivityKind` union.
3. Call `logActivity({ kind: "...", recipientIds: [...], ... })` from wherever the event happens.
4. `lib/data/notifications.ts` — add the new kind to `notificationSectionHref` so it maps to a sidebar badge.
5. `components/activity/ActivityFeedList.tsx` — add an icon to `ACTIVITY_ICON`.

**Change a Settings field (branding, thresholds, working days, etc.):**
All of these live in one jsonb-ish row: `app_settings` table, `id = 1`. Loader: `lib/data/settings.ts`. Save action: `app/(portal)/settings/actions.ts` → `updateAppSettings`. UI: `components/settings/WorkspaceSettingsPanel.tsx`.

**Change the brand color / logo:**
Already a real feature, not hardcoded — Settings → Workspace → Branding. Color is injected as a CSS variable (`--brand-primary`) on `<body>` in `app/layout.tsx`, overriding the default in `app/globals.css`. Logo uploads to Supabase Storage (`branding` bucket).

**Add a new page:**
1. `app/(portal)/<name>/page.tsx` — Server Component, fetch data, render `<Topbar>` + your client component.
2. `components/shell/Sidebar.tsx` — add to the `SECTIONS` array for the nav link.
3. If it needs its own notification section, add a case to `notificationSectionHref`.

---

## 14. Things that will bite you if you don't know them

- **Windows + Bash tool `cd` quirk:** if a shell command fails with "not a git repository," the working directory reset — just `cd` back into `diem-portal-app` and retry, don't assume the repo broke.
- **`git commit` file paths with parentheses** (`app/(portal)/...`) need escaping or quoting in bash (`app/\(portal\)/...`).
- **Supabase migration file numbering** has one gap already (`007_ensure_person_link.sql` and `007_merge_ghost_people_and_project.sql` share a number) — harmless, just don't be surprised.
- **A block element with no text content can collapse to almost no height** even with padding set — see §9. Always give a styled chip real content, or check devtools if something looks like a thin unstyled sliver instead of debugging the color/spacing first.
- **Real login credentials should never be typed into the app by an AI assistant** (or committed to the repo, or pasted into chat carelessly) — this was a hard rule followed all through this build. Keep following it.

---

## 15. What's genuinely still open

- Calendar tab's **Month and Day views** are still the original date-grid style — only Week/2-Weeks got the person-row + capacity-badge redesign described in §9. Worth revisiting for consistency.
- The **Two-Week Planning** and **Calendar** tabs have drifted close to showing the same information two different ways — worth a real conversation about merging them into one view.
- From the original feature roadmap (see `DIEM Portal - Product Roadmap.pptx` if it's still around) — SSO, client-facing share links, a real file-attachment system with actual storage, AI-drafted weekly summaries, and a real Progressive Web App with push notifications were all scoped but not built.
- If the team wants to sell this beyond DIEM, multi-tenancy (org-scoped data instead of one shared workspace) is the first real architectural change needed — right now every logged-in user sees the whole company's data by design.
