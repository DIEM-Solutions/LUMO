-- DIEM Portal — merge duplicate "ghost" people + remove leftover duplicate project
-- Charbel Daou and Elias Ibrahim's real logins got linked to brand-new blank
-- `people` rows (named "charbel.daou" / "elias.ibrahim" from their email
-- prefix) instead of their real seeded profiles, because the email typed at
-- login time didn't exactly match `people.email` at that moment. This
-- relinks their real login to their real profile, moves any task/project
-- references off the ghost rows, then removes the now-empty ghosts. It also
-- removes the leftover duplicate "Product Implementation" project row from
-- the old pre-existing schema (see 005_fix_projects_columns.sql).
-- Safe to re-run.

do $$
declare
  charbel_ghost_id uuid := 'a7a3c56b-7f8f-4c3e-81b3-c8112781cba0';
  elias_ghost_id uuid := '37405ff0-b4ee-42e6-9a15-61e5e009a458';
  charbel_real_id uuid := 'a0000000-0000-0000-0000-000000000003';
  elias_real_id uuid := 'a0000000-0000-0000-0000-000000000004';
  charbel_ghost_auth uuid;
  elias_ghost_auth uuid;
begin
  select auth_user_id into charbel_ghost_auth from people where id = charbel_ghost_id;
  select auth_user_id into elias_ghost_auth from people where id = elias_ghost_id;

  -- free the auth_user_id AND email off the ghost row first (both have unique
  -- constraints) before putting them on the real profile
  update people set auth_user_id = null, email = null where id in (charbel_ghost_id, elias_ghost_id);

  if charbel_ghost_auth is not null then
    update people set auth_user_id = charbel_ghost_auth where id = charbel_real_id;
  end if;
  if elias_ghost_auth is not null then
    update people set auth_user_id = elias_ghost_auth where id = elias_real_id;
  end if;

  -- keep the real profile's email in sync with whatever was actually used to log in
  update people p set email = au.email
  from auth.users au
  where p.id = charbel_real_id and au.id = p.auth_user_id;

  update people p set email = au.email
  from auth.users au
  where p.id = elias_real_id and au.id = p.auth_user_id;

  -- move any task/project references off the ghost rows onto the real ones
  update tasks set assignee_id = charbel_real_id where assignee_id = charbel_ghost_id;
  update tasks set assignee2_id = charbel_real_id where assignee2_id = charbel_ghost_id;
  update tasks set approval_person_id = charbel_real_id where approval_person_id = charbel_ghost_id;
  update tasks set assignee_id = elias_real_id where assignee_id = elias_ghost_id;
  update tasks set assignee2_id = elias_real_id where assignee2_id = elias_ghost_id;
  update tasks set approval_person_id = elias_real_id where approval_person_id = elias_ghost_id;

  update projects set owner_id = charbel_real_id where owner_id = charbel_ghost_id;
  update projects set owner_id = elias_real_id where owner_id = elias_ghost_id;

  delete from project_team where person_id in (charbel_ghost_id, elias_ghost_id);
  delete from blockers where owner_id in (charbel_ghost_id, elias_ghost_id);

  delete from people where id in (charbel_ghost_id, elias_ghost_id);
end $$;

-- Remove the leftover duplicate "Product Implementation" project (moving any
-- stray task/blocker references onto the real one first, just in case).
do $$
declare
  junk_project_id uuid := '33d9e647-f96b-4c4f-9d61-d13e709d4506';
  real_project_id uuid := 'b0000000-0000-0000-0000-000000000001';
begin
  update tasks set project_id = real_project_id where project_id = junk_project_id;
  update blockers set project_id = real_project_id where project_id = junk_project_id;
  delete from project_team where project_id = junk_project_id;
  delete from projects where id = junk_project_id;
end $$;
