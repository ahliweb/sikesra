-- Migration 008: Server-side API session revocations
-- Issue: ahliweb/sikesra#68

begin;

create table if not exists public.session_revocations (
  token_hash text primary key,
  user_id    uuid references public.users(id) on delete cascade,
  revoked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists session_revocations_user_id_idx on public.session_revocations (user_id);
create index if not exists session_revocations_expires_at_idx on public.session_revocations (expires_at);

grant select, insert, update, delete on public.session_revocations to awcms_mini_app;

insert into public.sikesra_migrations (name, applied_at)
values ('008_create_session_revocations', now())
on conflict (name) do nothing;

commit;
