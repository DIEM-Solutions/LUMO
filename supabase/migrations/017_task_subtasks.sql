-- Let a task be split into as many subtasks as needed. A subtask is just a
-- regular task with parent_task_id set -- it keeps its own assignee,
-- status, due date and workload, and participates in progress/capacity
-- calculations exactly like any other task (no special roll-up logic,
-- reusing everything that already exists for tasks).

alter table tasks add column if not exists parent_task_id uuid references tasks(id) on delete cascade;
create index if not exists tasks_parent_task_id_idx on tasks(parent_task_id);
