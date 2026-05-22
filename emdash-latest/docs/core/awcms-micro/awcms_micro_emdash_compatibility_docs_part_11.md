# AWCMS-Micro Implementation Documentation

## Part 11 — School Website Template and Kelulusan Module Implementation

**Document status:** Draft v0.1  
**Purpose:** Define the school website template and secure Kelulusan module implementation for AWCMS-Micro while preserving EmDash compatibility, AWCMS governance, student data protection, Cloudflare R2 storage discipline, and future multi-tenant readiness.

---

## 1. Objective of Part 11

Part 11 provides a detailed implementation specification for a standard school website and the Kelulusan module.

This document covers:

1. school website template goals;
2. standard school page structure;
3. school homepage sections;
4. school content model;
5. teacher/staff directory;
6. academic calendar;
7. announcements;
8. documents/downloads;
9. gallery;
10. contact and map section;
11. Kelulusan module overview;
12. student result data model;
13. NISN verification;
14. PDF storage in Cloudflare R2;
15. signed URL flow;
16. admin import flow;
17. privacy and student data protection;
18. security and audit logging;
19. testing plan;
20. GitHub Issues;
21. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
A school website may publish public information widely, but student-private data must be protected with strict access control, verification, signed URLs, rate limiting, and audit logs.
```

---

## 2. School Website Product Goal

The AWCMS-Micro school template should help schools create a professional website that supports:

- official school profile;
- news and announcements;
- academic information;
- teacher/staff directory;
- document publication;
- gallery and achievements;
- public contact information;
- optional secure graduation announcement;
- optional mobile API support.

The school template must be usable for:

```txt
SD
SMP
SMA
SMK
Madrasah
Pesantren
Campus
Training center
Educational foundation
```

---

## 3. Compatibility Principle

The school template must remain compatible with:

```txt
EmDash admin (React UI with @cloudflare/kumo)
EmDash plugin architecture (definePlugin() API, Native and Sandboxed modes)
EmDash content collections (ec_ prefixed tables, Portable Text content)
EmDash media/storage abstractions (adapter-based: local(), r2(), s3())
AWCMS module registry
AWCMS permission registry
AWCMS ABAC overlay
Cloudflare Workers/D1/R2/KV deployment
AWCMS-Micro standard template structure
```

School content (pages, posts) should use EmDash collections (`ec_pages`, `ec_posts`) queried via `getEmDashCollection()`. School-specific modules (kelulusan, academic-calendar, staff-directory) should use AWCMS custom tables with `awcms_` prefix.

Do not implement school-specific logic by editing EmDash core.

Preferred extension path:

```txt
school template
school seed data
school-specific modules
Kelulusan plugin/module
storage scopes
admin pages
public routes
mobile API endpoints optional
```

---

## 4. School Website Required Pages

Recommended required pages:

```txt
/
/profile
/vision-mission
/headmaster-message
/news
/news/[slug]
/announcements
/academic-calendar
/teachers-staff
/achievements
/gallery
/documents
/documents/[slug]
/contact
/privacy
```

Optional pages:

```txt
/admissions
/extracurricular
/facilities
/alumni
/student-services
/kelulusan
/search
```

---

## 5. School Homepage Structure

Recommended homepage sections:

```txt
1. Hero with school identity
2. Welcome/headmaster message summary
3. School profile summary
4. Latest news
5. Important announcements
6. Academic calendar preview
7. Achievements preview
8. Gallery preview
9. Documents/downloads preview
10. Contact and location CTA
```

### 5.1 Hero Section

Content fields:

```txt
school_name
tagline
hero_title
hero_subtitle
hero_image
primary_cta_label
primary_cta_url
secondary_cta_label
secondary_cta_url
```

Example:

```txt
Official website of the school.
Latest news, announcements, achievements, and public documents are available here.
```

### 5.2 Welcome Section

Content fields:

```txt
headmaster_name
headmaster_photo
welcome_title
welcome_excerpt
welcome_page_url
```

### 5.3 Latest News Section

Show:

```txt
3–6 latest published news posts
published only
not deleted
public visibility only
```

### 5.4 Announcements Section

Show:

```txt
active announcements
important pinned announcements
not expired
not deleted
public only
```

### 5.5 Documents Preview

Show:

```txt
public published documents only
not private
not internal
not deleted
```

---

## 6. School Content Model

### 6.1 Site Settings

Recommended school settings:

```txt
school_name
npsn
school_level
school_status
principal_name
address
phone
email
website
social_links
map_url
logo_url
favicon_url
hero_image_url
locale
timezone
```

### 6.2 Pages

Fields:

```txt
title
slug
excerpt
content
featured_image
layout
seo_title
seo_description
publish_status
visibility
published_at
```

### 6.3 News Posts

Fields:

```txt
title
slug
excerpt
content
category
tags
featured_image
author
published_at
seo_title
seo_description
publish_status
visibility
```

### 6.4 Announcements

Fields:

```txt
title
slug
summary
content
announcement_type
priority
pinned
starts_at
ends_at
attachment_document_id
publish_status
visibility
```

Announcement types:

```txt
general
academic
admission
exam
graduation
event
urgent
```

### 6.5 Academic Events

Fields:

```txt
title
slug
description
event_type
starts_at
ends_at
location
attachment_document_id
publish_status
visibility
```

Event types:

```txt
academic
exam
holiday
meeting
competition
admission
graduation
```

### 6.6 Teacher/Staff Profiles

Fields:

```txt
name
slug
photo
position
subject
bio
email optional
sort_order
status
visibility
```

### 6.7 Achievements

Fields:

```txt
title
slug
description
achievement_type
level
student_or_team_name optional
supervisor optional
date
image
publish_status
visibility
```

Achievement levels:

```txt
school
district
province
national
international
```

### 6.8 Gallery Items

Fields:

```txt
title
slug
image
caption
album
photo_date
publish_status
visibility
```

### 6.9 Documents

Fields:

```txt
title
slug
description
category
media_object_id
classification
publish_status
published_at
expires_at
```

Document categories:

```txt
academic
administration
announcement
policy
calendar
admission
graduation_public
report
other
```

---

## 7. School Template Folder Structure

Recommended folder structure:

```txt
templates/school/
  README.md
  template.manifest.json
  src/
    pages/
      index.astro
      profile.astro
      vision-mission.astro
      headmaster-message.astro
      news/
        index.astro
        [slug].astro
      announcements/
        index.astro
        [slug].astro
      academic-calendar.astro
      teachers-staff.astro
      achievements.astro
      gallery.astro
      documents/
        index.astro
        [slug].astro
      contact.astro
      privacy.astro
      kelulusan.astro
    layouts/
      SchoolBaseLayout.astro
      SchoolHomeLayout.astro
      SchoolPageLayout.astro
      SchoolArticleLayout.astro
      SchoolDocumentLayout.astro
      SecureLookupLayout.astro
    components/
      school/
        SchoolHero.astro
        HeadmasterMessage.astro
        SchoolProfileSummary.astro
        LatestNewsGrid.astro
        AnnouncementList.astro
        AcademicCalendarPreview.astro
        AchievementGrid.astro
        GalleryPreview.astro
        DocumentDownloadList.astro
        ContactMapSection.astro
        KelulusanLookupForm.astro
      shared/
        Header.astro
        Footer.astro
        Breadcrumbs.astro
        SeoHead.astro
    styles/
      school.css
      tokens.css
    services/
      school-content.ts
      kelulusan.ts
      seo.ts
  seed/
    site-settings.json
    menus.json
    pages.json
    posts.json
    announcements.json
    academic-events.json
    teachers-staff.json
    achievements.json
    documents.json
    forms.json
    theme-settings.json
  docs/
    usage.md
    customization.md
    kelulusan-security.md
    student-data-protection.md
    deployment.md
    rollback.md
  tests/
    school-template-smoke.spec.ts
    kelulusan.spec.ts
```

---

## 8. School Template Manifest

```json
{
	"id": "template-school",
	"name": "AWCMS-Micro School Website Template",
	"version": "0.1.0",
	"category": "school",
	"description": "A school website template for AWCMS-Micro with news, announcements, academic calendar, documents, gallery, staff directory, and optional Kelulusan module.",
	"tenantReady": true,
	"siteScoped": true,
	"requiredModules": [
		"core-settings",
		"pages",
		"blog-news",
		"announcements",
		"menus",
		"media",
		"seo",
		"forms",
		"documents",
		"audit-log"
	],
	"optionalModules": [
		"academic-calendar",
		"staff-directory",
		"gallery",
		"achievements",
		"secure-document-lookup",
		"kelulusan",
		"mobile-api",
		"webhook-notifier"
	],
	"layouts": [
		"school-base",
		"school-home",
		"school-page",
		"school-article",
		"school-document",
		"secure-lookup"
	],
	"sections": [
		"school-hero",
		"headmaster-message",
		"school-profile-summary",
		"latest-news",
		"announcements",
		"academic-calendar-preview",
		"achievements",
		"gallery-preview",
		"documents-preview",
		"contact-map"
	],
	"securityNotes": [
		"Do not publish private student data.",
		"Do not expose student graduation PDFs without verification.",
		"Use signed URLs for private documents.",
		"Audit every Kelulusan verification attempt and PDF download.",
		"Rate-limit verification attempts."
	],
	"accessibilityLevel": "baseline",
	"locales": ["id-ID", "en-US"],
	"deploymentTargets": ["local", "cloudflare"],
	"rollback": {
		"safeToDisable": true,
		"dataDestructive": false,
		"notes": "Disable optional school modules without deleting data. Kelulusan data must be retained or archived according to school policy."
	}
}
```

---

## 9. Kelulusan Module Overview

### 9.1 Purpose

The Kelulusan module provides secure online graduation result lookup.

It should allow a student/parent to:

1. enter NISN or another approved identifier;
2. optionally enter date of birth or verification token;
3. view result status only after verification;
4. download a private PDF only through a signed URL;
5. receive a clear message if data is not found or not yet published.

### 9.2 Main Security Principle

```txt
Kelulusan data is not a public list.
It is a verification-based private lookup service.
```

### 9.3 Main Features

Admin features:

```txt
create Kelulusan event/year
import student result data
map NISN to PDF file
upload PDFs to R2
publish/unpublish Kelulusan event
view verification logs
disable download
export audit summary
```

Public features:

```txt
verify NISN
view result after release time
download signed PDF if available
show safe error messages
rate-limited attempts
```

---

## 10. Kelulusan Module Folder Structure

```txt
packages/plugins/kelulusan/
  README.md
  module.manifest.json
  src/
    index.ts
    routes/
      admin.ts
      public.ts
      verify.ts
      download.ts
      import.ts
    admin/
      KelulusanDashboard.tsx
      KelulusanEventForm.tsx
      KelulusanImportPage.tsx
      KelulusanStudentList.tsx
      KelulusanAuditPage.tsx
    services/
      kelulusan-event-service.ts
      kelulusan-import-service.ts
      kelulusan-verification-service.ts
      kelulusan-download-service.ts
      kelulusan-audit-service.ts
    schemas/
      kelulusan-event.schema.ts
      student-result.schema.ts
      verify-request.schema.ts
      import-template.schema.ts
    migrations/
      202605051000_create_kelulusan_events.sql
      202605051010_create_kelulusan_student_results.sql
      202605051020_create_kelulusan_verification_attempts.sql
    tests/
      kelulusan-verification.test.ts
      kelulusan-import.test.ts
      kelulusan-download.test.ts
```

---

## 11. Kelulusan Module Manifest

```json
{
	"id": "kelulusan",
	"name": "Kelulusan",
	"description": "Secure graduation announcement and student PDF lookup module.",
	"version": "0.1.0",
	"tenantReady": true,
	"siteScoped": true,
	"status": "experimental",
	"category": "public-service",
	"author": "AWCMS-Micro",
	"permissions": [
		"awcms:kelulusan:read",
		"awcms:kelulusan:create",
		"awcms:kelulusan:update",
		"awcms:kelulusan:delete",
		"awcms:kelulusan:import",
		"awcms:kelulusan:upload_pdf",
		"awcms:kelulusan:publish",
		"awcms:kelulusan:unpublish",
		"awcms:kelulusan:audit",
		"awcms:kelulusan:download_private_pdf"
	],
	"capabilities": ["content:read", "media:read", "media:write", "storage:read", "storage:write"],
	"routes": [
		{
			"type": "admin",
			"path": "/_emdash/admin/plugins/kelulusan",
			"permission": "awcms:kelulusan:read"
		},
		{
			"type": "api",
			"method": "POST",
			"path": "/_emdash/api/plugins/kelulusan/v1/verify",
			"permission": "public"
		},
		{
			"type": "api",
			"method": "POST",
			"path": "/_emdash/api/plugins/kelulusan/v1/download-url",
			"permission": "public_verified_session"
		}
	],
	"adminPages": [
		{
			"label": "Kelulusan",
			"path": "/_emdash/admin/plugins/kelulusan",
			"permission": "awcms:kelulusan:read",
			"group": "Documents"
		}
	],
	"storageScopes": [
		{
			"id": "kelulusan-private-pdf",
			"prefix": "tenants/{tenant_id}/sites/{site_id}/modules/kelulusan/{event_year}/",
			"visibility": "private",
			"allowedMimeTypes": ["application/pdf"],
			"maxFileSizeBytes": 10485760
		}
	],
	"database": {
		"migrations": [
			"202605051000_create_kelulusan_events.sql",
			"202605051010_create_kelulusan_student_results.sql",
			"202605051020_create_kelulusan_verification_attempts.sql"
		]
	},
	"dependencies": ["media", "documents", "audit-log"],
	"validation": {
		"requiredSettings": [
			"kelulusan.releaseAt",
			"kelulusan.verifyBy",
			"kelulusan.maxAttemptsPerHour",
			"kelulusan.signedUrlExpirationSeconds"
		]
	},
	"rollback": {
		"disableSafe": true,
		"dataDestructive": false,
		"notes": "Disabling the module hides the public lookup and admin route but preserves student result metadata, PDFs, and audit logs."
	}
}
```

---

## 12. Kelulusan Data Model

### 12.1 `kelulusan_events`

Represents one graduation announcement event/year.

AWCMS custom module tables use the `awcms_` prefix to avoid collisions with EmDash system tables (`_emdash_`) and content tables (`ec_`).

```sql
create table awcms_kelulusan_events (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  event_year text not null,
  title text not null,
  description text null,
  release_at text not null,
  close_at text null,
  status text not null default 'draft',
  verify_by text not null default 'nisn',
  require_birth_date integer not null default 0,
  signed_url_expiration_seconds integer not null default 300,
  max_attempts_per_hour integer not null default 10,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, event_year)
);
```

Status values:

```txt
draft
scheduled
published
closed
archived
```

### 12.2 `kelulusan_student_results`

Represents one student result row.

```sql
create table awcms_kelulusan_student_results (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  event_id text not null,
  nisn_hash text not null,
  nisn_last4 text null,
  student_name_display text not null,
  student_name_search text null,
  birth_date_hash text null,
  result_status text not null,
  result_message text null,
  pdf_media_object_id text null,
  pdf_object_key text null,
  pdf_uploaded_at text null,
  published integer not null default 0,
  metadata_json text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, event_id, nisn_hash)
);
```

Important:

```txt
Store hashed NISN for verification.
Do not expose full NISN in public responses.
```

Result status values:

```txt
lulus
tidak_lulus
pending
withheld
```

### 12.3 `kelulusan_verification_attempts`

Stores verification attempts for security and audit.

```sql
create table awcms_kelulusan_verification_attempts (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  event_id text not null,
  nisn_hash text null,
  success integer not null default 0,
  failure_reason text null,
  ip_address text null,
  user_agent text null,
  request_id text null,
  session_id text null,
  created_at text not null default (datetime('now'))
);
```

Failure reasons:

```txt
not_found
not_published
before_release_time
event_closed
rate_limited
invalid_input
pdf_not_available
```

### 12.4 `kelulusan_download_sessions`

Optional but recommended.

```sql
create table awcms_kelulusan_download_sessions (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  event_id text not null,
  student_result_id text not null,
  session_token_hash text not null,
  expires_at text not null,
  used_at text null,
  ip_address text null,
  user_agent text null,
  request_id text null,
  created_at text not null default (datetime('now'))
);
```

---

## 13. NISN Verification Strategy

### 13.1 Verification Inputs

Minimum:

```txt
NISN
```

Recommended stronger verification:

```txt
NISN + birth date
```

Optional:

```txt
NISN + token
NISN + birth date + token
```

### 13.2 Normalization

NISN normalization:

```txt
trim whitespace
remove spaces/dashes
allow digits only
validate length according to school data policy
```

### 13.3 Hashing

Store searchable identifiers as hashes.

Conceptual approach:

```txt
nisn_hash = HMAC_SHA256(secret_pepper, normalized_nisn)
birth_date_hash = HMAC_SHA256(secret_pepper, yyyy-mm-dd)
```

Do not store full NISN in public-facing result tables unless there is a strong operational reason and strict access control.

### 13.4 Public Error Message Rule

Avoid overly specific messages that help attackers enumerate records.

Prefer:

```txt
Data not found or not yet available. Please check the information and try again later.
```

Admin logs may contain more specific failure reason.

---

## 14. Kelulusan Public Flow

### 14.1 Public Route

```txt
/kelulusan
```

### 14.2 Verification Flow

```txt
User opens /kelulusan
  ↓
System checks if event is published and release time has passed
  ↓
User enters NISN and optional birth date/token
  ↓
Input normalized and validated
  ↓
Rate limit checked
  ↓
Identifier hashed
  ↓
Student result searched by hash
  ↓
If found and published, create short download session
  ↓
Return safe result summary
  ↓
User clicks download PDF
  ↓
System validates session
  ↓
System generates signed R2 URL
  ↓
Audit event recorded
```

### 14.3 Public Response Example

```json
{
	"success": true,
	"data": {
		"status": "lulus",
		"studentName": "A*** B***",
		"message": "Selamat. Anda dinyatakan lulus.",
		"canDownloadPdf": true,
		"downloadSessionId": "ksess_...",
		"expiresAt": "2026-05-05T10:30:00+07:00"
	},
	"meta": {
		"requestId": "req_...",
		"apiVersion": "v1"
	}
}
```

### 14.4 Privacy-Preserving Name Display

Options:

```txt
Full name only after strong verification
Partially masked name for simple NISN-only verification
No name display, only result and PDF download, for stricter privacy
```

Recommended:

```txt
If verification uses only NISN, mask the name.
If verification uses NISN + birth date/token, full name may be shown according to school policy.
```

---

## 15. PDF Storage in R2

### 15.1 Storage Path

Recommended R2 path:

```txt
tenants/default/sites/main/modules/kelulusan/{event_year}/{safe_filename}.pdf
```

Example:

```txt
tenants/default/sites/main/modules/kelulusan/2026/20260505-01HXZP4Q8M-skl-nisn-hash.pdf
```

### 15.2 Do Not Use

Avoid:

```txt
uploads/SKL.pdf
SKL-2026/{nisn}.pdf
public/{nisn}.pdf
```

because it leaks structure and lacks tenant/site/module context.

### 15.3 PDF Visibility

Kelulusan PDFs should be:

```txt
private
not publicly listable
available only through signed URL
short expiration
```

### 15.4 PDF Metadata

Every PDF must have:

```txt
media_object_id
object_key
mime_type = application/pdf
size_bytes
checksum optional
visibility = private
module_id = kelulusan
event_year
student_result_id
created_at
created_by
```

---

## 16. Signed URL Flow

### 16.1 Signed URL Rules

Signed URLs for Kelulusan PDFs should:

```txt
expire quickly, e.g. 1–5 minutes
be generated only after successful verification
not be cached publicly
be logged/audited
not expose storage credentials
```

### 16.2 Download Flow

```txt
POST /_emdash/api/plugins/kelulusan/v1/download-url
  ↓
validate download session
  ↓
check event status
  ↓
check PDF exists
  ↓
check rate limit
  ↓
generate signed URL
  ↓
write audit event
  ↓
return signed URL
```

### 16.3 Download Response

```json
{
	"success": true,
	"data": {
		"downloadUrl": "https://signed-url.example/...",
		"expiresInSeconds": 300
	},
	"meta": {
		"requestId": "req_...",
		"apiVersion": "v1"
	}
}
```

---

## 17. Admin Kelulusan Flow

### 17.1 Admin Pages

Recommended admin pages:

```txt
Kelulusan Dashboard
Kelulusan Events
Create/Edit Event
Import Student Results
Upload/Map PDFs
Student Result List
Verification Attempts
Download Audit
Settings
```

### 17.2 Event Setup Flow

```txt
Admin creates event year
  ↓
Set title, release_at, close_at
  ↓
Set verification method
  ↓
Set max attempts per hour
  ↓
Set signed URL expiration
  ↓
Save as draft/scheduled
```

### 17.3 Import Flow

```txt
Admin downloads import template
  ↓
Admin fills student data
  ↓
Admin uploads CSV/JSON/Markdown template
  ↓
System validates fields
  ↓
System normalizes NISN
  ↓
System hashes identifiers
  ↓
System maps PDF filenames or object keys
  ↓
System previews import result
  ↓
Admin confirms import
  ↓
System writes records and audit event
```

### 17.4 Import Template Fields

Recommended import fields:

```txt
No
NISN
Nama Peserta Didik
Tanggal Lahir optional
Status Kelulusan
Pesan
File PDF
```

Example table:

```txt
| No | NISN | Nama Peserta Didik | Tanggal Lahir | Status Kelulusan | Pesan | File PDF |
|----|------|--------------------|---------------|------------------|-------|----------|
| 1  | 1234567890 | Example Student | 2008-01-01 | lulus | Selamat | skl-1234567890.pdf |
```

### 17.5 PDF Upload/Mapping Flow

Options:

```txt
Option A: upload PDFs first, then import mapping
Option B: import data first, then upload PDFs and auto-match by filename
Option C: upload ZIP of PDFs, system extracts and maps safely
```

Recommended MVP:

```txt
Import data first.
Upload PDFs to module storage scope.
Auto-match PDFs by filename column.
Admin reviews mapping before publish.
```

---

## 18. Kelulusan Permissions

Recommended permissions:

```txt
awcms:kelulusan:read
awcms:kelulusan:create
awcms:kelulusan:update
awcms:kelulusan:delete
awcms:kelulusan:import
awcms:kelulusan:upload_pdf
awcms:kelulusan:publish
awcms:kelulusan:unpublish
awcms:kelulusan:audit
awcms:kelulusan:download_private_pdf
```

Suggested role mapping:

| Role     | Access                                                   |
| -------- | -------------------------------------------------------- |
| owner    | full access                                              |
| admin    | manage event/import/publish/audit                        |
| editor   | read/update content but not publish Kelulusan by default |
| operator | import/upload but not publish                            |
| auditor  | read audit only                                          |
| public   | verify only through public route                         |

High-risk permissions:

```txt
awcms:kelulusan:import
awcms:kelulusan:publish
awcms:kelulusan:download_private_pdf
awcms:kelulusan:audit
```

---

## 19. Kelulusan Audit Events

Required audit events:

```txt
kelulusan.event.created
kelulusan.event.updated
kelulusan.event.published
kelulusan.event.unpublished
kelulusan.event.closed
kelulusan.import.started
kelulusan.import.validated
kelulusan.import.confirmed
kelulusan.import.failed
kelulusan.pdf.uploaded
kelulusan.pdf.mapped
kelulusan.verify.success
kelulusan.verify.failed
kelulusan.verify.rate_limited
kelulusan.download_url.generated
kelulusan.download.failed
kelulusan.settings.updated
```

Audit metadata:

```txt
event_id
event_year
student_result_id when available
nisn_hash only, not raw NISN
ip_address
user_agent
request_id
failure_reason
actor_user_id for admin actions
```

---

## 20. Rate Limiting and Abuse Prevention

### 20.1 Rate Limit Dimensions

Limit by:

```txt
IP address
NISN hash
event ID
request fingerprint optional
user agent anomaly optional
```

### 20.2 Suggested Defaults

```txt
max 10 attempts per hour per IP
max 5 attempts per hour per NISN hash
max 3 PDF URL generations per session
```

Adjust based on school policy and traffic.

### 20.3 Turnstile Strategy

Use Turnstile when:

```txt
failed attempts exceed threshold
traffic spike occurs
public verification is abused
form is exposed during public announcement window
```

### 20.4 Abuse Response

If abuse detected:

```txt
increase rate limit strictness
enable Turnstile
pause public lookup temporarily
show maintenance message
review logs
```

---

## 21. Privacy and Student Data Protection

### 21.1 Data Minimization

Only store what is necessary:

```txt
NISN hash instead of raw NISN
birth date hash instead of raw birth date when possible
display name or masked name
PDF object key
result status
minimal metadata
```

### 21.2 Public Response Minimization

Public response should not expose:

```txt
full NISN
full birth date
internal database ID
R2 object key
raw storage URL
other students' records
```

### 21.3 Privacy Page Requirements

Kelulusan page must link to privacy information explaining:

```txt
purpose of data processing
verification data used
data retention period
who can access admin data
how to request correction
how to contact school admin
```

### 21.4 Retention

Recommended retention policy:

```txt
Kelulusan event active for defined period.
Verification logs retained for security period.
PDFs archived according to school document policy.
Sensitive data minimized or anonymized after retention period where appropriate.
```

---

## 22. Public Kelulusan Page UX

### 22.1 Required UX Elements

```txt
clear title
release information
verification form
privacy notice
error/success message
help/contact link
announcement status
```

### 22.2 Before Release Time

Show:

```txt
Kelulusan results are not yet available.
Please return at the scheduled release time.
```

### 22.3 After Event Closed

Show:

```txt
The online lookup period has ended. Please contact the school administration office.
```

### 22.4 Failed Verification

Show safe message:

```txt
Data not found or not yet available. Please check the information and try again.
```

Do not reveal:

```txt
NISN exists but birth date wrong
PDF exists but not mapped
student exists but status withheld
```

---

## 23. Mobile API for School Template

Optional mobile endpoints:

```txt
GET /api/mobile/v1/bootstrap
GET /api/mobile/v1/posts
GET /api/mobile/v1/announcements
GET /api/mobile/v1/academic-calendar
GET /api/mobile/v1/documents
POST /api/mobile/v1/kelulusan/verify
POST /api/mobile/v1/kelulusan/download-url
```

Mobile Kelulusan security must match web security:

```txt
rate limiting
safe errors
signed URLs
no raw NISN exposure
audit events
```

---

## 24. SEO for School Website

### 24.1 School SEO Defaults

```txt
site name = school name
description = official school website
locale = id-ID
organization schema = school/educational organization
canonical domain
Open Graph default image
```

### 24.2 Public Pages in Sitemap

Include:

```txt
profile
news
announcements
academic calendar
documents if public
contact
```

Do not include:

```txt
private Kelulusan result URLs
signed PDF URLs
admin routes
draft pages
soft-deleted content
private documents
```

### 24.3 Kelulusan SEO

Kelulusan page may be indexable or noindex based on school policy.

Recommended:

```txt
Public landing page may be indexable.
Verification result pages must be noindex.
Signed PDF URLs must be noindex/private.
```

---

## 25. Accessibility for School Template

Required:

```txt
semantic HTML
clear form labels
keyboard accessible verification form
error messages linked to fields
sufficient color contrast
responsive mobile layout
alt text for school images
skip-to-content link
```

Kelulusan form accessibility:

```txt
NISN field has label
birth date field has label if used
error message is readable by screen readers
submit button state is clear
success/result message is clear
```

---

## 26. Testing Strategy

### 26.1 School Template Smoke Tests

```txt
homepage loads
profile page loads
news listing loads
announcement listing loads
academic calendar page loads
teachers/staff page loads
documents page loads
contact page loads
privacy page loads
navigation works
footer links work
```

### 26.2 Kelulusan Unit Tests

```txt
NISN normalization works
invalid NISN rejected
NISN hash is deterministic
raw NISN is not returned
before release time denied
closed event denied
not found returns safe error
rate limit blocks excessive attempts
successful verification creates session
expired session denied
signed URL generation requires valid session
```

### 26.3 Kelulusan Integration Tests

```txt
admin creates event
admin imports student results
admin uploads PDF
PDF maps to student result
admin publishes event
public verifies valid NISN
public downloads signed PDF
verification attempt audited
PDF download audited
```

### 26.4 Security Tests

```txt
public cannot list all student records
public cannot access R2 object key directly
public cannot download PDF without session
wrong NISN does not reveal existence
rate limit triggers after repeated attempts
private result pages noindex
soft-deleted result hidden
```

### 26.5 Playwright Flow

```txt
1. open /kelulusan before release and verify not available message
2. admin opens Kelulusan module
3. admin creates event
4. admin imports template
5. admin uploads/maps PDF
6. admin publishes event
7. public enters valid verification data
8. result appears
9. download button returns signed URL/download
10. audit log shows verification and download
11. invalid verification shows safe error
12. repeated invalid attempts trigger rate limit
```

---

## 27. Rollback Strategy

### 27.1 Disable Kelulusan Public Route

If there is a security issue:

```txt
disable /kelulusan public route
return maintenance message
keep admin access for owner/admin only
review logs
```

### 27.2 Unpublish Event

If incorrect data is published:

```txt
set event status = draft or closed
invalidate cache
stop signed URL generation
notify school admin
create corrective issue
```

### 27.3 Revert Import

If wrong data is imported:

```txt
restore pre-import backup
or disable imported batch
or soft delete affected rows
or run corrective import
```

### 27.4 Disable Downloads

If PDFs are wrong or exposed:

```txt
disable download_url endpoint
mark PDFs unavailable
review R2 object access
rotate signing secret if needed
update PDF mapping
```

### 27.5 Rollback Checklist

```txt
[ ] event can be unpublished
[ ] public route can be disabled
[ ] signed URL generation can be stopped
[ ] import batch can be identified
[ ] backup exists before import
[ ] audit logs are preserved
[ ] R2 object keys are known
```

---

## 28. GitHub Issues for Part 11

### Issue 1 — Add School Template Specification

```md
## Goal

Create the detailed school website template specification.

## Tasks

- [ ] Define required pages
- [ ] Define homepage sections
- [ ] Define school content model
- [ ] Define seed files
- [ ] Define SEO and accessibility rules

## Acceptance Criteria

- [ ] School template docs exist
- [ ] Required pages and modules are listed
- [ ] Security notes for student data are included

## Rollback Plan

Revert template documentation changes.
```

### Issue 2 — Add School Template Structure

```md
## Goal

Create the initial school template folder structure.

## Tasks

- [ ] Add templates/school
- [ ] Add src/pages placeholders
- [ ] Add layouts placeholders
- [ ] Add components placeholders
- [ ] Add seed folder
- [ ] Add docs folder
- [ ] Add tests folder

## Acceptance Criteria

- [ ] Structure exists
- [ ] No real student/private data included

## Rollback Plan

Remove templates/school folder.
```

### Issue 3 — Add Kelulusan Module Manifest and Skeleton

```md
## Goal

Create the Kelulusan module skeleton.

## Tasks

- [ ] Add packages/plugins/kelulusan
- [ ] Add module.manifest.json
- [ ] Add routes placeholders
- [ ] Add admin page placeholders
- [ ] Add service placeholders
- [ ] Add schema placeholders
- [ ] Add tests folder

## Acceptance Criteria

- [ ] Module manifest exists
- [ ] Permissions are declared
- [ ] Storage scope is declared
- [ ] Dependencies are declared

## Rollback Plan

Disable/remove Kelulusan plugin skeleton.
```

### Issue 4 — Add Kelulusan Data Model and Import Template

```md
## Goal

Define Kelulusan data model and import template.

## Tasks

- [ ] Define kelulusan_events table
- [ ] Define kelulusan_student_results table
- [ ] Define verification attempts table
- [ ] Define download sessions table
- [ ] Define import template fields

## Acceptance Criteria

- [ ] Data model is tenant-ready
- [ ] NISN hashing strategy is documented
- [ ] Raw NISN is not exposed publicly

## Rollback Plan

Revert migrations/docs or disable module.
```

### Issue 5 — Add Kelulusan Verification and Signed URL Flow

```md
## Goal

Define secure public verification and PDF download flow.

## Tasks

- [ ] Define /kelulusan public flow
- [ ] Define verify API
- [ ] Define download-url API
- [ ] Define signed URL expiration
- [ ] Define safe error messages
- [ ] Define rate limiting

## Acceptance Criteria

- [ ] Public cannot list all records
- [ ] PDF requires valid verification session
- [ ] Signed URL expires quickly

## Rollback Plan

Disable public route or download endpoint.
```

### Issue 6 — Add Kelulusan Security and Audit Tests

```md
## Goal

Create test plan for Kelulusan security and audit behavior.

## Tasks

- [ ] Add unit test checklist
- [ ] Add integration test checklist
- [ ] Add Playwright flow
- [ ] Add private data leak tests
- [ ] Add audit event tests

## Acceptance Criteria

- [ ] Test plan covers verification and download
- [ ] Rate limit and safe error behavior are tested
- [ ] Audit events are tested

## Rollback Plan

Mark tests pending or disable module until tests pass.
```

---

## 29. OpenCode / Antigravity Implementation Prompt for Part 11

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, school website architecture, secure document publication, privacy engineering, Cloudflare R2, signed URL flow, and testing implementation agent.

TASK:
Implement Part 11 of the AWCMS-Micro documentation: School Website Template and Kelulusan Module Implementation.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–10

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/modules.md, docs/security.md, docs/privacy.md, docs/storage.md, docs/template-system.md, docs/testing.md, and docs/deployment.md.
3. Treat EmDash upstream as the architectural authority.
4. Treat the SMAN 2 repository as a reference implementation only.
5. Do not modify EmDash core.
6. Do not commit real student data, real NISN, private PDFs, local databases, uploads, or secrets.
7. Use GitHub Issues for non-trivial work.
8. Create a dedicated branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Preserve EmDash plugin/template compatibility.

GOAL:
Create the school website template specification and Kelulusan module implementation baseline with secure NISN verification, PDF mapping, R2 private storage, signed URL flow, audit logging, and tests.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect existing template/plugin structure.
- Inspect existing docs Parts 1–10.
- Inspect SMAN 2 reference repo for Kelulusan patterns only as reference.
- Summarize compatibility and privacy risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Add School Template Specification
2. Add School Template Structure
3. Add Kelulusan Module Manifest and Skeleton
4. Add Kelulusan Data Model and Import Template
5. Add Kelulusan Verification and Signed URL Flow
6. Add Kelulusan Security and Audit Tests

PHASE 2 — BRANCH
Create branch:
feat/add-school-template-kelulusan-baseline

PHASE 3 — DOCUMENTATION
Create or update:
- docs/school-template.md
- docs/kelulusan.md
- docs/student-data-protection.md
- docs/secure-document-publication.md
- docs/testing.md
- docs/rollback.md

PHASE 4 — SCHOOL TEMPLATE STRUCTURE
Create if appropriate:
- templates/school/README.md
- templates/school/template.manifest.json
- templates/school/src/pages placeholders
- templates/school/src/layouts placeholders
- templates/school/src/components placeholders
- templates/school/seed placeholders
- templates/school/docs
- templates/school/tests

PHASE 5 — KELULUSAN MODULE SKELETON
Create:
- packages/plugins/kelulusan/README.md
- packages/plugins/kelulusan/module.manifest.json
- packages/plugins/kelulusan/src/index.ts placeholder
- routes placeholders
- admin placeholders
- services placeholders
- schemas placeholders
- migrations placeholders if migration system exists
- tests placeholders

PHASE 6 — DATA MODEL
Document or implement:
- kelulusan_events
- kelulusan_student_results
- kelulusan_verification_attempts
- kelulusan_download_sessions optional
- NISN normalization
- NISN hashing strategy
- import template fields

PHASE 7 — SECURE FLOW
Document or implement:
- /kelulusan public route
- verify endpoint
- download-url endpoint
- rate limiting
- signed URL expiration
- safe error messages
- audit events

PHASE 8 — STORAGE
Add storage scope:
tenants/{tenant_id}/sites/{site_id}/modules/kelulusan/{event_year}/

Ensure:
- private visibility
- PDF only by default
- no bare uploads path
- no public direct R2 object listing

PHASE 9 — TEST PLAN
Add or update tests for:
- NISN normalization
- invalid input
- before release time
- successful verification
- failed verification safe message
- rate limiting
- signed URL session
- private PDF access denial
- audit events

PHASE 10 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
feat: add school template and Kelulusan baseline

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. school template impact
5. Kelulusan security impact
6. EmDash compatibility impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core
- committing real student data or private PDFs
- changing production R2/D1 resources
- running destructive migrations
- exposing raw NISN or R2 object keys publicly
- force pushing
```

---

## 30. Definition of Done for Part 11

Part 11 is complete when:

```txt
[ ] school website goals are documented
[ ] required school pages are defined
[ ] homepage sections are defined
[ ] school content model is defined
[ ] teacher/staff directory is defined
[ ] academic calendar model is defined
[ ] announcements model is defined
[ ] documents/gallery/contact sections are defined
[ ] school template structure is defined
[ ] school template manifest exists
[ ] Kelulusan module overview is defined
[ ] Kelulusan module structure is defined
[ ] Kelulusan module manifest exists
[ ] Kelulusan data model is defined
[ ] NISN verification strategy is defined
[ ] R2 PDF storage path is defined
[ ] signed URL flow is defined
[ ] admin import flow is defined
[ ] permissions are defined
[ ] audit events are defined
[ ] privacy controls are defined
[ ] rate limiting strategy is defined
[ ] testing plan exists
[ ] rollback strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode/Antigravity prompt exists
```

---

## 31. Recommended Next Part

Continue with:

```txt
Part 12 — Mobile API SDK and Flutter Client Integration
```

Part 12 should include:

- mobile API contract;
- Flutter client package structure;
- app bootstrap;
- public content endpoints;
- form submission;
- secure document/Kelulusan endpoint;
- token/session strategy for future authenticated apps;
- offline cache strategy;
- error handling;
- testing;
- OpenCode implementation prompt.
