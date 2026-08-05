-- DIEM Portal — fix pre-existing `projects` table
-- This Supabase project already had a `projects` table (from an earlier,
-- unrelated scaffold) before 001_schema.sql ran, using different column
-- names (project_type, client_name), missing several columns entirely, and
-- foreign keys (owner_id, created_by, ...) pointing at a `profiles` table
-- this app never uses instead of `people`. This migration brings the
-- existing table in line with what the rest of the schema (and the Next.js
-- app) expects, without deleting any existing project rows.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'project_type'
  ) then
    alter table projects rename column project_type to type;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'client_name'
  ) then
    alter table projects rename column client_name to client;
  end if;
end $$;

alter table projects
  add column if not exists progress_manual jsonb,
  add column if not exists progress_manual_log jsonb not null default '[]'::jsonb,
  add column if not exists health_manual jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Every foreign key on `projects` that references the old, unused `profiles`
-- table: for `owner_id` (the one this app actually relies on), null out any
-- value that doesn't correspond to a real `people` row, then repoint the
-- constraint at `people`. For anything else left over from the old scaffold
-- (e.g. created_by), just drop the constraint — this app never reads or
-- writes that column, so it's not worth chasing its data into shape.
do $$
declare
  fk record;
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  for fk in
    select con.conname, att.attname as column_name
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.contype = 'f'
      and con.conrelid = 'public.projects'::regclass
      and con.confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table projects drop constraint %I', fk.conname);

    if fk.column_name = 'owner_id' then
      execute format(
        'update projects set owner_id = null where owner_id is not null and owner_id not in (select id from people)'
      );
      execute format(
        'alter table projects add constraint %I foreign key (owner_id) references people(id) on delete set null',
        fk.conname
      );
    end if;
  end loop;
end $$;
