-- Migration 002: Auth and user tables
-- Issue: ahliweb/sikesra#64

begin;

-- -------------------------------------------------------------------------
-- users
-- -------------------------------------------------------------------------
create table if not exists public.users (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null unique,
  password_hash   text        not null,
  status          text        not null default 'active'
                    check (status in ('active', 'inactive', 'suspended', 'pending_verification')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  created_by      uuid,
  updated_by      uuid,
  deleted_by      uuid
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_status_idx on public.users (status);
create index if not exists users_deleted_at_idx on public.users (deleted_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- roles
-- -------------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);

-- -------------------------------------------------------------------------
-- permissions
-- -------------------------------------------------------------------------
create table if not exists public.permissions (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);

-- -------------------------------------------------------------------------
-- user_roles
-- -------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid not null references public.users(id) on delete cascade,
  role_id    uuid not null references public.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid,
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_id_idx on public.user_roles (role_id);

-- -------------------------------------------------------------------------
-- role_permissions
-- -------------------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted_at    timestamptz not null default now(),
  granted_by    uuid,
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_permission_id_idx on public.role_permissions (permission_id);

-- -------------------------------------------------------------------------
-- abac_policy_attributes
-- -------------------------------------------------------------------------
create table if not exists public.abac_policy_attributes (
  id          uuid        primary key default gen_random_uuid(),
  subject_type text        not null,  -- 'user' | 'role'
  subject_id  uuid        not null,
  attribute   text        not null,
  value       text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);

create index if not exists abac_policy_attributes_subject_idx
  on public.abac_policy_attributes (subject_type, subject_id);

insert into public.sikesra_migrations (name, applied_at)
values ('002_create_auth_tables', now())
on conflict (name) do nothing;

commit;
