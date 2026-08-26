-- progress_override and health_override predate this repo's migration
-- history (never created by a migration here) and have zero references
-- anywhere in the app code -- confirmed via the live schema and a
-- full-repo grep before writing this. Dropping them for handoff
-- cleanliness, same reasoning as migration 018.
alter table projects drop column if exists progress_override;
alter table projects drop column if exists health_override;
