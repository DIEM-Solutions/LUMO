-- Switch task allocation and team capacity from days to hours.
--
-- tasks.workload_days -> tasks.workload_hours (existing values x8, at the
-- 8-hour standard workday the team confirmed).
-- tasks.remaining_days -> tasks.remaining_hours (same x8 conversion).
-- people.capacity_baseline was "working days of capacity per 2-week
-- window" (default 10 = 5 days/week x 2 weeks = fully booked). It becomes
-- people.weekly_capacity_hours ("hours of capacity per week"): a baseline
-- of 10 days/2wk = 5 days/week = 40 hours/week at 8h/day, so existing
-- values are multiplied by 4 (x8 hours/day, /2 to go from per-2-week to
-- per-week) to land on the same real-world meaning, not a bigger or
-- smaller effective capacity than before.

alter table tasks rename column workload_days to workload_hours;
update tasks set workload_hours = workload_hours * 8;

alter table tasks rename column remaining_days to remaining_hours;
update tasks set remaining_hours = remaining_hours * 8 where remaining_hours is not null;

alter table people rename column capacity_baseline to weekly_capacity_hours;
update people set weekly_capacity_hours = weekly_capacity_hours * 4 where weekly_capacity_hours is not null;
