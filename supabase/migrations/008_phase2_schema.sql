-- DIEM Portal — schema additions for Weekly Recap, Documents, Day Off,
-- Team, and Activity Feed (phase 2-4 features).
-- Safe to re-run.

-- ============================================================
-- people: assessment cycle tracking + leave balance
-- ============================================================
alter table people add column if not exists next_assessment_date date;
alter table people add column if not exists leave_balance_days numeric not null default 15;

-- ============================================================
-- documents: tags, folder grouping, external link
-- (no Supabase Storage bucket is set up in this project, so documents are
-- links to wherever the file actually lives — Drive, SharePoint, etc. —
-- rather than binary uploads. See the app for details.)
-- ============================================================
alter table documents add column if not exists tags text[] not null default '{}';
alter table documents add column if not exists folder text;
alter table documents add column if not exists link_url text;

-- ============================================================
-- activity_log — powers the Activity Feed
-- ============================================================
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'task_completed', 'task_created', 'document_uploaded',
    'project_updated', 'dayoff_requested', 'dayoff_decided'
  )),
  actor_id uuid references people(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  ref_id uuid,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

drop policy if exists "activity_log_select_all" on activity_log;
create policy "activity_log_select_all" on activity_log
  for select to authenticated using (true);

drop policy if exists "activity_log_insert_any_team_member" on activity_log;
create policy "activity_log_insert_any_team_member" on activity_log
  for insert to authenticated with check (current_person_id() is not null);

-- ============================================================
-- day_off: let approvers log time off on behalf of someone else
-- (e.g. backfilling leave taken before the portal existed), in addition
-- to the existing "insert your own" policy from 003_rls_policies.sql
-- ============================================================
drop policy if exists "day_off_insert_by_approver" on day_off;
create policy "day_off_insert_by_approver" on day_off
  for insert to authenticated with check (has_permission('canApproveDayOff'));

