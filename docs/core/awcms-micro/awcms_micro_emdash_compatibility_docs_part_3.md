# AWCMS-Micro Implementation Documentation

## Part 3 — Database, Tenancy, Soft Delete, and Storage

**Document status:** Draft v0.1  
**Purpose:** Define the database, tenancy, soft delete, media, upload, and storage standards for implementing AWCMS-Micro while remaining compatible with original EmDash architecture.

---

## 1. Objective of Part 3

Part 3 defines how AWCMS-Micro should manage data and storage without breaking EmDash compatibility.

This document covers:

1. database design principles;
2. EmDash schema boundary;
3. AWCMS-Micro tenant-readiness;
4. default tenant implementation;
5. custom table standards;
6. soft delete policy;
7. media metadata;
8. secure upload flow;
9. Cloudflare R2/S3-compatible storage path discipline;
10. backup and restore;
11. migration and rollback strategy;
12. validation and testing.

The main principle:

```txt
Use EmDash database and storage abstractions where EmDash already provides them.
Add AWCMS-Micro database, tenancy, and storage governance around EmDash, not destructively inside EmDash core.
```

---

## 2. Key Design Principle

AWCMS-Micro must be:

```txt
Single-tenant operationally.
Tenant-ready structurally.
EmDash-compatible architecturally.
Secure-by-default operationally.
```

That means:

- one default tenant is used today;
- future multi-tenancy is anticipated in custom AWCMS tables;
- EmDash core schema is not modified recklessly;
- all sensitive operations are auditable;
- storage paths are future-proof;
- soft delete is consistent;
- uploads are controlled;
- migrations are reversible by operational rollback even when technically forward-only.

---

## 3. EmDash Database Boundary

### 3.1 EmDash Owns Its Core Schema

EmDash should remain responsible for its own schema and content model, including:

- internal EmDash tables;
- collection definitions;
- field definitions;
- content table conventions;
- admin content operations;
- media abstractions;
- plugin runtime expectations;
- migrations provided by upstream.

AWCMS-Micro must not casually alter EmDash core tables or internal migration behavior.

EmDash uses specific table naming conventions:

```txt
_emdash_collections     System table: collection metadata (slug, label, features)
_emdash_fields          System table: field definitions for each collection
ec_{collection_slug}    Content tables: one per collection (e.g., ec_posts, ec_pages)
```

EmDash content tables include these standard columns:

```txt
id text primary key
slug text unique
status text default 'draft'       (draft, published, scheduled)
author_id text
created_at text
updated_at text
published_at text
scheduled_at text
deleted_at text                    (soft delete)
version integer default 1          (optimistic locking)
live_revision_id text
draft_revision_id text
locale text default 'en'           (i18n: row-per-locale model)
translation_group text             (i18n: shared across translations)
```

Rich text content fields use **Portable Text** (structured JSON via TipTap editor), not raw HTML.

### 3.2 AWCMS-Micro Owns Its Custom Tables

AWCMS-Micro should create separate custom tables for:

- tenants;
- sites;
- AWCMS-specific settings;
- AWCMS roles and policies;
- ABAC policy sets;
- AWCMS module registry;
- custom documents module metadata;
- mobile API sessions;
- upload sessions;
- audit events;
- future ERP-like modules.

### 3.3 Database Boundary Rule

```txt
Do not force tenant_id into EmDash core tables until a safe upstream-compatible strategy is documented, tested, and justified.
```

Instead:

1. use default tenant in AWCMS custom tables;
2. use tenant context in wrappers/adapters;
3. use site-level config for website implementation;
4. use compatibility tests before touching EmDash internals;
5. document every divergence.

---

## 4. Database Technology Strategy

### 4.1 Local Development

Recommended local development database:

```txt
SQLite
```

Local development should prioritize:

- fast setup;
- low operational complexity;
- easy reset;
- demo-safe seed data;
- no production secrets;
- no private uploads committed.

### 4.2 Cloudflare Deployment

Recommended Cloudflare-native database path:

```txt
Cloudflare D1
```

Use this for:

- small to medium public websites;
- school portals;
- landing pages;
- public content and lightweight submissions;
- starter AWCMS-Micro deployments.

### 4.3 PostgreSQL / Managed SQL Path

Recommended for larger deployments:

```txt
PostgreSQL
```

Use this when:

- the site becomes more application-like;
- future ERP modules are planned;
- heavy reporting is required;
- multi-tenant shared database becomes realistic;
- advanced relational constraints and indexing are needed;
- long-term operational governance is required.

### 4.4 libSQL / Turso Path

Recommended for remote SQLite:

```txt
libSQL (Turso)
```

Use this when:

- you need SQLite compatibility with remote access;
- edge deployment without Cloudflare D1;
- Turso's global replication is beneficial.

### 4.5 EmDash Database Adapter Configuration

EmDash uses explicit adapter functions in `astro.config.mjs`, **not environment variables**:

```js
import emdash from "emdash/astro";
import { sqlite, postgres, libsql, d1 } from "emdash/db";

// SQLite (local Node.js)
database: sqlite({ url: "file:./data.db" })

// PostgreSQL
database: postgres({ connectionString: process.env.DATABASE_URL })

// libSQL (Turso)
database: libsql({
  url: process.env.LIBSQL_DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
})

// Cloudflare D1 (import from @emdash-cms/cloudflare)
import { d1 } from "@emdash-cms/cloudflare";
database: d1({ binding: "DB" })
```

EmDash uses Kysely for type-safe SQL queries across all supported databases.

### 4.6 Database Portability Rule

Because EmDash uses portable SQL abstractions (Kysely), AWCMS-Micro should avoid database-specific behavior unless isolated.

Use this pattern:

```txt
Common SQL behavior first.
Database-specific optimization only in adapters.
```

---

## 5. Default Tenant Standard

### 5.1 Default Tenant Identity

AWCMS-Micro starts with one tenant:

```txt
id   = 00000000-0000-0000-0000-000000000001
code = default
name = Default Tenant
```

This tenant must exist in every AWCMS-Micro installation.

### 5.2 Default Site Identity

Recommended default site:

```txt
id   = main
code = main
name = Main Site
```

Recommended relation:

```txt
Default Tenant
  └── Main Site
```

### 5.3 Default Tenant Rule

```txt
Single-tenant mode is an operating mode, not a database shortcut.
```

Even when only one website exists, AWCMS-Micro custom tables should remain ready for tenant and site separation.

---

## 6. Core AWCMS-Micro Tables

### 6.1 Required Base Tables

Recommended AWCMS-Micro base tables:

```txt
tenants
sites
site_settings
users
roles
permissions
role_permissions
user_roles
collections
pages
posts
menus
menu_items
media_objects
documents
forms
form_submissions
modules
module_installations
audit_events
```

Important:

Some of these may overlap conceptually with EmDash collections. Do not duplicate EmDash content functionality unless there is a clear reason. For example, `pages` and `posts` may be EmDash collections (stored in `ec_pages` and `ec_posts`), while `documents`, `audit_events`, and `module_installations` may be AWCMS custom modules.

AWCMS custom tables should use a distinct prefix to avoid collision with EmDash:

```txt
awcms_{table_name}    AWCMS-Micro custom module tables
ec_{collection}       EmDash content tables (do not create manually)
_emdash_{name}        EmDash system tables (do not modify)
```

### 6.2 Future Tables

Future tables:

```txt
tenant_domains
tenant_billing
tenant_module_limits
tenant_storage_quotas
tenant_theme_settings
tenant_backups
mobile_devices
mobile_sessions
mobile_refresh_tokens
mobile_notifications
awcms_policy_sets
awcms_policies
awcms_policy_conditions
```

### 6.3 Table Ownership Classification

| Table / Data Area | Owner | Rule |
| --- | --- | --- |
| EmDash internal tables | EmDash | Do not modify without upstream study |
| EmDash content collections | EmDash | Use EmDash schema system where possible |
| AWCMS tenant tables | AWCMS-Micro | Tenant-ready from day one |
| AWCMS ABAC tables | AWCMS-Micro | Isolated, namespaced, tested |
| AWCMS audit events | AWCMS-Micro | Append-only or tightly controlled |
| AWCMS mobile sessions | AWCMS-Micro | Expiring, revocable, tenant-aware |
| ERP-like records | Future AWCMS modules | Separate module tables |

---

## 7. Standard Columns for AWCMS Custom Tables

Every AWCMS-Micro custom business/content table should include:

```txt
tenant_id uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz null
created_by uuid null
updated_by uuid null
```

### 7.1 SQLite/D1 Compatibility Note

SQLite and D1 do not enforce PostgreSQL types such as `uuid` and `timestamptz` in the same way PostgreSQL does.

For portability, use logical types in documentation and implementation adapters.

Example portable interpretation:

| Logical Type | SQLite/D1 | PostgreSQL |
| --- | --- | --- |
| uuid | text | uuid |
| timestamptz | text ISO-8601 or integer epoch | timestamptz |
| json | text JSON | jsonb |
| boolean | integer 0/1 | boolean |

### 7.2 Portable SQLite/D1 Style

For SQLite/D1-compatible schemas:

```sql
created_at text not null default (datetime('now'))
updated_at text not null default (datetime('now'))
deleted_at text null
```

For PostgreSQL-compatible schemas:

```sql
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz null
```

### 7.3 Implementation Rule

```txt
Document logical schema once.
Generate or adapt database-specific migrations separately when needed.
```

---

## 8. Default Tenant Tables

### 8.1 `awcms_tenants`

Conceptual schema:

```sql
create table awcms_tenants (
  id text primary key,
  code text not null unique,
  name text not null,
  status text not null default 'active',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

Seed:

```sql
insert into tenants (id, code, name, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Default Tenant',
  'active'
);
```

### 8.2 `sites`

Conceptual schema:

```sql
create table awcms_sites (
  id text primary key,
  tenant_id text not null,
  code text not null,
  name text not null,
  primary_domain text null,
  status text not null default 'active',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, code)
);
```

Seed:

```sql
insert into sites (id, tenant_id, code, name, status)
values (
  'main',
  '00000000-0000-0000-0000-000000000001',
  'main',
  'Main Site',
  'active'
);
```

### 8.3 `site_settings`

Conceptual schema:

```sql
create table awcms_site_settings (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  key text not null,
  value_json text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, key)
);
```

Examples:

```txt
site.identity
site.contact
site.social_links
site.seo_defaults
site.theme
site.storage_policy
site.privacy_policy
```

---

## 9. Tenant Context Strategy

### 9.1 Tenant Context Object

AWCMS-Micro should use a tenant context object in services and APIs.

Example:

```ts
type AWCMSContext = {
  tenantId: string;
  tenantCode: string;
  siteId: string;
  siteCode: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  requestId: string;
};
```

### 9.2 Default Context

In single-tenant mode:

```ts
const defaultContext = {
  tenantId: "00000000-0000-0000-0000-000000000001",
  tenantCode: "default",
  siteId: "main",
  siteCode: "main",
};
```

### 9.3 Context Rule

```txt
All AWCMS custom services must receive tenant/site context explicitly or derive it from a trusted request context.
```

Avoid:

```txt
Hardcoded tenant assumptions scattered across route files.
```

Prefer:

```txt
central getAWCMSContext(request)
```

---

## 10. Row-Level Security Readiness

### 10.1 RLS-Readiness Principle

Even if SQLite/D1 does not support PostgreSQL RLS, design tables so PostgreSQL RLS can be added later.

This means:

- every AWCMS custom table has `tenant_id`;
- user/role/policy tables are tenant-aware where appropriate;
- all service queries filter by tenant;
- tests verify cross-tenant isolation logic;
- no query returns all tenants unless explicitly authorized.

### 10.2 Query Rule

Every tenant-scoped query must include:

```sql
where tenant_id = :tenant_id
  and deleted_at is null
```

When site-scoped:

```sql
where tenant_id = :tenant_id
  and site_id = :site_id
  and deleted_at is null
```

### 10.3 Future PostgreSQL RLS Example

Future concept:

```sql
create policy tenant_isolation_policy
on documents
for all
using (tenant_id = current_setting('app.tenant_id')::uuid);
```

This is future PostgreSQL logic, not required in SQLite/D1 MVP.

---

## 11. Soft Delete Strategy

### 11.1 General Soft Delete Rule

Soft delete means:

```txt
Do not physically remove the row immediately.
Set deleted_at timestamp.
Hide it from normal queries.
Allow restore when authorized.
Keep audit trail.
```

### 11.2 Delete Behavior by Data Type

| Data Type | Delete Behavior | Restore? | Notes |
| --- | --- | --- | --- |
| EmDash content entries | Use EmDash soft delete behavior | If supported by EmDash UI/API | Do not duplicate logic |
| AWCMS custom records | Set `deleted_at` | Yes | Add audit event |
| Media metadata | Set `deleted_at` or `status=deleted` | Yes | Object may remain in storage |
| R2/S3 object | Do not immediately delete by default | Sometimes | Use lifecycle cleanup |
| Audit events | Append-only; no normal delete | No | Retention policy only |
| Permission policies | Disable or soft delete | Yes | Audit every change |
| Form submissions | Soft delete or anonymize | Depends | Respect privacy/retention |
| ERP-like records | Void/reversal preferred | Depends | Do not lose financial history |

### 11.3 Soft Delete Query Rule

Normal list/detail queries must include:

```sql
deleted_at is null
```

Admin trash queries may include:

```sql
deleted_at is not null
```

Restore operation:

```sql
update documents
set deleted_at = null,
    updated_at = datetime('now'),
    updated_by = :user_id
where id = :id
  and tenant_id = :tenant_id;
```

### 11.4 Hard Delete Rule

Hard delete is only allowed for:

- test data;
- temporary upload sessions;
- expired cache rows;
- explicitly approved retention cleanup;
- legal/compliance deletion process after audit review.

Never hard delete sensitive business records casually.

---

## 12. Audit Requirements for Data Changes

### 12.1 Required Audit Events

Log these events:

```txt
record.created
record.updated
record.soft_deleted
record.restored
record.hard_deleted
media.upload_requested
media.upload_confirmed
media.soft_deleted
media.object_deleted
document.published
document.unpublished
document.downloaded
policy.created
policy.updated
policy.disabled
permission.assigned
permission.revoked
module.installed
module.disabled
```

### 12.2 `audit_events` Conceptual Schema

```sql
create table audit_events (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  actor_user_id text null,
  actor_type text not null default 'user',
  action text not null,
  resource_type text not null,
  resource_id text null,
  ip_address text null,
  user_agent text null,
  request_id text null,
  metadata_json text null,
  created_at text not null default (datetime('now'))
);
```

### 12.3 Audit Rule

```txt
Security-relevant changes must be auditable before production release.
```

---

## 13. Media Metadata Strategy

### 13.1 Why Media Metadata Matters

Storage objects alone are not enough. AWCMS-Micro needs metadata for:

- access control;
- ownership;
- tenant/site scoping;
- file type validation;
- public/private classification;
- signed URL issuance;
- audit logs;
- cleanup;
- search and filtering;
- future quotas.

### 13.2 `media_objects` Conceptual Schema

```sql
create table awcms_media_objects (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  storage_driver text not null,
  bucket text null,
  object_key text not null,
  original_filename text not null,
  safe_filename text not null,
  mime_type text not null,
  extension text null,
  size_bytes integer not null,
  checksum_sha256 text null,
  width integer null,
  height integer null,
  visibility text not null default 'private',
  status text not null default 'active',
  module_id text null,
  owner_user_id text null,
  metadata_json text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, object_key)
);
```

### 13.3 Visibility Values

Recommended:

```txt
public
private
restricted
temporary
archived
```

### 13.4 Status Values

Recommended:

```txt
pending_upload
active
processing
failed
deleted
quarantined
```

---

## 14. Document Metadata Strategy

### 14.1 `documents` Conceptual Schema

```sql
create table awcms_documents (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  media_object_id text not null,
  title text not null,
  slug text null,
  description text null,
  category text null,
  classification text not null default 'public',
  publish_status text not null default 'draft',
  published_at text null,
  expires_at text null,
  access_policy_json text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

### 14.2 Classification Values

Recommended:

```txt
public
internal
restricted
private
sensitive
```

### 14.3 Publish Status Values

Recommended:

```txt
draft
review
published
archived
expired
```

### 14.4 Document Rule

```txt
A document is not just a file.
A document is a governed record linked to media metadata, access policy, publication status, and audit trail.
```

---

## 15. Storage Path Standard

### 15.1 Local Development Path

Local development:

```txt
./uploads/tenants/default/sites/main/media/{year}/{month}/{filename}
```

### 15.2 Production Single-Tenant Path

Recommended production path:

```txt
tenants/default/sites/main/media/{year}/{month}/{filename}
```

### 15.3 Future Multi-Tenant Path

Future path:

```txt
tenants/{tenant_id}/sites/{site_id}/media/{year}/{month}/{filename}
```

### 15.4 Module-Specific Path

For module uploads:

```txt
tenants/{tenant_id}/sites/{site_id}/modules/{module_id}/{year}/{month}/{filename}
```

Examples:

```txt
tenants/default/sites/main/modules/documents/2026/05/school-policy.pdf
tenants/default/sites/main/modules/kelulusan/2026/05/skl-1234567890.pdf
tenants/default/sites/main/modules/forms/2026/05/attachment-abc123.pdf
```

### 15.5 Avoid

Do not use:

```txt
uploads/{filename}
files/{filename}
media/{filename}
```

without tenant/site/module context.

---

## 16. Safe Filename Strategy

### 16.1 Filename Rule

Never trust user-provided filenames.

Store:

```txt
original_filename = name uploaded by user
safe_filename     = sanitized/generated name for storage
```

### 16.2 Recommended Safe Filename Format

```txt
{timestamp}-{random_id}-{slugified_basename}.{extension}
```

Example:

```txt
20260505-01HXZP4Q8M-school-policy.pdf
```

### 16.3 Filename Validation

Reject or sanitize:

- path traversal: `../`;
- backslashes;
- control characters;
- null bytes;
- excessive length;
- dangerous double extensions;
- executable extensions;
- hidden dotfiles when not expected.

---

## 17. Upload Validation

### 17.1 Required Checks

Every upload must validate:

1. authentication or public upload policy;
2. permission;
3. tenant/site context;
4. module scope;
5. file extension;
6. MIME type;
7. file size;
8. filename safety;
9. storage path;
10. virus/malware scanning if available;
11. metadata extraction;
12. audit log.

### 17.2 Suggested File Type Policy

For standard websites:

| Type | Extensions | Notes |
| --- | --- | --- |
| Images | jpg, jpeg, png, webp, svg | SVG must be sanitized or restricted |
| Documents | pdf, doc, docx, xls, xlsx, ppt, pptx | Prefer PDF for public documents |
| Archives | zip | Restrict carefully |
| Video | mp4, webm | Use size limits |
| Audio | mp3, wav, m4a | Use size limits |

### 17.3 Dangerous File Types

Block by default:

```txt
exe
bat
cmd
sh
php
js
mjs
html
htm
svg with scripts
jar
apk
msi
ps1
vbs
scr
```

Some file types may be allowed only for trusted admin-only storage, never public execution.

---

## 18. Upload Flow

### 18.1 Recommended Direct Upload Flow

Use a signed upload flow when supported:

```txt
1. Client requests upload URL.
2. API validates request.
3. API creates media upload session.
4. API returns signed upload URL.
5. Client uploads directly to R2/S3/local adapter.
6. Client confirms upload.
7. API verifies object existence and metadata.
8. API marks media object active.
9. API creates audit event.
```

### 18.2 API Flow

```txt
POST /api/media/upload-url
PUT  signed_upload_url
POST /api/media/{id}/confirm
```

For AWCMS mobile API:

```txt
POST /api/mobile/v1/uploads/request
PUT  signed_upload_url
POST /api/mobile/v1/uploads/confirm
```

### 18.3 Upload Session Table

```sql
create table awcms_media_upload_sessions (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  media_object_id text null,
  module_id text null,
  requested_filename text not null,
  safe_filename text not null,
  expected_mime_type text null,
  expected_size_bytes integer null,
  object_key text not null,
  status text not null default 'pending',
  expires_at text not null,
  completed_at text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

### 18.4 Upload Session Status

```txt
pending
uploading
completed
expired
failed
cancelled
```

---

## 19. R2/S3-Compatible Storage Strategy

### 19.1 Storage Abstraction Rule

Use EmDash storage abstractions where possible.

AWCMS-Micro should add rules around:

- object key naming;
- tenant/site prefix;
- metadata record;
- permission check;
- signed URL expiration;
- audit logging;
- cleanup policy.

### 19.2 Cloudflare R2 Path

Recommended bucket object key:

```txt
tenants/default/sites/main/media/2026/05/example.pdf
```

Module-specific key:

```txt
tenants/default/sites/main/modules/documents/2026/05/example.pdf
```

### 19.3 Public vs Private Files

Public files:

```txt
Can be served with cache and public URL when approved.
```

Private files:

```txt
Must require permission check and signed URL.
```

Restricted files:

```txt
Must require stronger ABAC rule, audit log, and short signed URL expiry.
```

### 19.4 Signed URL Expiration

Recommended defaults:

| File Type | Expiration |
| --- | ---: |
| Public media preview | no signed URL or long cache |
| Private document download | 1–5 minutes |
| Sensitive document download | 30–120 seconds |
| Temporary upload URL | 5–15 minutes |
| Admin preview | 1–5 minutes |

---

## 20. Storage Quotas

### 20.1 Future Table: `tenant_storage_quotas`

```sql
create table awcms_tenant_storage_quotas (
  id text primary key,
  tenant_id text not null,
  max_storage_bytes integer not null,
  max_file_size_bytes integer not null,
  used_storage_bytes integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

### 20.2 Quota Rule

Even if quota enforcement is not in MVP, record enough metadata to enforce it later.

Minimum required metadata:

```txt
size_bytes
tenant_id
site_id
module_id
visibility
status
created_at
```

---

## 21. Indexing Strategy

### 21.1 Standard Indexes

For tenant-scoped tables:

```sql
create index idx_documents_tenant_id on documents (tenant_id);
create index idx_documents_site_id on documents (site_id);
create index idx_documents_deleted_at on documents (deleted_at);
create index idx_documents_publish_status on documents (publish_status);
create index idx_documents_classification on documents (classification);
```

For media:

```sql
create index idx_media_objects_tenant_id on media_objects (tenant_id);
create index idx_media_objects_site_id on media_objects (site_id);
create index idx_media_objects_object_key on media_objects (object_key);
create index idx_media_objects_deleted_at on media_objects (deleted_at);
create index idx_media_objects_visibility on media_objects (visibility);
create index idx_media_objects_status on media_objects (status);
```

### 21.2 Query Performance Rule

Index every column commonly used in:

- tenant filters;
- site filters;
- foreign keys;
- status filters;
- slug lookups;
- date sorting;
- soft delete filters;
- access control lookups.

---

## 22. Migration Strategy

### 22.1 Migration Principle

Use forward-only migrations for production.

Every migration must include:

- purpose;
- affected tables;
- data risk;
- compatibility impact;
- rollback plan;
- validation query;
- backup requirement.

### 22.2 Migration File Naming

Recommended:

```txt
YYYYMMDDHHMM_description.sql
```

Example:

```txt
202605050900_create_awcms_tenants.sql
202605050915_create_awcms_sites.sql
202605050930_create_awcms_media_objects.sql
```

### 22.3 Migration Documentation Header

Each migration should include:

```sql
-- Migration: create_awcms_tenants
-- Date: 2026-05-05
-- Purpose: Add default tenant support for AWCMS-Micro custom modules.
-- Compatibility: Does not modify EmDash core tables.
-- Rollback: Disable AWCMS tenant-dependent modules and restore DB backup if needed.
```

### 22.4 Rollback Philosophy

Database migrations are often forward-only, but operational rollback should be possible through:

- database backup restore;
- feature flag disable;
- module disable;
- reverting code;
- creating corrective migration;
- restoring previous deployment;
- hiding data through metadata/status.

---

## 23. Backup Strategy

### 23.1 Backup Types

| Backup Type | Purpose |
| --- | --- |
| Database backup | Restore records, settings, submissions, metadata |
| R2/S3 object backup | Restore uploaded files |
| Config backup | Restore environment and deployment settings |
| Seed backup | Recreate initial site structure |
| Audit export | Preserve governance records |

### 23.2 Backup Frequency

Recommended baseline:

| Site Type | Database Backup | Media Backup | Notes |
| --- | ---: | ---: | --- |
| Landing page | weekly | weekly | Low data volume |
| School website | daily | daily/weekly | Protect documents and posts |
| Government portal | daily | daily | Strong retention needed |
| Form-heavy site | daily or more | daily | Protect submissions |
| Secure document site | daily | daily | Sensitive data control |

### 23.3 Backup Before Migration

Before production migration:

```txt
1. export database;
2. verify export file;
3. snapshot storage metadata;
4. record current git commit;
5. record current deployment version;
6. document rollback steps;
7. run migration in staging first.
```

---

## 24. Restore Strategy

### 24.1 Restore Scenarios

| Scenario | Restore Strategy |
| --- | --- |
| Bad deployment | Roll back code/deployment |
| Bad migration | Restore DB backup or corrective migration |
| Accidental soft delete | Restore by setting `deleted_at = null` |
| Accidental hard delete | Restore from DB backup |
| Missing media metadata | Rebuild from storage inventory if possible |
| Missing object in R2/S3 | Restore object backup |
| Plugin caused data issue | Disable plugin, restore affected records |

### 24.2 Restore Test Requirement

Backups are not valid until restore is tested.

At least once per quarter for important sites:

```txt
Perform test restore to staging.
Verify database.
Verify media files.
Verify admin login.
Verify public pages.
Verify document downloads.
```

---

## 25. Data Retention Strategy

### 25.1 Data Retention Categories

| Data | Suggested Retention |
| --- | --- |
| Public posts/pages | indefinite or editorial policy |
| Draft content | project/editorial policy |
| Form submissions | defined period based on purpose |
| Contact leads | business/legal policy |
| Private documents | legal/document policy |
| Audit logs | long-term retention |
| Upload sessions | short retention, e.g. 7–30 days |
| Temporary signed URL records | short retention, e.g. 1–7 days |
| Authentication sessions | expire and rotate |

### 25.2 Privacy Rule

Do not store personal data longer than needed for the stated purpose.

AWCMS-Micro must support:

- export request;
- correction request;
- deletion/anonymization request where legally appropriate;
- retention policy documentation;
- audit of privacy-related actions.

---

## 26. Indonesian Compliance Considerations

AWCMS-Micro deployments in Indonesia must consider:

- personal data protection obligations;
- electronic system operation obligations;
- consent and lawful basis for form submissions;
- retention and deletion procedures;
- secure storage and access control;
- breach/incident handling;
- children/student data sensitivity;
- public-sector document governance where applicable.

### 26.1 School Website Special Concerns

School websites may process:

- student names;
- NISN;
- class data;
- graduation status;
- parent/guardian contact;
- student documents;
- student photos/videos.

Controls:

```txt
Do not expose bulk student lists publicly.
Use verification for private documents.
Use signed URLs for private PDFs.
Audit every private document access.
Use consent for forms and media publication where required.
```

### 26.2 Government/Public Portal Special Concerns

Government/public-sector portals may process:

- public documents;
- citizen submissions;
- complaint forms;
- service requests;
- regulatory documents;
- official announcements.

Controls:

```txt
Classify documents.
Track publication responsibility.
Audit document changes.
Protect form submissions.
Separate public documents from internal files.
```

---

## 27. ISO Alignment

### 27.1 ISO/IEC 27001

Database and storage controls should support:

- access control;
- asset inventory;
- logging;
- backup;
- incident response;
- supplier/cloud risk management.

### 27.2 ISO/IEC 27002

Relevant controls:

- identity and access management;
- privileged access;
- information classification;
- data leakage prevention;
- secure configuration;
- logging and monitoring.

### 27.3 ISO/IEC 27005

Use risk assessment for:

- private document modules;
- upload features;
- mobile API;
- external integrations;
- marketplace plugins;
- multi-tenancy.

### 27.4 ISO/IEC 27017 and 27018

Relevant for:

- Cloudflare R2/D1/KV;
- S3-compatible storage;
- cloud backup;
- cloud access control;
- personal data processing in cloud services.

### 27.5 ISO/IEC 27701

Relevant for privacy management:

- consent;
- privacy policy;
- data subject request;
- retention;
- deletion/anonymization;
- processor/controller documentation.

### 27.6 ISO/IEC 27034

Relevant for secure application development:

- secure coding;
- validation;
- authorization checks;
- secure file handling;
- testing.

### 27.7 ISO/IEC 20000-1

Relevant for operational service management:

- incident handling;
- change management;
- release management;
- service continuity.

### 27.8 ISO 22301

Relevant for business continuity:

- backup;
- restore;
- disaster recovery;
- continuity plans.

### 27.9 ISO/IEC 15408

Useful as security assurance thinking for high-risk modules:

- private document lookup;
- ABAC policy engine;
- mobile authentication;
- secure upload and signed URL services.

---

## 28. Five Practical Implementation Examples

### Example 1 — Standard School Website

Database needs:

- pages;
- posts;
- announcements;
- documents;
- media_objects;
- forms;
- form_submissions;
- audit_events.

Storage path:

```txt
tenants/default/sites/main/media/2026/05/news-photo.webp
tenants/default/sites/main/modules/documents/2026/05/school-calendar.pdf
```

Security:

- public news is cacheable;
- private student documents require verification;
- admin upload actions are audited.

### Example 2 — Secure Graduation Document Publication

Database needs:

- documents;
- media_objects;
- secure_document_sessions;
- audit_events;
- rate_limit_events.

Storage path:

```txt
tenants/default/sites/main/modules/kelulusan/2026/05/skl-nisn-hash.pdf
```

Security:

- no public listing of student files;
- short signed URL expiration;
- verification attempts rate-limited;
- every download audited.

### Example 3 — Company Profile with Lead Forms

Database needs:

- pages;
- posts;
- forms;
- form_submissions;
- audit_events;
- webhook_delivery_logs.

Storage path:

```txt
tenants/default/sites/main/modules/forms/2026/05/company-profile-attachment.pdf
```

Security:

- consent checkbox;
- spam protection;
- CRM webhook logs;
- retention policy for leads.

### Example 4 — Government Portal

Database needs:

- documents;
- document_categories;
- media_objects;
- audit_events;
- publication_history.

Storage path:

```txt
tenants/default/sites/main/modules/documents/2026/05/regulation-document.pdf
```

Security:

- document classification;
- publication audit;
- restricted internal documents not mixed with public files.

### Example 5 — Landing Page Factory

Database needs:

- sites;
- site_settings;
- pages;
- forms;
- form_submissions;
- media_objects.

Storage path:

```txt
tenants/default/sites/main/media/2026/05/landing-hero.webp
```

Future multi-site path:

```txt
tenants/default/sites/client-a/media/2026/05/hero.webp
```

Security:

- per-site settings;
- domain mapping later;
- lead data separation by site.

---

## 29. Testing Requirements

### 29.1 Database Tests

Test:

```txt
- default tenant exists;
- default site exists;
- custom tables include tenant_id;
- soft-deleted records are hidden from normal queries;
- restore clears deleted_at;
- tenant filter is enforced in services;
- audit event is created for sensitive changes.
```

### 29.2 Storage Tests

Test:

```txt
- upload path includes tenant/site;
- unsafe filename is sanitized;
- blocked file extension is rejected;
- oversized file is rejected;
- private file requires signed URL;
- media metadata is created;
- deleted media is hidden;
- audit event is created.
```

### 29.3 Migration Tests

Test:

```txt
- migrations run on empty database;
- migrations run on seeded database;
- rollback plan exists;
- compatibility matrix updated;
- no EmDash core table is modified unexpectedly.
```

### 29.4 Playwright Flows

Minimum flows:

```txt
1. admin uploads media;
2. admin creates document;
3. public downloads public document;
4. private document cannot be downloaded without permission;
5. admin soft deletes document;
6. soft-deleted document disappears from public list;
7. admin restores document;
8. audit log contains events.
```

---

## 30. GitHub Issues for Part 3

### Issue 1 — Add Default Tenant and Site Design

```md
## Goal
Document and implement the default tenant and default site model for AWCMS-Micro custom modules.

## Tasks
- Define default tenant ID/code/name
- Define default site ID/code/name
- Add seed plan
- Add tenant context helper design
- Document SQLite/D1/PostgreSQL type differences

## Validation
- Default tenant is documented
- Default site is documented
- Custom services can derive tenant context

## Rollback
Revert tenant seed/config changes.
```

### Issue 2 — Add AWCMS Custom Table Standards

```md
## Goal
Define standard columns and naming for AWCMS custom tables.

## Tasks
- Add standard columns
- Add deleted_at soft delete rule
- Add created_by/updated_by audit references
- Add indexing rules
- Add RLS-readiness guidance

## Validation
- Table standards are documented
- Future migrations can follow the standard

## Rollback
Revert documentation and migration changes.
```

### Issue 3 — Add Media Metadata and Upload Session Model

```md
## Goal
Design governed media metadata and upload session tables.

## Tasks
- Define media_objects schema
- Define media_upload_sessions schema
- Define visibility/status values
- Define upload flow
- Define file validation policy

## Validation
- Upload flow is documented
- Media metadata supports access control and audit

## Rollback
Revert media schema/migration changes.
```

### Issue 4 — Add Storage Path Policy

```md
## Goal
Standardize tenant/site/module-aware storage paths.

## Tasks
- Define local path
- Define production path
- Define future multi-tenant path
- Define module-specific path
- Define safe filename strategy

## Validation
- No upload path uses bare uploads/{filename}
- Path examples include tenant/site context

## Rollback
Revert storage policy changes.
```

### Issue 5 — Add Soft Delete and Restore Policy

```md
## Goal
Create consistent soft delete and restore behavior for AWCMS custom modules.

## Tasks
- Define deleted_at rule
- Define normal query filter
- Define trash query behavior
- Define restore behavior
- Define hard delete restrictions
- Define audit events

## Validation
- Normal queries exclude deleted rows
- Restore clears deleted_at
- Audit events are created

## Rollback
Revert soft delete implementation or disable affected module.
```

### Issue 6 — Add Backup and Restore Runbook

```md
## Goal
Create a practical backup and restore baseline.

## Tasks
- Define backup types
- Define backup frequency
- Define pre-migration backup checklist
- Define restore scenarios
- Define quarterly restore test recommendation

## Validation
- Backup plan exists
- Restore plan exists
- Migration checklist requires backup

## Rollback
Use restore procedure documented in runbook.
```

---

## 31. OpenCode / Antigravity Implementation Prompt for Part 3

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, database, Cloudflare R2/D1, and security implementation agent.

TASK:
Implement Part 3 of the AWCMS-Micro documentation: Database, Tenancy, Soft Delete, and Storage.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/compatibility-matrix.md, and docs/divergence-log.md.
3. Inspect EmDash upstream database and storage conventions before coding.
4. Do not modify EmDash core tables unless explicitly justified and documented.
5. Add tenant-readiness first to AWCMS custom modules.
6. Use default tenant: 00000000-0000-0000-0000-000000000001.
7. Use default site: main.
8. Use soft delete for AWCMS custom records.
9. Use tenant/site/module-aware storage paths.
10. Never commit secrets, local DB files, or uploads.
11. Create or update GitHub Issues for each atomic task.
12. Create a branch before implementation.
13. Run validation before completion.
14. Merge only after validation passes, then delete the branch.

GOAL:
Add documentation, schemas, seed strategy, storage policy, and tests for AWCMS-Micro database and storage governance while preserving EmDash compatibility.

PHASE 0 — DISCOVERY
- Inspect repository status.
- Read AGENTS.md.
- Read relevant docs.
- Inspect EmDash upstream database/storage conventions.
- Inspect SMAN 2 reference repository for media/storage patterns.
- Summarize compatibility risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Add Default Tenant and Site Design
2. Add AWCMS Custom Table Standards
3. Add Media Metadata and Upload Session Model
4. Add Storage Path Policy
5. Add Soft Delete and Restore Policy
6. Add Backup and Restore Runbook

PHASE 2 — BRANCH
Create branch:
feat/add-database-tenancy-storage-baseline

PHASE 3 — DOCUMENTATION
Update or create:
- docs/tenancy.md
- docs/storage.md
- docs/security.md
- docs/privacy.md
- docs/rollback.md
- docs/testing.md
- docs/compatibility-matrix.md
- docs/divergence-log.md if needed

PHASE 4 — SCHEMA/MIGRATION PLAN
If this repository already has a migration system, add migrations for AWCMS custom tables only:
- tenants
- sites
- site_settings
- media_objects
- media_upload_sessions
- documents, if not already handled by EmDash collections
- audit_events, if not already implemented

If no migration system exists yet, create docs and migration placeholders only.

PHASE 5 — SEED
Add default tenant and default site seed strategy.
Do not commit private data.

PHASE 6 — STORAGE POLICY
Add helper design or implementation for:
- tenant-aware object key generation
- safe filename generation
- file type allowlist/blocklist
- storage visibility values
- signed URL expiration policy

PHASE 7 — TEST PLAN
Add tests or test docs for:
- default tenant exists
- soft delete hides records
- restore works
- upload path includes tenant/site
- unsafe filename rejected or sanitized
- private file requires signed URL

PHASE 8 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 9 — COMMIT
Commit:
feat: add database tenancy and storage baseline

PHASE 10 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. migration impact
5. EmDash compatibility impact
6. validation results
7. risks
8. rollback plan
9. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core schema
- deleting existing data
- changing production database
- changing production Cloudflare R2/D1 resources
- committing database files
- committing uploaded files
- committing secrets
```

---

## 32. Definition of Done for Part 3

Part 3 is complete when:

```txt
[ ] default tenant model is documented
[ ] default site model is documented
[ ] AWCMS custom table standards are documented
[ ] EmDash schema boundary is documented
[ ] soft delete policy is documented
[ ] restore policy is documented
[ ] media metadata model is documented
[ ] upload session model is documented
[ ] storage path policy is documented
[ ] safe filename policy is documented
[ ] upload validation policy is documented
[ ] backup and restore runbook exists
[ ] migration strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
[ ] compatibility matrix is updated
```

---

## 33. Next Part

Continue with **Part 4 — Plugin and Module System**.

Part 4 should include:

- EmDash native plugin compatibility;
- marketplace/sandbox plugin compatibility;
- AWCMS module manifest;
- module registry;
- plugin permission model;
- plugin lifecycle;
- module install/disable behavior;
- plugin storage scopes;
- plugin testing;
- plugin rollback strategy.
