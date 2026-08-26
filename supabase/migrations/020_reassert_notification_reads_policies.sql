-- Notifications silently stopped reaching anyone after 2026-08-13:
-- activity_log kept recording events correctly, but zero
-- notification_reads rows were created for any recipient after that
-- date, for any actor. The policies below were already established
-- correctly in migration 015 and demonstrably worked for weeks before
-- that date, and nothing in this repo's migration history since then
-- touches this table -- so if they changed, it happened outside the
-- tracked migrations (e.g. a manual edit in the Supabase dashboard).
--
-- Re-asserting the exact same policies here is a safe no-op if they
-- were already correct, and a real fix if they'd drifted.
drop policy if exists "notification_reads_own" on notification_reads;
drop policy if exists "notification_reads_select_own" on notification_reads;
drop policy if exists "notification_reads_insert_any" on notification_reads;
drop policy if exists "notification_reads_update_own" on notification_reads;

create policy "notification_reads_select_own" on notification_reads
  for select to authenticated using (person_id = current_person_id());

create policy "notification_reads_insert_any" on notification_reads
  for insert to authenticated with check (current_person_id() is not null);

create policy "notification_reads_update_own" on notification_reads
  for update to authenticated using (person_id = current_person_id()) with check (person_id = current_person_id());

-- Belt and suspenders: confirm RLS itself is still actually enabled on
-- the table (a toggle in the dashboard could disable it independently
-- of any policy definition).
alter table notification_reads enable row level security;
