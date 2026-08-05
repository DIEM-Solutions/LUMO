# Running these migrations

In the Supabase dashboard for this project, open **SQL Editor** and run the files in this folder in order, each as its own query:

1. `001_schema.sql`
2. `002_functions_triggers.sql`
3. `003_rls_policies.sql`
4. `004_seed_data.sql`
5. `005_fix_projects_columns.sql` (if needed)
6. `006_fix_tasks_columns.sql` (if needed)
7. `007_ensure_person_link.sql` — **required** if logins show a blank page / too many redirects

All are safe to re-run (`if not exists` / `on conflict do nothing`).

## After running them: connect real logins

The seed data creates `people` rows for the 7 real team members but does **not** create any Supabase Auth users — there's nothing to sign in with yet. For each person who should be able to log in:

1. Supabase Dashboard → **Authentication → Users → Add user** (or **Invite**).
2. Use the **exact email** from the seed data, e.g. `paul.naggear@dieminnovate.com`, `alexandra.aoun@dieminnovate.com`, `sara.chehade@dieminnovate.com`, `andrew.dagher@dieminnovate.com`.
3. Set a password (or send an invite/magic link, depending on how you want them to first sign in).

The `on_auth_user_created` trigger (from `002_functions_triggers.sql`, hardened in `007`) automatically links that new auth user to the matching pre-seeded `people` row the moment the account is created — no manual linking needed. If you invite someone whose email doesn't match a seeded person, they'll get a fresh blank `employee` profile automatically instead.

If someone already has an Auth account but still can't reach `/home`, run `007_ensure_person_link.sql` — it backfills `people.auth_user_id` by email (case-insensitive) and adds `ensure_person_for_auth_user()` for login-time repair.

Charbel Daou and Elias Ibrahim were seeded with `email = null` (no email was available in the source data) — give them a real email via **Settings → Team** once that page exists, or update their `people` row directly, before inviting them.
