-- Link auth users to people rows that were never connected (missing trigger,
-- case-mismatched emails, or accounts created before 002 ran). Also harden
-- handle_new_user to match emails case-insensitively.

-- ============================================================
-- Backfill existing unlinked auth users → people by email
-- ============================================================
update people p
set auth_user_id = u.id
from auth.users u
where lower(p.email) = lower(u.email)
  and p.auth_user_id is null
  and not exists (
    select 1 from people p2 where p2.auth_user_id = u.id
  );

-- ============================================================
-- Case-insensitive link / create on new auth user
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

-- ============================================================
-- ensure_person_for_auth_user
-- Callable from the app after login. Links the current auth user to a
-- pre-seeded people row (case-insensitive email), or creates a blank
-- employee profile if none exists. Idempotent.
-- ============================================================
create or replace function ensure_person_for_auth_user()
returns people
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  result people;
begin
  if uid is null then
    return null;
  end if;

  select * into result from people where auth_user_id = uid;
  if found then
    return result;
  end if;

  select email into uemail from auth.users where id = uid;

  if uemail is not null then
    update people
    set auth_user_id = uid
    where lower(email) = lower(uemail)
      and auth_user_id is null
    returning * into result;

    if found then
      return result;
    end if;
  end if;

  insert into people (auth_user_id, name, email, role_type, permissions)
  values (
    uid,
    coalesce(split_part(uemail, '@', 1), 'User'),
    uemail,
    'employee',
    '{}'::jsonb
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function ensure_person_for_auth_user() from public;
grant execute on function ensure_person_for_auth_user() to authenticated;
