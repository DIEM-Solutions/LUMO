-- Bug fix: tasks.progress_pct had a leftover DEFAULT 0 from before this
-- app's rebuild (it survived a column rename in an earlier migration).
-- Every new task silently got progress_pct = 0 instead of NULL. The
-- progress calculation treats "not null" as "someone explicitly set a
-- progress override" — so a brand-new in-progress task with no override
-- contributed 0% instead of the intended 50% default, which could leave
-- a project showing "Not Started" even with an in-progress task on it.
--
-- There is no UI anywhere that sets progress_pct, so any row where it's
-- currently 0 is this bug, never a real user-entered value.

alter table tasks alter column progress_pct drop default;

update tasks set progress_pct = null where progress_pct = 0;
