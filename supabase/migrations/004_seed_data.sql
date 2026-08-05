-- DIEM Portal — real operational seed data
-- Run after 003_rls_policies.sql.
-- Pulled verbatim from SEED_PEOPLE / SEED_PROJECTS / SEED_TASKS / SEED_BLOCKERS /
-- SEED_DAYOFF in diem-portal-merged_4_8.html (lines 937-1055). auth_user_id stays
-- null for everyone — the on_auth_user_created trigger links each row to a real
-- Supabase Auth user automatically the first time that person logs in with a
-- matching email (create the auth users via Supabase Dashboard -> Authentication
-- -> Users -> Invite, using the exact emails below).
--
-- Fixed UUIDs are used (instead of gen_random_uuid()) purely so this file can
-- reference the same row across tables without a round-trip; they have no other
-- significance.

-- ============================================================
-- people
-- ============================================================
insert into people (id, name, role, role_type, email, skills, capacity_baseline, working_arrangement, active, ring_a, ring_b, solid, permissions, manual_utilization) values
('a0000000-0000-0000-0000-000000000001', 'Paul Naggear', 'CEO', 'ceo', 'paul.naggear@dieminnovate.com',
  array['Leadership','Client Strategy','Growth'], 4, null, null, '#FF4F14', '#6456A6', '#14131B',
  '{"canCreateProjects":true,"canEditTeam":true,"canFinalizeRecap":true,"canUploadDocuments":true,"canApproveDayOff":true}'::jsonb, null),
('a0000000-0000-0000-0000-000000000002', 'Tracy Awad', 'General Manager', 'ceo', 'tracy.awad@dieminnovate.com',
  array['Leadership','Operations','Growth'], 4, null, null, '#6456A6', '#FF4F14', '#14131B',
  '{"canCreateProjects":true,"canEditTeam":true,"canFinalizeRecap":true,"canUploadDocuments":true,"canApproveDayOff":true}'::jsonb, null),
('a0000000-0000-0000-0000-000000000003', 'Charbel Daou', 'Not provided', 'employee', null,
  '{}', null, null, null, '#4747F2', '#00BA9E', '#4747F2',
  '{"canCreateProjects":false,"canEditTeam":false,"canFinalizeRecap":false,"canUploadDocuments":false}'::jsonb, null),
('a0000000-0000-0000-0000-000000000004', 'Elias Ibrahim', 'Not provided', 'employee', null,
  '{}', null, null, null, '#00BA9E', '#FFCD77', '#039C85',
  '{"canCreateProjects":false,"canEditTeam":false,"canFinalizeRecap":false,"canUploadDocuments":false}'::jsonb, null),
('a0000000-0000-0000-0000-000000000005', 'Alexandra Aoun', 'Innovation Lead II', 'employee', 'alexandra.aoun@dieminnovate.com',
  '{}', 10, 'Full-Time', true, '#FFCD77', '#FF4F14', '#B87A12',
  '{"canCreateProjects":false,"canEditTeam":false,"canFinalizeRecap":false,"canUploadDocuments":true}'::jsonb,
  '{"weekStart":"2026-07-27","totalPct":110,"status":"overloaded","breakdown":[
    {"projectId":"b0000000-0000-0000-0000-000000000002","pct":40},
    {"projectId":"b0000000-0000-0000-0000-000000000006","pct":30},
    {"projectId":"b0000000-0000-0000-0000-000000000005","pct":30},
    {"projectId":null,"label":"Internal / other work","pct":10}
  ]}'::jsonb),
('a0000000-0000-0000-0000-000000000006', 'Sara Chehade', 'Intern', 'employee', 'sara.chehade@dieminnovate.com',
  '{}', 10, 'Intern', true, '#4747F2', '#6456A6', '#4747F2',
  '{"canCreateProjects":false,"canEditTeam":false,"canFinalizeRecap":false,"canUploadDocuments":false}'::jsonb,
  '{"weekStart":"2026-07-12","totalPct":80,"status":"balanced","breakdown":[
    {"projectId":"b0000000-0000-0000-0000-000000000001","pct":80}
  ]}'::jsonb),
('a0000000-0000-0000-0000-000000000007', 'Andrew Dagher', 'Junior Innovation Lead', 'employee', 'andrew.dagher@dieminnovate.com',
  '{}', 10, 'Full-Time', true, '#00BA9E', '#4747F2', '#E8450E',
  '{"canCreateProjects":false,"canEditTeam":false,"canFinalizeRecap":false,"canUploadDocuments":false}'::jsonb, null)
on conflict (id) do nothing;

-- ============================================================
-- projects
-- ============================================================
insert into projects (id, name, type, client, category, priority, owner_id, start_date, end_date, next_deliverable, progress_manual, health_manual) values
('b0000000-0000-0000-0000-000000000001', 'Product Implementation', 'internal', null, 'DIEM', 'medium',
  'a0000000-0000-0000-0000-000000000006', '2026-06-22', '2026-08-29', 'Collect data for deployment',
  '{"enabled":true,"value":50,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb),
('b0000000-0000-0000-0000-000000000002', 'MoC Incubator Portal', 'client', 'Ministry of Culture', null, 'high',
  'a0000000-0000-0000-0000-000000000005', '2025-10-01', '2026-07-31', 'Amend the portal according to the new incubation plans once they are finalized',
  '{"enabled":true,"value":90,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb),
('b0000000-0000-0000-0000-000000000003', 'MoC Relationship Managers', 'client', 'Ministry of Culture', null, 'high',
  'a0000000-0000-0000-0000-000000000005', '2026-04-01', '2026-07-31', 'Complete the handover documents',
  '{"enabled":true,"value":95,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb),
('b0000000-0000-0000-0000-000000000004', 'MHRSD AI Proposal', 'client', 'MHRSD', null, 'medium',
  'a0000000-0000-0000-0000-000000000005', '2026-07-08', '2026-07-10', 'Follow up with Hesham',
  '{"enabled":true,"value":90,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb),
('b0000000-0000-0000-0000-000000000005', 'GAMR RFI Proposal', 'client', 'GAMR / Upsource', null, 'high',
  'a0000000-0000-0000-0000-000000000004', '2026-07-27', '2026-07-28', 'Finalize the proposal',
  '{"enabled":true,"value":50,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb),
('b0000000-0000-0000-0000-000000000006', 'MoC Incubation Plans', 'client', 'Ministry of Culture', null, 'high',
  'a0000000-0000-0000-0000-000000000003', '2026-07-23', '2026-07-31', 'Finalize the new incubation plans for the two new entities',
  '{"enabled":true,"value":50,"reason":"Reported progress from operational data","by":null,"date":"2026-07-29"}'::jsonb,
  '{"enabled":true,"value":"on-track"}'::jsonb)
on conflict (id) do nothing;

insert into project_team (project_id, person_id) values
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006'),
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007'),
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007'),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003'),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005')
on conflict do nothing;

-- ============================================================
-- tasks
-- ============================================================
insert into tasks (id, project_id, name, assignee_id, assignee2_id, status, due_date, start_date, priority, weight, workload_days, include_weekends, notes, next_step, progress_pct) values
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Collecting Data',
  'a0000000-0000-0000-0000-000000000006', null, 'not-started', '2026-07-27', '2026-07-17', 'high', 100, 10, true, '', 'Fill in the data', 0),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Collecting Data',
  'a0000000-0000-0000-0000-000000000005', null, 'not-started', '2026-09-15', '2026-08-15', 'medium', 41, 3, false, '', '', 0),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Implement 2FA',
  'a0000000-0000-0000-0000-000000000005', null, 'not-started', '2026-08-10', '2026-08-03', 'medium', 27, 2, false, '', '', 0),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Add Marketing Services',
  'a0000000-0000-0000-0000-000000000005', null, 'not-started', '2026-08-04', '2026-08-03', 'medium', 27, 2, false, '', '', 0),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Work on Financials',
  'a0000000-0000-0000-0000-000000000007', null, 'not-started', '2026-07-29', '2026-07-29', 'high', 3, 0.2, false, '', 'Reflect the work in the SteerCo deck', 0),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Work on SteerCo Deck Financials and Progress Slides',
  'a0000000-0000-0000-0000-000000000007', null, 'not-started', '2026-07-29', '2026-07-29', 'high', 3, 0.2, false, '', '', 0),
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'Finalizing the Handover',
  'a0000000-0000-0000-0000-000000000005', null, 'in-progress', '2026-07-31', '2026-07-27', 'high', 100, 3, false, '', '', 50),
('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 'Follow Up with Hesham',
  'a0000000-0000-0000-0000-000000000005', null, 'in-progress', '2026-07-28', '2026-07-28', 'medium', 100, 0.5, false, '', '', 80),
('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 'Send Proposal to Upsource',
  'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'in-progress', '2026-07-28', '2026-07-28', 'high', 100, 2, false, '', '', 80),
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000006', 'Finalize the Incubation Plans',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'in-progress', '2026-07-31', '2026-07-23', 'high', 94, 8, false, '', '', 50),
('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000006', 'Finalize Deck',
  'a0000000-0000-0000-0000-000000000007', null, 'not-started', '2026-07-29', '2026-07-29', 'high', 6, 0.5, false, '', '', 0)
on conflict (id) do nothing;

-- ============================================================
-- blockers
-- ============================================================
insert into blockers (id, project_id, title, cause, impact, owner_id, urgency, action_needed, suggested_solution, date_raised, status) values
('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Decision needed: Firebase vs Supabase',
  'The platform choice for deployment has not yet been decided.',
  'Data collection can proceed, but deployment cannot move forward until the platform is chosen.',
  'a0000000-0000-0000-0000-000000000006', 'medium', 'Decide between Firebase and Supabase.', '', '2026-06-22', 'open')
on conflict (id) do nothing;

-- ============================================================
-- day_off
-- ============================================================
insert into day_off (id, person_id, start_date, end_date, type, note, submitted_date, status, comment, decided_by, decided_date, employee_seen) values
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', '2026-07-20', '2026-07-26',
  'Planned leave', '', '2026-07-01', 'approved', '', null, null, true)
on conflict (id) do nothing;
