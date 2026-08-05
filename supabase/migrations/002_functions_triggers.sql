-- DIEM Portal — identity & authorization helpers
-- Run after 001_schema.sql.

-- ============================================================
-- handle_new_user
-- Fires after a new row lands in auth.users (i.e. someone signs up / is
-- invited). If a `people` row was pre-seeded with a matching email and no
-- auth_user_id yet, link it. Otherwise create a fresh employee profile so
-- every authenticated user always has a `people` row to be scoped by.
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update people
  set auth_user_id = new.id
  where lower(email) = lower(new.email)
    and auth_user_id is null;

  if not found then
    insert into people (auth_user_id, name, email, role_type, permissions)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      'employee',
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- current_person_id
-- The people.id row for the currently authenticated user (auth.uid()).
-- ============================================================
create or replace function current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from people where auth_user_id = auth.uid();
$$;

-- ============================================================
-- is_admin
-- True if the caller's role_type is 'ceo' or 'admin' — those roles get
-- full permissions automatically, mirroring personPermissions() in the
-- original prototype.
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role_type in ('ceo','admin') from people where auth_user_id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- has_permission
-- True for ceo/admin (always), or if the caller's `permissions` jsonb has
-- the given key set to true.
-- ============================================================
create or replace function has_permission(perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_admin()
    or coalesce(
      (select (permissions->>perm_key)::boolean from people where auth_user_id = auth.uid()),
      false
    );
$$;
