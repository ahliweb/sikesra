-- Migration 007: Least-privilege app role and GRANT setup
-- Issue: ahliweb/sikesra#64
-- NOTE: This migration is idempotent. The awcms_mini_app role is created
--       only if it does not already exist. Run as the migration superuser.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'awcms_mini_app') then
    create role awcms_mini_app nologin;
  end if;
end
$$;

-- Grant usage on schema
grant usage on schema public to awcms_mini_app;

-- Grant only DML (no DDL) on app tables to the app role
grant select, insert, update, delete on
  public.users,
  public.roles,
  public.permissions,
  public.user_roles,
  public.role_permissions,
  public.abac_policy_attributes,
  public.user_security_settings,
  public.user_recovery_codes,
  public.login_attempts,
  public.sites,
  public.content,
  public.audit_logs,
  public.file_objects,
  public.message_templates,
  public.notification_requests,
  public.notification_delivery_logs,
  public.provider_webhook_events,
  public.religion_references,
  public.religion_reference_aliases
to awcms_mini_app;

-- Allow app role to read migrations table (needed for status checks at startup)
grant select on public.sikesra_migrations to awcms_mini_app;

-- Allow sequences used by uuid_generate_* or gen_random_uuid (no sequences needed for uuid default)
-- Grant future tables automatically
alter default privileges in schema public
  grant select, insert, update, delete on tables to awcms_mini_app;

insert into public.sikesra_migrations (name, applied_at)
values ('007_create_app_role_grants', now())
on conflict (name) do nothing;
