-- Everyone can upload documents now (no longer a per-person toggle).
update people
set permissions = coalesce(permissions, '{}'::jsonb) || '{"canUploadDocuments": true}'::jsonb
where role_type = 'employee';

-- Interns and Junior Innovation Leads cannot create projects, regardless of
-- what was previously granted.
update people
set permissions = coalesce(permissions, '{}'::jsonb) || '{"canCreateProjects": false}'::jsonb
where role_type = 'employee' and role in ('Intern', 'Junior Innovation Lead');

-- Normalize existing job-title text to the canonical hierarchy so Planning's
-- seniority sort works consistently ("Innovation Lead II" -> "Innovation Lead 2").
update people set role = 'Innovation Lead 2' where role = 'Innovation Lead II';
update people set role = 'Innovation Lead 1' where role = 'Innovation Lead I';
