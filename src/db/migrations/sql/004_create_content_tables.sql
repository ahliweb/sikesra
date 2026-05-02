-- Migration 004: Content and site configuration tables
-- Issue: ahliweb/sikesra#64

-- -------------------------------------------------------------------------
-- sites (single-tenant config store)
-- -------------------------------------------------------------------------
create table if not exists public.sites (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique default 'default',
  name        text        not null,
  description text,
  config      jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  created_by  uuid,
  updated_by  uuid,
  deleted_by  uuid
);

-- -------------------------------------------------------------------------
-- content (module data, keyed by module + entity type + entity id)
-- -------------------------------------------------------------------------
create table if not exists public.content (
  id          uuid        primary key default gen_random_uuid(),
  site_id     uuid        not null references public.sites(id) on delete cascade,
  module      text        not null,
  entity_type text        not null,
  entity_id   text        not null,
  data        jsonb       not null default '{}',
  status      text        not null default 'draft'
                check (status in ('draft', 'published', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  created_by  uuid,
  updated_by  uuid,
  deleted_by  uuid
);

create index if not exists content_site_module_idx on public.content (site_id, module);
create index if not exists content_entity_idx on public.content (entity_type, entity_id);
create index if not exists content_status_idx on public.content (status);
create index if not exists content_deleted_at_idx on public.content (deleted_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- audit_logs
-- -------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id             uuid        primary key default gen_random_uuid(),
  actor_id       uuid,       -- user who performed the action (null for system)
  actor_type     text        not null default 'user',
  action         text        not null,
  resource_type  text        not null,
  resource_id    text,
  payload_safe   jsonb       not null default '{}',  -- sanitized payload; no secrets, PII reduced
  ip_address_hash text,      -- SHA-256 of IP
  user_agent_hash text,      -- SHA-256 of UA
  created_at     timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);

insert into public.sikesra_migrations (name, applied_at)
values ('004_create_content_tables', now())
on conflict (name) do nothing;
