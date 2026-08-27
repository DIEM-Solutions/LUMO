-- Lets a task carry an optional per-day time schedule, distinct from its
-- total workload_hours (the size of the task) -- e.g. a task can need 6
-- hours total, spent as 9-11am on Monday and 2-6pm on Wednesday. Hours
-- don't need to be the same every day and any day within the task's span
-- can have its own entry.
-- Each element: { "date": "2026-08-25", "start": "09:00", "end": "11:00" }
alter table tasks add column if not exists daily_schedule jsonb not null default '[]';
