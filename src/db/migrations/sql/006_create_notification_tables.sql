-- Migration 006: Notification tables
-- Issue: ahliweb/sikesra#64

begin;

-- -------------------------------------------------------------------------
-- message_templates
-- -------------------------------------------------------------------------
create table if not exists public.message_templates (
  id               uuid        primary key default gen_random_uuid(),
  channel          text        not null check (channel in ('email', 'whatsapp', 'sms')),
  provider         text        not null,
  template_key     text        not null,
  subject_template text,
  body_template    text        not null,
  language         text        not null default 'id',
  status           text        not null default 'active'
                     check (status in ('active', 'inactive', 'draft')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  created_by       uuid,
  updated_by       uuid,
  deleted_by       uuid,
  unique (channel, provider, template_key, language)
);

create index if not exists message_templates_key_idx
  on public.message_templates (template_key, channel, language);

-- -------------------------------------------------------------------------
-- notification_requests
-- -------------------------------------------------------------------------
create table if not exists public.notification_requests (
  id                  uuid        primary key default gen_random_uuid(),
  channel             text        not null check (channel in ('email', 'whatsapp', 'sms')),
  provider            text        not null,
  template_key        text,
  recipient_hash      text        not null,   -- SHA-256 of recipient identifier; no raw email/phone
  recipient_masked    text        not null,   -- e.g. "u**r@e***.com", "+62***1234"
  subject             text,
  body_preview        text,                   -- first 160 chars; no sensitive data
  payload_json        jsonb       not null default '{}',
  status              text        not null default 'pending'
                        check (status in ('pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled')),
  idempotency_key     text        unique,
  requested_by        uuid        references public.users(id) on delete set null,
  requested_at        timestamptz not null default now(),
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  failed_at           timestamptz,
  error_code          text,
  error_message_safe  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  created_by          uuid,
  updated_by          uuid,
  deleted_by          uuid
);

create index if not exists notification_requests_status_idx on public.notification_requests (status);
create index if not exists notification_requests_requested_at_idx on public.notification_requests (requested_at);
create index if not exists notification_requests_recipient_hash_idx on public.notification_requests (recipient_hash);

-- -------------------------------------------------------------------------
-- notification_delivery_logs
-- -------------------------------------------------------------------------
create table if not exists public.notification_delivery_logs (
  id                       uuid        primary key default gen_random_uuid(),
  notification_request_id  uuid        not null
                             references public.notification_requests(id) on delete cascade,
  provider                 text        not null,
  provider_message_id      text,
  status                   text        not null
                             check (status in ('sent', 'delivered', 'bounced', 'failed', 'retrying')),
  provider_response_safe   jsonb       not null default '{}',
  attempt_number           integer     not null default 1,
  next_retry_at            timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists notification_delivery_logs_request_idx
  on public.notification_delivery_logs (notification_request_id);

-- -------------------------------------------------------------------------
-- provider_webhook_events
-- -------------------------------------------------------------------------
create table if not exists public.provider_webhook_events (
  id                   uuid        primary key default gen_random_uuid(),
  provider             text        not null,
  event_type           text        not null,
  provider_message_id  text,
  payload_safe         jsonb       not null default '{}',
  signature_verified   boolean     not null default false,
  received_at          timestamptz not null default now(),
  processed_at         timestamptz
);

create index if not exists provider_webhook_events_provider_idx
  on public.provider_webhook_events (provider, event_type);
create index if not exists provider_webhook_events_message_id_idx
  on public.provider_webhook_events (provider_message_id);

insert into public.sikesra_migrations (name, applied_at)
values ('006_create_notification_tables', now())
on conflict (name) do nothing;

commit;
