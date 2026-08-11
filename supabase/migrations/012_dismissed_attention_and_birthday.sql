-- Lets an admin manually clear a "CEO Priorities" item once it's been
-- handled, independent of whether the underlying data has caught up yet.
-- Shared across viewers (it's an org-wide priorities list, not per-user).
create table if not exists dismissed_attention_items (
  kind text not null,
  ref text not null,
  dismissed_by uuid references people(id) on delete set null,
  dismissed_at timestamptz not null default now(),
  primary key (kind, ref)
);

alter table dismissed_attention_items enable row level security;

drop policy if exists "dismissed_attention_select_all" on dismissed_attention_items;
create policy "dismissed_attention_select_all" on dismissed_attention_items
  for select to authenticated using (true);

drop policy if exists "dismissed_attention_write_admin" on dismissed_attention_items;
create policy "dismissed_attention_write_admin" on dismissed_attention_items
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Self-service birthday field on the person profile.
alter table people add column if not exists birthday date;

-- Lets any signed-in person set their OWN birthday without granting a
-- broader "update your own row" RLS policy (which would let someone edit
-- their own role/permissions/capacity too). This function only ever
-- touches the birthday column, for the row matching the caller's own
-- auth_user_id — same pattern as ensure_person_for_auth_user().
create or replace function update_my_birthday(new_birthday date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update people set birthday = new_birthday where auth_user_id = auth.uid();
end;
$$;

grant execute on function update_my_birthday(date) to authenticated;
