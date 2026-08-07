-- DIEM Portal — schema for the rest of Settings: working days, public
-- holidays, project categories, document tags, portal branding, and
-- notification read-tracking.
-- Safe to re-run.

-- ============================================================
-- app_settings: working days, category/tag master lists, branding
-- ============================================================
alter table app_settings add column if not exists working_days int[] not null default '{1,2,3,4,5}';
alter table app_settings add column if not exists project_categories text[] not null default '{}';
alter table app_settings add column if not exists document_tags text[] not null default '{}';
alter table app_settings add column if not exists branding jsonb not null default '{}'::jsonb;

-- ============================================================
-- public_holidays
-- ============================================================
create table if not exists public_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public_holidays enable row level security;

drop policy if exists "public_holidays_select_all" on public_holidays;
create policy "public_holidays_select_all" on public_holidays
  for select to authenticated using (true);

drop policy if exists "public_holidays_write_admin" on public_holidays;
create policy "public_holidays_write_admin" on public_holidays
  for all to authenticated
  using (has_permission('canEditTeam'))
  with check (has_permission('canEditTeam'));

-- ============================================================
-- notification read-tracking (built on the existing activity_log)
-- ============================================================
create table if not exists notification_reads (
  person_id uuid not null references people(id) on delete cascade,
  activity_id uuid not null references activity_log(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (person_id, activity_id)
);

alter table notification_reads enable row level security;

drop policy if exists "notification_reads_own" on notification_reads;
create policy "notification_reads_own" on notification_reads
  for all to authenticated
  using (person_id = current_person_id())
  with check (person_id = current_person_id());
