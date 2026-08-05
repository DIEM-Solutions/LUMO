-- DIEM Portal — core schema
-- Run this first, in the Supabase SQL editor, in order (001 -> 002 -> 003 -> 004).

create extension if not exists pgcrypto;

-- ============================================================
-- people
-- ============================================================
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  role text,
  role_type text not null default 'employee' check (role_type in ('ceo','admin','employee')),
  email text unique,
  skills text[] not null default '{}',
  capacity_baseline numeric,
  working_arrangement text,
  active boolean,
  ring_a text,
  ring_b text,
  solid text,
  permissions jsonb not null default '{}'::jsonb,
  manual_utilization jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- projects
-- ============================================================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('client','internal')),
  client text,
  category text,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  owner_id uuid references people(id) on delete set null,
  start_date date,
  end_date date,
  next_deliverable text,
  progress_manual jsonb,
  progress_manual_log jsonb not null default '[]'::jsonb,
  health_manual jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_team (
  project_id uuid not null references projects(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (project_id, person_id)
);

-- ============================================================
-- tasks
-- ============================================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  assignee_id uuid references people(id) on delete set null,
  assignee2_id uuid references people(id) on delete set null,
  status text not null default 'not-started' check (status in ('not-started','in-progress','done','blocked')),
  due_date date,
  start_date date,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  weight numeric not null default 0,
  workload_days numeric not null default 1,
  include_weekends boolean not null default false,
  notes text default '',
  blocker_reason text default '',
  next_step text default '',
  progress_pct numeric,
  approval_person_id uuid references people(id) on delete set null,
  dependency text default '',
  remaining_days numeric,
  approval_decision jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- blockers
-- ============================================================
create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  related_task_id uuid references tasks(id) on delete set null,
  title text not null,
  cause text default '',
  impact text default '',
  owner_id uuid references people(id) on delete set null,
  urgency text not null default 'medium' check (urgency in ('high','medium','low')),
  action_needed text default '',
  suggested_solution text default '',
  date_raised date not null default current_date,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- support_requests  (was REQUESTS)
-- ============================================================
create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  type text default '',
  message text default '',
  date date not null default current_date,
  status text not null default 'open' check (status in ('open','accepted','resolved')),
  helper_id uuid references people(id) on delete set null,
  accepted_date date,
  comment text default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- agreed_points  (decisions / commitments)
-- ============================================================
create table if not exists agreed_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  text text not null,
  date date not null default current_date,
  status text not null default 'agreed' check (status in ('agreed','pending','in-progress','completed','blocked')),
  comment text default '',
  source jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agreed_point_people (
  agreed_point_id uuid not null references agreed_points(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (agreed_point_id, person_id)
);

-- ============================================================
-- ceo_actions  (resolutions logged from "Needs Attention")
-- ============================================================
create table if not exists ceo_actions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  week_id text not null,
  kind text not null,
  ref text,
  title text,
  note text default '',
  by_id uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- documents  (metadata only, no real file storage)
-- ============================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_id uuid references projects(id) on delete set null,
  category text not null default 'Other',
  uploaded_by uuid references people(id) on delete set null,
  upload_date date not null default current_date,
  updated_date date not null default current_date,
  file_note text default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- day_off
-- ============================================================
create table if not exists day_off (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type text,
  note text default '',
  submitted_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  comment text default '',
  decided_by uuid references people(id) on delete set null,
  decided_date date,
  employee_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- weekly_snapshots  (immutable point-in-time roll-ups)
-- ============================================================
create table if not exists weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  week_id text not null unique,
  week_start date not null,
  week_end date not null,
  finalized_at timestamptz not null default now(),
  finalized_by uuid references people(id) on delete set null,
  exec_summary text default '',
  kpis jsonb not null default '{}'::jsonb,
  needs_attention_count int not null default 0,
  recommendation_count int not null default 0,
  decisions_waiting_count int not null default 0,
  team_overloaded_count int not null default 0,
  next_steps jsonb not null default '[]'::jsonb
);

-- ============================================================
-- app_settings  (single-row org settings)
-- ============================================================
create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  workload_thresholds jsonb not null default '{"balanced":50,"almostFull":75,"needsSupport":90,"overloaded":100}'::jsonb,
  recap_settings jsonb not null default '{"finalizeReminders":true}'::jsonb
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- recap_last_viewed  (per-user "changes since I last looked" marker)
-- ============================================================
create table if not exists recap_last_viewed (
  person_id uuid primary key references people(id) on delete cascade,
  snapshot jsonb,
  updated_at timestamptz not null default now()
);
