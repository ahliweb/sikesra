-- Migration 003: Security tables (2FA, login attempts, recovery codes)
-- Issue: ahliweb/sikesra#64

-- -------------------------------------------------------------------------
-- user_security_settings
-- -------------------------------------------------------------------------
create table if not exists public.user_security_settings (
  user_id                        uuid        primary key references public.users(id) on delete cascade,
  two_factor_enabled             boolean     not null default false,
  two_factor_method              text        check (two_factor_method in ('totp', 'recovery_code') or two_factor_method is null),
  two_factor_secret_encrypted    text,       -- encrypted TOTP secret; never plaintext
  two_factor_confirmed_at        timestamptz,
  last_two_factor_verified_at    timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- user_recovery_codes
-- -------------------------------------------------------------------------
create table if not exists public.user_recovery_codes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  code_hash   text        not null,  -- bcrypt/argon2 hash; never store plaintext
  used_at     timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists user_recovery_codes_user_id_idx on public.user_recovery_codes (user_id);

-- -------------------------------------------------------------------------
-- login_attempts
-- -------------------------------------------------------------------------
create table if not exists public.login_attempts (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        references public.users(id) on delete set null,
  email_or_identifier   text        not null,       -- stored as-is for admin review; treat as sensitive
  ip_address_hash       text        not null,        -- SHA-256 of IP; never raw IP
  user_agent_hash       text,                        -- SHA-256 of UA string
  success               boolean     not null default false,
  failure_reason        text,
  turnstile_verified    boolean     not null default false,
  two_factor_required   boolean     not null default false,
  two_factor_verified   boolean     not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists login_attempts_user_id_idx on public.login_attempts (user_id);
create index if not exists login_attempts_created_at_idx on public.login_attempts (created_at);
create index if not exists login_attempts_ip_hash_idx on public.login_attempts (ip_address_hash);

insert into public.sikesra_migrations (name, applied_at)
values ('003_create_security_tables', now())
on conflict (name) do nothing;
