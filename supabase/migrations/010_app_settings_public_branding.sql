-- Allow signed-out visitors to read app_settings so the login page can
-- render the configured portal branding (logo, primary color) before
-- sign-in. Nothing in this table is sensitive — workload thresholds,
-- working days, category/tag lists, and branding are internal
-- configuration, not user data.
-- Safe to re-run.

drop policy if exists "app_settings_select_anon" on app_settings;
create policy "app_settings_select_anon" on app_settings
  for select to anon using (true);
