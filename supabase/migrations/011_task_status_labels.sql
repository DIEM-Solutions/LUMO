-- Admin-configurable display labels for the 4 fixed task statuses
-- (not-started/in-progress/done/blocked). This only overrides display
-- text — the underlying status values, and every health/capacity/
-- progress calculation keyed on them, are unchanged.
-- Safe to re-run.

alter table app_settings add column if not exists task_status_labels jsonb not null default '{}'::jsonb;
