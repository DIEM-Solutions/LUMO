-- DIEM Portal — fix pre-existing `tasks` table
-- Same situation as 005_fix_projects_columns.sql: this Supabase project
-- already had a `tasks` table from an earlier, unrelated scaffold, with
-- different column names (title, primary_assignee_id, secondary_assignee_id,
-- progress_percentage), missing columns (weight, approval_person_id,
-- remaining_days, approval_decision), and assignee/created_by foreign keys
-- pointing at `profiles` instead of `people`. This brings it in line with
-- what the rest of the schema (and the Next.js app) expects, without
-- deleting any existing task rows.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'title'
  ) then
    alter table tasks rename column title to name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'primary_assignee_id'
  ) then
    alter table tasks rename column primary_assignee_id to assignee_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'secondary_assignee_id'
  ) then
    alter table tasks rename column secondary_assignee_id to assignee2_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'progress_percentage'
  ) then
    alter table tasks rename column progress_percentage to progress_pct;
  end if;
end $$;

alter table tasks
  add column if not exists weight numeric not null default 0,
  add column if not exists approval_person_id uuid,
  add column if not exists remaining_days numeric,
  add column if not exists approval_decision jsonb;

-- Repoint assignee_id / assignee2_id at `people` (nulling out any value that
-- doesn't correspond to a real `people` row first, same as owner_id on
-- projects). Anything else left over from the old scaffold pointing at
-- `profiles` (e.g. created_by) just gets its constraint dropped — this app
-- never reads or writes that column.
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
      and con.conrelid = 'public.tasks'::regclass
      and con.confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table tasks drop constraint %I', fk.conname);

    if fk.column_name in ('assignee_id', 'assignee2_id') then
      execute format(
        'update tasks set %I = null where %I is not null and %I not in (select id from people)',
        fk.column_name, fk.column_name, fk.column_name
      );
      execute format(
        'alter table tasks add constraint %I foreign key (%I) references people(id) on delete set null',
        fk.conname, fk.column_name
      );
    end if;
  end loop;
end $$;

-- approval_person_id is a brand-new column (just added above), so it has no
-- existing constraint to fix — just add the FK directly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_approval_person_id_fkey'
  ) then
    alter table tasks
      add constraint tasks_approval_person_id_fkey
      foreign key (approval_person_id) references people(id) on delete set null;
  end if;
end $$;
