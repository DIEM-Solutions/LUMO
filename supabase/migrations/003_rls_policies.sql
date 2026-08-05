-- DIEM Portal — row-level security
-- Run after 002_functions_triggers.sql.
-- Model: shared team workspace — any authenticated team member can read
-- everything (matching the original prototype's single shared dataset);
-- writes are gated by role/permission, not row ownership. Only day_off and
-- recap_last_viewed are genuinely row-owned.
-- Safe to re-run: every policy is dropped first if it already exists.

alter table people enable row level security;
alter table projects enable row level security;
alter table project_team enable row level security;
alter table tasks enable row level security;
alter table blockers enable row level security;
alter table support_requests enable row level security;
alter table agreed_points enable row level security;
alter table agreed_point_people enable row level security;
alter table ceo_actions enable row level security;
alter table documents enable row level security;
alter table day_off enable row level security;
alter table weekly_snapshots enable row level security;
alter table app_settings enable row level security;
alter table recap_last_viewed enable row level security;

-- ============================================================
-- people
-- ============================================================
drop policy if exists "people_select_all" on people;
create policy "people_select_all" on people
  for select to authenticated using (true);

drop policy if exists "people_insert_admin" on people;
create policy "people_insert_admin" on people
  for insert to authenticated with check (has_permission('canEditTeam'));

drop policy if exists "people_update_admin" on people;
create policy "people_update_admin" on people
  for update to authenticated using (has_permission('canEditTeam'));

drop policy if exists "people_delete_admin" on people;
create policy "people_delete_admin" on people
  for delete to authenticated using (has_permission('canEditTeam'));

-- ============================================================
-- projects
-- ============================================================
drop policy if exists "projects_select_all" on projects;
create policy "projects_select_all" on projects
  for select to authenticated using (true);

drop policy if exists "projects_insert_permitted" on projects;
create policy "projects_insert_permitted" on projects
  for insert to authenticated with check (has_permission('canCreateProjects'));

drop policy if exists "projects_update_any_team_member" on projects;
create policy "projects_update_any_team_member" on projects
  for update to authenticated using (current_person_id() is not null);

drop policy if exists "projects_delete_permitted" on projects;
create policy "projects_delete_permitted" on projects
  for delete to authenticated using (has_permission('canCreateProjects'));

-- ============================================================
-- project_team
-- ============================================================
drop policy if exists "project_team_select_all" on project_team;
create policy "project_team_select_all" on project_team
  for select to authenticated using (true);

drop policy if exists "project_team_write_any_team_member" on project_team;
create policy "project_team_write_any_team_member" on project_team
  for all to authenticated
  using (current_person_id() is not null)
  with check (current_person_id() is not null);

-- ============================================================
-- tasks
-- ============================================================
drop policy if exists "tasks_select_all" on tasks;
create policy "tasks_select_all" on tasks
  for select to authenticated using (true);

drop policy if exists "tasks_write_any_team_member" on tasks;
create policy "tasks_write_any_team_member" on tasks
  for all to authenticated
  using (current_person_id() is not null)
  with check (current_person_id() is not null);

-- ============================================================
-- blockers
-- ============================================================
drop policy if exists "blockers_select_all" on blockers;
create policy "blockers_select_all" on blockers
  for select to authenticated using (true);

drop policy if exists "blockers_write_any_team_member" on blockers;
create policy "blockers_write_any_team_member" on blockers
  for all to authenticated
  using (current_person_id() is not null)
  with check (current_person_id() is not null);

-- ============================================================
-- support_requests
-- ============================================================
drop policy if exists "support_requests_select_all" on support_requests;
create policy "support_requests_select_all" on support_requests
  for select to authenticated using (true);

drop policy if exists "support_requests_insert_any_team_member" on support_requests;
create policy "support_requests_insert_any_team_member" on support_requests
  for insert to authenticated with check (current_person_id() is not null);

drop policy if exists "support_requests_update_any_team_member" on support_requests;
create policy "support_requests_update_any_team_member" on support_requests
  for update to authenticated using (current_person_id() is not null);

drop policy if exists "support_requests_delete_own" on support_requests;
create policy "support_requests_delete_own" on support_requests
  for delete to authenticated using (person_id = current_person_id());

-- ============================================================
-- agreed_points
-- ============================================================
drop policy if exists "agreed_points_select_all" on agreed_points;
create policy "agreed_points_select_all" on agreed_points
  for select to authenticated using (true);

drop policy if exists "agreed_points_write_any_team_member" on agreed_points;
create policy "agreed_points_write_any_team_member" on agreed_points
  for all to authenticated
  using (current_person_id() is not null)
  with check (current_person_id() is not null);

-- ============================================================
-- agreed_point_people
-- ============================================================
drop policy if exists "agreed_point_people_select_all" on agreed_point_people;
create policy "agreed_point_people_select_all" on agreed_point_people
  for select to authenticated using (true);

drop policy if exists "agreed_point_people_write_any_team_member" on agreed_point_people;
create policy "agreed_point_people_write_any_team_member" on agreed_point_people
  for all to authenticated
  using (current_person_id() is not null)
  with check (current_person_id() is not null);

-- ============================================================
-- ceo_actions
-- ============================================================
drop policy if exists "ceo_actions_select_all" on ceo_actions;
create policy "ceo_actions_select_all" on ceo_actions
  for select to authenticated using (true);

drop policy if exists "ceo_actions_write_permitted" on ceo_actions;
create policy "ceo_actions_write_permitted" on ceo_actions
  for all to authenticated
  using (has_permission('canFinalizeRecap'))
  with check (has_permission('canFinalizeRecap'));

-- ============================================================
-- documents
-- ============================================================
drop policy if exists "documents_select_all" on documents;
create policy "documents_select_all" on documents
  for select to authenticated using (true);

drop policy if exists "documents_insert_permitted" on documents;
create policy "documents_insert_permitted" on documents
  for insert to authenticated with check (has_permission('canUploadDocuments'));

drop policy if exists "documents_update_permitted" on documents;
create policy "documents_update_permitted" on documents
  for update to authenticated using (has_permission('canUploadDocuments'));

drop policy if exists "documents_delete_permitted" on documents;
create policy "documents_delete_permitted" on documents
  for delete to authenticated using (has_permission('canUploadDocuments'));

-- ============================================================
-- day_off — genuinely row-owned, plus admin approval visibility
-- ============================================================
drop policy if exists "day_off_select_own_or_approver" on day_off;
create policy "day_off_select_own_or_approver" on day_off
  for select to authenticated
  using (person_id = current_person_id() or has_permission('canApproveDayOff'));

drop policy if exists "day_off_insert_own" on day_off;
create policy "day_off_insert_own" on day_off
  for insert to authenticated with check (person_id = current_person_id());

drop policy if exists "day_off_update_approver" on day_off;
create policy "day_off_update_approver" on day_off
  for update to authenticated using (has_permission('canApproveDayOff'));

drop policy if exists "day_off_delete_own" on day_off;
create policy "day_off_delete_own" on day_off
  for delete to authenticated using (person_id = current_person_id());

-- ============================================================
-- weekly_snapshots
-- ============================================================
drop policy if exists "weekly_snapshots_select_all" on weekly_snapshots;
create policy "weekly_snapshots_select_all" on weekly_snapshots
  for select to authenticated using (true);

drop policy if exists "weekly_snapshots_write_permitted" on weekly_snapshots;
create policy "weekly_snapshots_write_permitted" on weekly_snapshots
  for all to authenticated
  using (has_permission('canFinalizeRecap'))
  with check (has_permission('canFinalizeRecap'));

-- ============================================================
-- app_settings
-- ============================================================
drop policy if exists "app_settings_select_all" on app_settings;
create policy "app_settings_select_all" on app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings_update_admin" on app_settings;
create policy "app_settings_update_admin" on app_settings
  for update to authenticated using (is_admin());

-- ============================================================
-- recap_last_viewed — fully row-owned
-- ============================================================
drop policy if exists "recap_last_viewed_own" on recap_last_viewed;
create policy "recap_last_viewed_own" on recap_last_viewed
  for all to authenticated
  using (person_id = current_person_id())
  with check (person_id = current_person_id());
