-- ============================================================
-- Fix: app_settings updates were silently blocked for any
-- non-ceo/admin user who had been granted the canEditTeam
-- permission flag (the Settings UI lets them in, but this
-- policy only checked role_type, not the permission flag —
-- so their save "succeeded" client-side with 0 rows actually
-- written). Align with the same check the Settings UI itself
-- uses, matching the sibling public_holidays_write_admin policy.
-- ============================================================
drop policy if exists "app_settings_update_admin" on app_settings;
create policy "app_settings_update_admin" on app_settings
  for update to authenticated using (has_permission('canEditTeam'));

-- ============================================================
-- @mentions in task notes: track who has already been notified
-- for the current notes text, so re-saving without new mentions
-- doesn't re-notify the same people every time.
-- ============================================================
alter table tasks add column if not exists notes_mentioned_ids uuid[] not null default '{}';

-- ============================================================
-- Notifications become recipient-targeted instead of a broadcast
-- every authenticated person sees except the actor. New kinds
-- needed to cover events that previously logged nothing at all
-- (task field edits, mentions, approval requests, team changes,
-- support-request updates) or were only ever a generic catch-all.
-- ============================================================
alter table activity_log drop constraint if exists activity_log_kind_check;
alter table activity_log add constraint activity_log_kind_check check (kind in (
  'task_completed', 'task_created', 'document_uploaded',
  'project_updated', 'dayoff_requested', 'dayoff_decided',
  'task_assigned', 'task_updated', 'note_mention',
  'approval_requested', 'support_request_updated', 'team_changed'
));

-- notification_reads moves from "a row appears once you've opened a
-- broadcast item" to "a row is the recipient's inbox entry, inserted
-- unread the moment the event happens, marked read on open" -- so
-- read_at must be nullable now (an unread row has no read_at yet).
alter table notification_reads alter column read_at drop not null;
alter table notification_reads alter column read_at drop default;

-- The actor performing an action (e.g. assigning a task to someone
-- else) needs to insert that someone else's unread inbox row -- the
-- old "for all" policy only ever allowed inserting/updating your own
-- rows, which blocked exactly that. Split into per-operation policies:
-- anyone authenticated can create an inbox row for any recipient (this
-- only ever happens as a side effect of a real logActivity() call),
-- but reading/marking-read stays restricted to your own rows.
drop policy if exists "notification_reads_own" on notification_reads;

drop policy if exists "notification_reads_select_own" on notification_reads;
create policy "notification_reads_select_own" on notification_reads
  for select to authenticated using (person_id = current_person_id());

drop policy if exists "notification_reads_insert_any" on notification_reads;
create policy "notification_reads_insert_any" on notification_reads
  for insert to authenticated with check (current_person_id() is not null);

drop policy if exists "notification_reads_update_own" on notification_reads;
create policy "notification_reads_update_own" on notification_reads
  for update to authenticated using (person_id = current_person_id()) with check (person_id = current_person_id());

-- ============================================================
-- Storage bucket for real logo uploads (replaces the URL-only
-- text field). Public read so the logo can render on the public
-- /login screen; writes gated the same way branding settings are.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding_read_all" on storage.objects;
create policy "branding_read_all" on storage.objects
  for select to public using (bucket_id = 'branding');

drop policy if exists "branding_write_admin" on storage.objects;
create policy "branding_write_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and has_permission('canEditTeam'));

drop policy if exists "branding_update_admin" on storage.objects;
create policy "branding_update_admin" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and has_permission('canEditTeam'));

drop policy if exists "branding_delete_admin" on storage.objects;
create policy "branding_delete_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and has_permission('canEditTeam'));
