-- Progress is now computed purely from real task data (workload_hours),
-- with no manual override path. Both are now dead columns the app never
-- writes to but was still silently reading from -- same class of bug as
-- the manual_utilization freeze on team capacity (see migration 016).
alter table tasks drop column if exists weight;
alter table projects drop column if exists progress_manual;
alter table projects drop column if exists progress_manual_log;
