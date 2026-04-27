-- Migration 005: File objects table
-- Issue: ahliweb/sikesra#64

begin;

create table if not exists public.file_objects (
  id                uuid        primary key default gen_random_uuid(),
  entity_type       text        not null,
  entity_id         text        not null,
  bucket_name       text        not null,
  storage_key       text        not null,
  original_name     text        not null,
  safe_name         text        not null,
  mime_type         text        not null,
  extension         text        not null,
  size_bytes        bigint      not null check (size_bytes >= 0),
  checksum_sha256   text        not null,
  visibility        text        not null default 'private'
                      check (visibility in ('public', 'private', 'restricted')),
  access_policy     text        not null default 'owner'
                      check (access_policy in ('owner', 'authenticated', 'public', 'admin')),
  uploaded_by       uuid        references public.users(id) on delete set null,
  uploaded_at       timestamptz not null default now(),
  verified_at       timestamptz,
  status            text        not null default 'pending'
                      check (status in ('pending', 'active', 'quarantined', 'deleted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  created_by        uuid,
  updated_by        uuid,
  deleted_by        uuid
);

create index if not exists file_objects_entity_idx on public.file_objects (entity_type, entity_id);
create index if not exists file_objects_storage_key_idx on public.file_objects (bucket_name, storage_key);
create index if not exists file_objects_uploaded_by_idx on public.file_objects (uploaded_by);
create index if not exists file_objects_status_idx on public.file_objects (status);
create index if not exists file_objects_deleted_at_idx on public.file_objects (deleted_at) where deleted_at is null;

insert into public.sikesra_migrations (name, applied_at)
values ('005_create_file_objects_table', now())
on conflict (name) do nothing;

commit;
