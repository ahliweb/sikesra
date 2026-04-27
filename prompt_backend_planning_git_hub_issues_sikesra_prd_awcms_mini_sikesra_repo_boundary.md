Act as a senior backend architect, database architect, security engineer, API designer, data privacy analyst, DevOps engineer, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in this repository:

`https://github.com/ahliweb/sikesra`

Repository boundary instruction:

- Only analyze, plan, create issues for, open pull requests in, push commits to, and modify files in `https://github.com/ahliweb/sikesra`.
- Do not change, create issues in, open pull requests in, push commits to, or modify any other repositories.
- The master repository used as a reference example is `https://github.com/ahliweb/awcms-mini`.
- Do not modify anything in the reference repository `https://github.com/ahliweb/awcms-mini`.
- If related work appears to belong to another repository, document it as a note or dependency inside `ahliweb/sikesra` issues, but do not perform changes outside this repository.
- If the agent has access to multiple GitHub repositories, treat all repositories other than `ahliweb/sikesra` as read-only references unless the user gives a separate explicit instruction.

Your task is to analyze the SIKESRA PRD and the previous UI/UX planning prompt, then create a complete backend planning breakdown and GitHub Issues for implementing the backend MVP of SIKESRA.

SIKESRA is a single-tenant government-ready application based on AWCMS Mini for managing, validating, monitoring, reporting, importing, exporting, auditing, and mapping social, religious, educational religious, welfare-related, and vulnerable-person data.

The backend must align with:

1. AWCMS Mini single-tenant architecture.
2. PostgreSQL as the primary database.
3. Kysely or SQL migrations as the typed SQL/database layer.
4. Service-layer authorization, not Supabase-first RLS.
5. RBAC/ABAC and region scope from day one.
6. Audit logs for all important actions.
7. Cloudflare R2 or S3-compatible storage for document files, with metadata stored in PostgreSQL.
8. ID SIKESRA 20-digit business identifier.
9. Data dictionary and field rules from the SIKESRA PRD.
10. UI/UX requirements from the previous planning prompt, including religion reference, Guru Agama terminology, and Lansia Terlantar.
11. The implementation repository is `ahliweb/sikesra`; the master `ahliweb/awcms-mini` repository is read-only reference material only.

Do not implement code immediately unless explicitly instructed later. Start with repository analysis, backend architecture planning, migration design, API/service design, security design, and GitHub Issue creation.

---

## Critical Product and Terminology Rules

### 1. AWCMS Mini Single-Tenant

- Do not assume full AWCMS multi-tenant architecture.
- Do not assume Supabase-first architecture.
- Do not require Supabase Auth or Supabase RLS.
- Use AWCMS Mini internal auth/session/service-layer authorization patterns where available in `ahliweb/sikesra`.
- Use `ahliweb/awcms-mini` only as a read-only reference example.
- If future-proofing is needed, use optional `site_id`, `app_scope`, or config patterns only after repository inspection.

### 2. Guru Agama Terminology

Use **Guru Agama** as the general module label.

Do not use **Guru Ngaji** as a general module label because guru ngaji is part of Islamic religious teaching context. If Islamic teaching details are required, represent them as contextual teaching activity/place fields inside the Guru Agama module, not as the module title.

### 3. Religion Reference Requirement

Add a religion reference field to all related personal data and all relevant modules.

Religion must use controlled master/reference data, not arbitrary free text by default.

Suggested reference values:

- Islam
- Kristen
- Katolik/Katholik, normalized consistently
- Hindu
- Buddha/Budha, normalized consistently
- Konghucu/Konghuchu, normalized consistently
- Lainnya/Other only if approved
- Belum Dicatat/Unknown only if legally and operationally acceptable

Religion reference must support:

- person-level religion;
- institution/entity-level religion where relevant;
- import mapping and normalization;
- report filters and aggregate reporting;
- access control and privacy protection for individual-level religion;
- audit logging for create/update/export involving religion fields.

### 4. Lansia Terlantar Module

Add a **Lansia Terlantar** module with fields and rules similar to Anak Yatim but adapted for abandoned elderly people.

Treat Lansia Terlantar as vulnerable-person data.

Backend must support:

- dedicated detail table or typed module schema;
- person/entity registry integration;
- NIK/No KK sensitive handling;
- religion reference for elderly person and caregiver/guardian;
- caregiver/guardian/pendamping data;
- living condition and abandonment condition;
- priority needs;
- document support;
- import/export;
- verification workflow;
- audit logging;
- permission and region scoping;
- privacy-preserving list/detail/report behavior.

---

## Backend Scope

Create backend planning and issues for the following backend areas:

1. Database schema and migrations.
2. Master/reference data.
3. ID SIKESRA 20-digit generation service.
4. Region official and custom region data model.
5. RBAC/ABAC permission model and region scope.
6. Core SIKESRA entity registry.
7. Module detail tables and services:
   - Rumah Ibadah
   - Lembaga Keagamaan
   - Lembaga Pendidikan Keagamaan
   - Lembaga Kesejahteraan Sosial
   - Guru Agama
   - Anak Yatim
   - Lansia Terlantar
   - Disabilitas
8. Person-related data model, including pengurus, wali, pengasuh, pendamping, penanggung jawab, imam, bilal, marbot.
9. Religion reference model and normalization.
10. Document metadata and object storage integration.
11. Verification workflow backend.
12. Import Excel staging and promotion.
13. Export/report backend.
14. Audit logs and security events.
15. API endpoints and service layer.
16. Validation, duplicate detection, and transaction safety.
17. Sensitive data handling: encryption/hash/masking-safe responses.
18. Tests: unit, integration, migration, authorization, import/export, audit.
19. Documentation and OpenAPI/API contract.
20. DevOps/environment configuration for PostgreSQL, R2, secrets, backup, and CI.

---

## Required Repository Analysis

Before creating GitHub Issues, inspect only this repository:

`https://github.com/ahliweb/sikesra`

Use this repository only as a read-only reference example:

`https://github.com/ahliweb/awcms-mini`

Inspect the implementation repository and identify:

- current app framework structure;
- current backend/API route structure;
- current database migration structure;
- current Kysely or database client usage;
- current auth/session implementation;
- current RBAC/ABAC implementation;
- current user/role/permission tables;
- current region or master data patterns;
- current file upload/storage/R2 integration patterns;
- current audit log/security event patterns;
- current import/export utilities;
- current test framework and CI scripts;
- current environment variable conventions;
- current documentation conventions;
- whether SIKESRA module already exists;
- whether religion/agama master data already exists;
- whether vulnerable-person/person table patterns already exist.

If a capability exists in `sikesra`, create an issue to extend it.
If a capability is missing in `sikesra`, create an issue to implement it.
If a useful pattern exists in `awcms-mini`, cite it as a read-only reference in the issue, but do not modify that repository.
If an implementation conflicts with this prompt or the PRD, create a refactor issue in `sikesra` only.

---

## Backend Architecture Principles

Use these principles:

- simple-first-scalable-later;
- database-first;
- service-layer authorization;
- secure-by-default;
- least privilege;
- region-aware access;
- audit-friendly;
- privacy-aware;
- sensitive-data-minimizing;
- typed SQL/Kysely-friendly;
- transaction-safe;
- import-staging-first;
- no raw file storage in database;
- no hardcoded secrets;
- no public exposure of sensitive data;
- no direct trust in client-side authorization;
- no silent mutation of ID SIKESRA 20-digit after generation;
- soft delete for business data;
- deterministic reference data where possible;
- controlled master data for religion and module subtypes;
- explicit status transitions for verification workflow;
- implementation changes only in `ahliweb/sikesra`;
- `ahliweb/awcms-mini` is read-only reference material.

---

## Core Backend Data Model Requirements

### 1. Core Tables

Plan migrations for these core tables or repository-equivalent models:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `user_region_scopes`
- `wilayah_resmi`
- `wilayah_custom`
- `religion_references`
- `sikesra_object_types`
- `sikesra_object_subtypes`
- `sikesra_code_sequences`
- `sikesra_entities`
- `entity_people`
- `dokumen_pendukung`
- `file_objects`
- `verification_events`
- `audit_logs`
- `import_batches`
- `import_staging_rows`

If the repository uses different naming conventions, adapt the names consistently but preserve the concepts.

### 2. Module Detail Tables

Plan migrations for:

- `rumah_ibadah_details`
- `lembaga_keagamaan_details`
- `lembaga_pendidikan_keagamaan_details`
- `lembaga_kesejahteraan_sosial_details`
- `guru_agama_details`
- `anak_yatim_details`
- `lansia_terlantar_details`
- `disabilitas_details`

### 3. Core `sikesra_entities` Requirements

Every main record should be represented in a registry table with at least:

- `id` UUID primary key;
- `sikesra_id_20` char(20), nullable before generation;
- `object_type_code`;
- `object_subtype_code`;
- `entity_kind`: institution/person;
- `display_name`;
- `official_village_code`;
- `wilayah_custom_id`;
- `address_text`;
- `phone`;
- `email`;
- `latitude`;
- `longitude`;
- `status_data`;
- `status_verifikasi`;
- `visibility_level`;
- `source_input`;
- `created_by`;
- `updated_by`;
- `verified_by`;
- `created_at`;
- `updated_at`;
- `verified_at`;
- `deleted_at`;
- `catatan`.

### 4. Religion Reference Requirements

Create or extend reference data for religion:

- stable ID/code;
- normalized name;
- display name;
- aliases for import normalization;
- active/inactive status;
- sort order;
- audit timestamps.

Add religion references to:

- `entity_people` where relevant;
- `guru_agama_details` as `agama_guru` or reference ID;
- `anak_yatim_details` as `agama_anak` where appropriate;
- `lansia_terlantar_details` as `agama_lansia` where appropriate;
- `disabilitas_details` as `agama_penyandang_disabilitas` where appropriate;
- institution detail tables where the institution's religion is relevant;
- wali/pengasuh/pendamping records through `entity_people`.

### 5. Sensitive Data Requirements

Sensitive identifiers must not be stored or exposed carelessly.

Plan secure handling for:

- NIK;
- NIK/KIA;
- No KK;
- child data;
- elderly/vulnerable-person data;
- disability data;
- individual-level religion data;
- health-related notes;
- contact data;
- document previews and file metadata.

Recommended backend patterns:

- store encrypted value where full value is needed;
- store hash for duplicate detection;
- never log raw NIK/KIA/No KK;
- return masked data by default in API responses;
- require explicit permission for reveal/export;
- audit reveal/export actions;
- keep encryption keys in secret manager/environment, never in code.

---

## ID SIKESRA 20-Digit Requirements

Implement transaction-safe generation for:

`[kode_desa_kel_10][jenis_2][subjenis_2][id_objek_6]`

Rules:

- UUID remains internal primary key.
- `sikesra_id_20` is official business identifier.
- ID is generated only after minimum fields are valid.
- ID must not include religion, custom region, gender, age, condition, assistance status, or sensitive attributes.
- ID must not change after generation except through restricted correction workflow.
- Sequence must be transaction-safe and collision-resistant.
- Generate action must be audited.

Minimum fields for code generation:

- object type;
- subtype/category;
- display name;
- address;
- official village code;
- created_by;
- draft status.

Add Lansia Terlantar object type/subtype planning if not yet in master data.

---

## Verification Workflow Backend Requirements

Support status flow:

- `draft`
- `submitted`
- `verified`
- `need_revision`
- `rejected`
- `active`
- `archived`

Backend must support:

- submit action;
- verify action;
- reject action;
- need revision action;
- resubmit action;
- verification event history;
- field/section-level verifier notes;
- document verification;
- permission checks;
- region scope checks;
- audit logging.

---

## Document and Storage Backend Requirements

Files must be stored in Cloudflare R2 or S3-compatible storage. Store metadata in PostgreSQL, not raw file bytes.

Plan backend support for:

- `file_objects` metadata;
- `dokumen_pendukung` linkage to entity;
- upload request/presigned upload flow where applicable;
- file validation: MIME, extension, size, checksum;
- access classification;
- document status verification;
- superseded document handling;
- soft delete;
- audit upload/view/download/export/delete actions;
- secure object keys;
- no public access for restricted documents.

Document types must include at least:

- SK Kepengurusan;
- SK Pendirian;
- Badan Hukum;
- ID Masjid;
- Foto Bangunan;
- Dokumentasi Kegiatan;
- Kartu Keluarga;
- KTP Lansia;
- Surat Keterangan Tidak Mampu;
- Surat Keterangan Terlantar;
- Surat Keterangan Domisili;
- Foto Kondisi/Tempat Tinggal;
- Dokumen Bantuan Sosial;
- Dokumen Lain.

---

## Module Backend Field Requirements

### 1. Rumah Ibadah

Support:

- type/subtype: Masjid, Musholla, Surau, Gereja, Pura, Wihara, Klenteng;
- name;
- address;
- official region;
- custom region;
- pengurus/person links: Ketua, Sekretaris, Bendahara;
- Imam Tetap, Bilal, Marbot repeatable person roles where relevant;
- NIK encryption/hash for person records;
- religion reference for related person records where relevant;
- hibah fields: received, province year/nominal, kabupaten year/nominal;
- ID Masjid;
- document links.

### 2. Lembaga Keagamaan

Support:

- agama lembaga/reference;
- master name or custom name;
- address;
- region;
- bidang kegiatan;
- pengurus/person links;
- religion reference for pengurus where relevant;
- SK Pendirian;
- SK Kepengurusan;
- Dokumentasi Kegiatan.

### 3. Lembaga Pendidikan Keagamaan

Support:

- category: TPA/TPQ, Pondok Pesantren, Lainnya;
- agama lembaga where relevant;
- name;
- address;
- region;
- Badan Hukum;
- SK Kepengurusan;
- bidang kegiatan;
- jumlah pengajar;
- jumlah santri;
- documentation note/file;
- pengurus/person links and religion references.

### 4. Lembaga Kesejahteraan Sosial

Support:

- category: Baznas, PWRI, Panti Asuhan, Panti Yatim, Panti Jompo, Rukun Kematian, Majelis Taklim;
- agama lembaga where relevant;
- name;
- address;
- region;
- Badan Hukum;
- SK Kepengurusan;
- bidang kegiatan;
- jumlah pengasuh;
- jumlah anak asuh;
- optional future link to Lansia Terlantar records for panti jompo/elderly care, if supported;
- pengurus/person links and religion references.

### 5. Guru Agama

Use `Guru Agama` as module name.

Support:

- name;
- NIK encrypted/hash;
- TTL raw and/or split place/date;
- agama guru reference;
- address;
- official/custom region;
- institutional or non-institutional teaching context;
- related institution name/address where relevant;
- phone/email;
- source input;
- verification status;
- audit log.

Do not use Guru Ngaji as the general module/table/API label.

### 6. Anak Yatim

Support:

- category: Anak Yatim, Anak Piatu, Anak Yatim Piatu;
- name;
- NIK/KIA encrypted/hash;
- TTL raw and/or split place/date;
- gender;
- agama anak reference;
- address;
- official/custom region;
- school level;
- school name;
- wali/pengasuh person link;
- agama wali/pengasuh through person record;
- relationship to guardian;
- KK document;
- phone/email guardian;
- privacy classification as child/vulnerable data;
- verification/audit/export restrictions.

### 7. Lansia Terlantar

Support:

- category: Lansia Terlantar, Lansia Hidup Sendiri, Lansia Tanpa Pengampu, Lansia Rentan Sosial, Lainnya if approved;
- name;
- NIK encrypted/hash;
- No KK encrypted/hash;
- place of birth;
- date of birth or estimated age;
- gender;
- agama lansia reference;
- marital status optional;
- identity availability status;
- address;
- official/custom region;
- coordinates optional;
- living condition;
- abandonment condition;
- physical condition summary;
- has disability yes/no/unknown, optionally link to Disabilitas module;
- priority needs;
- assistance status;
- caregiver/pendamping/penanggung jawab person link;
- caregiver relationship;
- caregiver religion reference through person record;
- caregiver phone/email/address;
- documents: KTP, KK, SKTM, Surat Keterangan Terlantar, Domisili, Foto Kondisi, Dokumen Bantuan, Dokumen Lain;
- privacy classification as elderly/vulnerable data;
- verification/audit/export restrictions.

### 8. Disabilitas

Support:

- name;
- NIK/KIA encrypted/hash;
- TTL raw and/or split place/date;
- gender;
- agama penyandang disabilitas reference;
- address;
- official/custom region;
- jenis disabilitas;
- subjenis sensorik;
- tingkat keparahan;
- wali/pengasuh person link;
- agama wali/pengasuh through person record;
- privacy classification as disability/vulnerable data;
- verification/audit/export restrictions.

---

## API and Service Layer Requirements

Plan service classes/modules such as:

- `SikesraEntityService`
- `SikesraCodeService`
- `SikesraDocumentService`
- `SikesraVerificationService`
- `SikesraImportService`
- `SikesraReportService`
- `SikesraAuditService`
- `RegionAccessService`
- `ReligionReferenceService`
- `SensitiveDataService`
- `LansiaTerlantarService`
- `GuruAgamaService`

Every sensitive operation must follow this flow:

1. Validate input.
2. Check authenticated session.
3. Check permission.
4. Check region scope.
5. Check data classification and reveal/export rules.
6. Execute transaction via Kysely/SQL.
7. Write audit log.
8. Return safe response with masked sensitive data where appropriate.

Plan API endpoints or route handlers for:

- list/create/update/detail per module;
- generate ID;
- submit verification;
- verify/reject/need revision;
- document upload metadata and upload flow;
- import upload/staging/mapping/promotion;
- export reports;
- audit log read;
- reference data read/manage;
- user/role/permission/region scope backend where needed.

---

## GitHub Milestones to Create

Create or reuse these milestones in `https://github.com/ahliweb/sikesra` only:

1. `SIKESRA Backend MVP - Sprint 1: Database, References, and Core Registry`
2. `SIKESRA Backend MVP - Sprint 2: Authorization, Region Scope, and ID Code Service`
3. `SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`
4. `SIKESRA Backend MVP - Sprint 4: Documents, Verification, and Audit`
5. `SIKESRA Backend MVP - Sprint 5: Import, Export, Reports, and API Contracts`
6. `SIKESRA Backend MVP - Hardening: Security, Tests, Backup, and Documentation`

---

## GitHub Labels to Create or Reuse

Create or reuse these labels in `https://github.com/ahliweb/sikesra` only:

- `sikesra`
- `backend`
- `database`
- `migration`
- `kysely`
- `api`
- `service-layer`
- `mvp`
- `auth`
- `rbac-abac`
- `region-scope`
- `id-20d`
- `religion-reference`
- `master-data`
- `personal-data`
- `sensitive-data`
- `vulnerable-person`
- `lansia-terlantar`
- `guru-agama`
- `documents`
- `r2-storage`
- `verification`
- `import-excel`
- `export-report`
- `audit-log`
- `security`
- `privacy`
- `testing`
- `documentation`
- `devops`
- `backup-restore`
- `blocked`

Use priority labels:

- `priority: critical`
- `priority: high`
- `priority: medium`
- `priority: low`

Use type labels:

- `type: epic`
- `type: feature`
- `type: task`
- `type: security`
- `type: docs`
- `type: test`
- `type: refactor`

---

# Backend GitHub Issues to Create

Create these issues in `https://github.com/ahliweb/sikesra` only. If similar issues already exist there, update them instead of duplicating. Do not create or update any issue in `https://github.com/ahliweb/awcms-mini`.

---

## Epic 1 — Database, References, and Core Registry

### Issue 1.1 — Design and create SIKESRA core database migrations

Title:
`[SIKESRA Backend] Create core database migrations for SIKESRA registry and master data`

Summary:
Create backend database migrations for the SIKESRA core registry, object type/subtype references, official/custom regions, religion references, import staging, verification events, documents, file objects, and audit logs.

Scope:

- Inspect existing migration conventions in `awcms-mini-sikesra`.
- Use `awcms-mini` only as read-only reference when useful.
- Create or extend core SIKESRA tables.
- Use PostgreSQL-compatible constraints and indexes.
- Use UUID primary keys where appropriate.
- Add timestamps and soft delete fields.
- Add indexes for region, type/subtype, status, verification, and `sikesra_id_20`.
- Add uniqueness constraints where needed.

Acceptance criteria:

- Core tables exist or are extended consistently with repository conventions.
- `sikesra_entities` or equivalent registry table supports all core fields.
- Migration can run cleanly on a fresh database.
- Migration can be rolled back if project convention supports rollback.
- Sensitive fields are not stored as plain uncontrolled fields without a plan.
- No changes are made to `ahliweb/awcms-mini`.

Labels:
`sikesra`, `backend`, `database`, `migration`, `kysely`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 1: Database, References, and Core Registry`

---

### Issue 1.2 — Add religion reference master data and normalization support

Title:
`[SIKESRA Backend] Add religion reference master data and import normalization support`

Summary:
Create controlled master/reference data for religion and support aliases for import normalization.

Scope:

- Add `religion_references` or equivalent table.
- Add stable code, display name, normalized name, aliases, active status, and sort order.
- Seed initial values.
- Normalize spelling variants: Katolik/Katholik, Buddha/Budha, Konghucu/Konghuchu.
- Provide service/helper for lookup and normalization.

Acceptance criteria:

- Religion values are controlled and not arbitrary free text by default.
- Import normalization can map common aliases.
- Inactive values cannot be selected for new data unless explicitly allowed.
- Reference data changes are auditable if admin-managed.

Labels:
`sikesra`, `backend`, `religion-reference`, `master-data`, `database`, `migration`, `import-excel`, `privacy`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 1: Database, References, and Core Registry`

---

### Issue 1.3 — Add person relationship model for pengurus, wali, pengasuh, pendamping, and petugas roles

Title:
`[SIKESRA Backend] Add entity_people model for related personal data and roles`

Summary:
Implement or extend a person relationship model for Ketua, Sekretaris, Bendahara, Imam Tetap, Bilal, Marbot, Wali/Pengasuh, Pendamping/Penanggung Jawab, and other related people.

Scope:

- Create or extend `entity_people` table.
- Support role in entity.
- Support person name, contact, address, relationship, religion reference.
- Support encrypted/hash identifiers where needed.
- Support soft delete and audit.
- Support repeatable roles for Imam, Bilal, Marbot, etc.

Acceptance criteria:

- Person roles can be attached to any SIKESRA entity.
- NIK and similar identifiers are handled through encryption/hash plan.
- Religion reference can be attached to person records.
- Person data respects permission and safe response requirements.

Labels:
`sikesra`, `backend`, `database`, `personal-data`, `sensitive-data`, `religion-reference`, `privacy`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 1: Database, References, and Core Registry`

---

## Epic 2 — Authorization, Region Scope, and ID Code Service

### Issue 2.1 — Implement RBAC/ABAC backend policy checks for SIKESRA

Title:
`[SIKESRA Backend] Implement RBAC/ABAC service-layer policy checks for SIKESRA`

Summary:
Implement service-layer authorization for SIKESRA operations using roles, permissions, region scope, data status, verification status, ownership, and sensitivity classification.

Scope:

- Inspect existing auth and permission models in `awcms-mini-sikesra`.
- Add SIKESRA permissions.
- Add policy checks for create/read/update/delete/submit/verify/export/audit/read documents.
- Add sensitive data reveal/export policy.
- Add region scope checks.

Acceptance criteria:

- Backend denies unauthorized access even if UI is bypassed.
- Region-scoped users cannot access out-of-scope records.
- Sensitive data reveal/export requires explicit permission.
- Permission failures are safely logged without leaking sensitive data.

Labels:
`sikesra`, `backend`, `auth`, `rbac-abac`, `region-scope`, `security`, `privacy`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 2: Authorization, Region Scope, and ID Code Service`

---

### Issue 2.2 — Implement RegionAccessService for official and custom regions

Title:
`[SIKESRA Backend] Implement RegionAccessService for wilayah resmi and wilayah custom`

Summary:
Implement backend region access logic using official Kemendagri region hierarchy and optional custom regions for operational scope.

Scope:

- Validate official region code hierarchy.
- Enforce user region scope.
- Support custom regions linked to official region.
- Ensure custom region never replaces official region.
- Add indexes and query helpers for region filtering.

Acceptance criteria:

- User region scope is enforced for list/detail/update/export.
- Official village code drives ID 20D generation.
- Custom region does not affect ID generation.
- Region filters are efficient and tested.

Labels:
`sikesra`, `backend`, `region-scope`, `database`, `security`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 2: Authorization, Region Scope, and ID Code Service`

---

### Issue 2.3 — Implement transaction-safe ID SIKESRA 20-digit generation service

Title:
`[SIKESRA Backend] Implement transaction-safe ID SIKESRA 20-digit generation service`

Summary:
Implement backend service for generating official 20-digit SIKESRA business identifiers.

Scope:

- Create or extend `sikesra_code_sequences`.
- Generate format `[kode_desa_kel_10][jenis_2][subjenis_2][id_objek_6]`.
- Use database transaction/locking to prevent duplicate sequences.
- Validate minimum fields before generation.
- Prevent normal users from editing generated ID.
- Audit generate and correction actions.
- Add support for Lansia Terlantar object type/subtype.

Acceptance criteria:

- Concurrent generation cannot produce duplicates.
- ID is immutable after generation except restricted correction flow.
- ID does not include religion, custom region, gender, age, condition, or assistance status.
- Generate action creates audit log.
- Tests cover transaction safety and validation.

Labels:
`sikesra`, `backend`, `id-20d`, `database`, `audit-log`, `region-scope`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 2: Authorization, Region Scope, and ID Code Service`

---

## Epic 3 — Module Services and Detail Tables

### Issue 3.1 — Implement Rumah Ibadah backend schema and service

Title:
`[SIKESRA Backend] Implement Rumah Ibadah detail schema and service`

Summary:
Implement backend persistence and service logic for Rumah Ibadah, including hibah data, ID Masjid, pengurus/person roles, and documents.

Acceptance criteria:

- Detail table exists.
- Create/update/read/list service works.
- Person roles can be attached.
- NIK/religion data handled safely.
- Validation matches PRD.
- Audit logs created for create/update/delete.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `documents`, `religion-reference`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.2 — Implement Lembaga Keagamaan backend schema and service

Title:
`[SIKESRA Backend] Implement Lembaga Keagamaan detail schema and service`

Summary:
Implement backend persistence and service logic for Lembaga Keagamaan with agama lembaga, kegiatan, documents, and pengurus/person roles.

Acceptance criteria:

- Detail table exists.
- Agama lembaga uses religion reference.
- Master/custom name handling works.
- Pengurus and document links work.
- Validation and audit logging work.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `religion-reference`, `documents`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.3 — Implement Lembaga Pendidikan Keagamaan backend schema and service

Title:
`[SIKESRA Backend] Implement Lembaga Pendidikan Keagamaan detail schema and service`

Summary:
Implement backend persistence and service logic for educational religious institutions, including jumlah pengajar, jumlah santri, legal documents, kegiatan, and pengurus.

Acceptance criteria:

- Detail table exists.
- Data validation supports numeric counts.
- Documents are linked.
- Pengurus/person records are supported.
- Audit logs are written.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `documents`, `religion-reference`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.4 — Implement Lembaga Kesejahteraan Sosial backend schema and service

Title:
`[SIKESRA Backend] Implement Lembaga Kesejahteraan Sosial detail schema and service`

Summary:
Implement backend persistence and service logic for LKS categories, including panti, rukun kematian, kegiatan, pengasuh, anak asuh counts, documents, and optional future relation to Lansia Terlantar.

Acceptance criteria:

- Detail table exists.
- LKS subtype validation works.
- Counts and documents are supported.
- Pengurus/person records are supported.
- Audit logs are written.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `documents`, `religion-reference`, `lansia-terlantar`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.5 — Implement Guru Agama backend schema and service

Title:
`[SIKESRA Backend] Implement Guru Agama detail schema and service`

Summary:
Implement backend persistence and service logic for Guru Agama. Do not use Guru Ngaji as the general backend module/table/API label.

Acceptance criteria:

- Detail table/service uses Guru Agama terminology.
- Supports identity, encrypted/hash NIK, TTL, agama guru, address, region, teaching context, institution fields, contact fields.
- Religion reference is supported.
- Sensitive data responses are masked by default.
- Audit logs are written.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `guru-agama`, `religion-reference`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.6 — Implement Anak Yatim backend schema and service

Title:
`[SIKESRA Backend][Security] Implement Anak Yatim detail schema and service with child data protections`

Summary:
Implement backend persistence and service logic for Anak Yatim/Anak Piatu/Anak Yatim Piatu with strong child-data protections.

Acceptance criteria:

- Detail table exists.
- NIK/KIA encrypted/hash supported.
- Agama Anak supported.
- Wali/pengasuh linked via person model.
- KK document supported.
- API returns masked data by default.
- Export/reveal requires permission and audit.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `sensitive-data`, `personal-data`, `vulnerable-person`, `religion-reference`, `security`, `privacy`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.7 — Implement Lansia Terlantar backend schema and service

Title:
`[SIKESRA Backend][Security] Implement Lansia Terlantar detail schema and service with vulnerable-person protections`

Summary:
Implement backend persistence and service logic for Lansia Terlantar with fields adapted from Anak Yatim for abandoned elderly people.

Acceptance criteria:

- `lansia_terlantar_details` or equivalent exists.
- Supports category, identity, encrypted/hash NIK, encrypted/hash No KK, birth date or estimated age, gender, agama lansia, address, region, living condition, abandonment condition, physical condition, disability flag/link, priority needs, assistance status.
- Supports pendamping/penanggung jawab via person model.
- Supports caregiver relationship and religion reference.
- Supports elderly-specific documents.
- API returns masked/minimized data by default.
- Export/reveal requires permission and audit.
- Duplicate detection uses safe keys/hashes.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `lansia-terlantar`, `vulnerable-person`, `sensitive-data`, `personal-data`, `religion-reference`, `security`, `privacy`, `documents`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

### Issue 3.8 — Implement Disabilitas backend schema and service

Title:
`[SIKESRA Backend][Security] Implement Disabilitas detail schema and service with sensitive data protections`

Summary:
Implement backend persistence and service logic for Disabilitas with religion reference, disability type, severity, and guardian/caregiver support.

Acceptance criteria:

- Detail table exists.
- NIK/KIA encrypted/hash supported.
- Agama penyandang disabilitas supported.
- Disability type/subtype/severity validation works.
- Wali/pengasuh linked through person model.
- API returns masked data by default.
- Export/reveal requires permission and audit.

Labels:
`sikesra`, `backend`, `database`, `api`, `service-layer`, `sensitive-data`, `vulnerable-person`, `religion-reference`, `security`, `privacy`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 3: Module Services and Detail Tables`

---

## Epic 4 — Documents, Verification, and Audit

### Issue 4.1 — Implement document metadata, R2 storage integration, and secure access service

Title:
`[SIKESRA Backend] Implement secure document metadata and R2 storage service for SIKESRA`

Summary:
Implement backend document metadata, file object records, validation, and secure access to R2/S3-compatible object storage.

Acceptance criteria:

- File metadata stored in database.
- Raw files are not stored in PostgreSQL.
- MIME, extension, size, checksum validation exists.
- Access classification is enforced.
- Document preview/download is permission-aware.
- Upload, replace, supersede, delete-soft actions are audited.

Labels:
`sikesra`, `backend`, `documents`, `r2-storage`, `security`, `privacy`, `audit-log`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 4: Documents, Verification, and Audit`

---

### Issue 4.2 — Implement verification workflow backend service

Title:
`[SIKESRA Backend] Implement verification workflow service for SIKESRA entities and documents`

Summary:
Implement backend workflow for draft, submitted, verified, need_revision, rejected, active, and archived states.

Acceptance criteria:

- Submit, verify, reject, need_revision, resubmit actions are supported.
- Field/section-level notes are supported.
- Document verification status is supported.
- Invalid state transitions are rejected.
- Permission and region scope are enforced.
- All workflow actions are audited.

Labels:
`sikesra`, `backend`, `verification`, `audit-log`, `rbac-abac`, `region-scope`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 4: Documents, Verification, and Audit`

---

### Issue 4.3 — Implement audit log service and safe audit viewer backend

Title:
`[SIKESRA Backend] Implement audit log service for SIKESRA actions`

Summary:
Implement audit logging for create, update, delete_soft, generate_code, submit, verify, upload, download, reveal sensitive data, export, import, and permission failures.

Acceptance criteria:

- Important actions write audit logs.
- Sensitive values are masked or excluded from logs.
- Audit log read API is permission-aware.
- Audit filters support action, module, user, region, date range, and entity.
- Audit logging does not leak NIK/KIA/No KK or raw sensitive values.

Labels:
`sikesra`, `backend`, `audit-log`, `security`, `privacy`, `sensitive-data`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 4: Documents, Verification, and Audit`

---

## Epic 5 — Import, Export, Reports, and API Contracts

### Issue 5.1 — Implement Import Excel backend with staging and promotion

Title:
`[SIKESRA Backend] Implement Import Excel staging, validation, mapping, and promotion service`

Summary:
Implement backend import workflow where Excel data is uploaded, staged, mapped, validated, reviewed, and promoted to master data only after validation.

Acceptance criteria:

- Import batches and staging rows are stored.
- Mapping supports all MVP modules including Lansia Terlantar.
- Religion value normalization is supported.
- Invalid rows do not enter master data.
- Promotion is transaction-safe and permission-aware.
- Import actions are audited.
- Sensitive values are not logged raw.

Labels:
`sikesra`, `backend`, `import-excel`, `database`, `religion-reference`, `lansia-terlantar`, `audit-log`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 5: Import, Export, Reports, and API Contracts`

---

### Issue 5.2 — Implement reports and export backend with privacy controls

Title:
`[SIKESRA Backend][Security] Implement reports and export backend with privacy controls`

Summary:
Implement backend reporting and export services for module counts, region recap, verification status, document completeness, religion aggregates, vulnerable-person aggregates, and controlled individual exports.

Acceptance criteria:

- Aggregate reports are supported.
- CSV/XLSX export is supported or planned according to repository capability.
- Individual-level export requires permission.
- Religion, child, elderly, and disability exports require additional checks.
- Export actions are audited.
- Viewer roles receive aggregate/public-safe reports only.

Labels:
`sikesra`, `backend`, `export-report`, `security`, `privacy`, `sensitive-data`, `religion-reference`, `vulnerable-person`, `audit-log`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Sprint 5: Import, Export, Reports, and API Contracts`

---

### Issue 5.3 — Define and document SIKESRA API contracts/OpenAPI

Title:
`[SIKESRA Backend] Define and document SIKESRA API contracts and service responses`

Summary:
Document API endpoints, request/response schemas, error responses, authorization rules, safe response masking, and workflow actions.

Acceptance criteria:

- API contract covers list/create/detail/update for all MVP modules.
- API contract covers ID generation, verification, documents, import, export, audit, and reference data.
- Response examples do not include real personal data.
- Sensitive fields are shown as masked or omitted in examples.
- Documentation matches actual or planned route conventions.

Labels:
`sikesra`, `backend`, `api`, `documentation`, `security`, `privacy`, `mvp`, `type: docs`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Sprint 5: Import, Export, Reports, and API Contracts`

---

## Epic 6 — Hardening, Security, Tests, Backup, and Documentation

### Issue 6.1 — Add backend tests for migrations, services, authorization, and sensitive data handling

Title:
`[SIKESRA Backend] Add backend tests for SIKESRA core services and security rules`

Summary:
Add tests for migrations, ID generation, RBAC/ABAC, region scope, module services, religion reference, Lansia Terlantar, verification, import/export, documents, and audit logs.

Acceptance criteria:

- Tests cover ID generation concurrency/uniqueness.
- Tests cover permission denial.
- Tests cover region scope restrictions.
- Tests cover sensitive field masking.
- Tests cover religion reference normalization.
- Tests cover Lansia Terlantar validations.
- Tests cover import staging and promotion.
- Tests run in CI or documented local test command.

Labels:
`sikesra`, `backend`, `testing`, `security`, `privacy`, `id-20d`, `religion-reference`, `lansia-terlantar`, `mvp`, `type: test`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Hardening: Security, Tests, Backup, and Documentation`

---

### Issue 6.2 — Add security hardening for sensitive data, secrets, rate limiting, and validation

Title:
`[SIKESRA Backend][Security] Harden SIKESRA backend security and privacy controls`

Summary:
Harden backend security controls for sensitive data, secrets, validation, file upload, rate limiting, and auditability.

Acceptance criteria:

- No hardcoded secrets.
- Sensitive values are not logged raw.
- Input validation exists for all module create/update endpoints.
- File upload validation exists.
- Reveal/export of sensitive data requires permission.
- Rate limiting or abuse protection is planned/applied to sensitive endpoints.
- Security documentation references OWASP ASVS/API Security where appropriate.

Labels:
`sikesra`, `backend`, `security`, `privacy`, `sensitive-data`, `documents`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA Backend MVP - Hardening: Security, Tests, Backup, and Documentation`

---

### Issue 6.3 — Add backup, restore, and environment documentation for SIKESRA backend

Title:
`[SIKESRA Backend] Document backup, restore, and environment configuration for SIKESRA`

Summary:
Document environment variables, PostgreSQL backup/restore, R2 bucket configuration, secrets, and deployment assumptions for AWCMS Mini SIKESRA.

Acceptance criteria:

- Required environment variables are documented.
- R2/S3-compatible storage configuration is documented.
- PostgreSQL backup and restore process is documented.
- Secret handling rules are documented.
- No real credentials are included.
- Coolify/Cloudflare-compatible deployment notes are included where relevant.

Labels:
`sikesra`, `backend`, `devops`, `backup-restore`, `documentation`, `security`, `mvp`, `type: docs`, `priority: high`

Milestone:
`SIKESRA Backend MVP - Hardening: Security, Tests, Backup, and Documentation`

---

## Recommended Backend Issue Dependency Order

Use this implementation dependency order:

1. Issue 1.1 — Core database migrations.
2. Issue 1.2 — Religion reference master data.
3. Issue 1.3 — Entity people/person relationship model.
4. Issue 2.1 — RBAC/ABAC policy checks.
5. Issue 2.2 — RegionAccessService.
6. Issue 2.3 — ID SIKESRA 20D service.
7. Issues 3.1–3.8 — Module schemas and services.
8. Issue 4.1 — Document storage service.
9. Issue 4.2 — Verification workflow service.
10. Issue 4.3 — Audit log service.
11. Issue 5.1 — Import Excel staging/promotion.
12. Issue 5.2 — Reports/export backend.
13. Issue 5.3 — API contracts/OpenAPI.
14. Issues 6.1–6.3 — Tests, security hardening, backup/docs.

---

## GitHub Issue Body Template

Use this body format for every issue:

```markdown
## Summary

<!-- Explain the backend feature/task briefly. -->

## PRD Context

<!-- Cite the relevant SIKESRA PRD section and summarize the requirement. -->

## UI/UX Alignment

<!-- Explain how this backend issue supports the previous UI/UX prompt. -->

## Repository Boundary

- Implementation repository: `https://github.com/ahliweb/sikesra`
- Reference repository only: `https://github.com/ahliweb/awcms-mini`
- Do not modify the reference repository.

## Scope

- [ ] ...
- [ ] ...

## Out of Scope

- ...

## Database / Migration Requirements

- [ ] ...

## API / Service Requirements

- [ ] ...

## Authorization Requirements

- [ ] Check authenticated session
- [ ] Check permission
- [ ] Check region scope
- [ ] Check sensitive data reveal/export policy where applicable

## Security and Privacy Requirements

- [ ] Do not log raw sensitive values
- [ ] Mask or omit sensitive fields by default
- [ ] Audit important actions
- [ ] Validate input server-side
- [ ] Use soft delete where applicable

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Test Checklist

- [ ] Migration test or manual migration validation
- [ ] Unit/service tests where practical
- [ ] Authorization tests
- [ ] Region scope tests where applicable
- [ ] Sensitive data masking tests where applicable
- [ ] Audit log tests where applicable
- [ ] Import/export tests where applicable

## Dependencies

- Depends on: #...
- Blocks: #...

## References

- SIKESRA PRD MVP AWCMS Mini Single-Tenant
- SIKESRA UI/UX planning prompt
- AWCMS Mini SIKESRA repository conventions
- AWCMS Mini master repository as read-only reference example
```

---

## GitHub Issue Creation Instructions

After repository analysis and planning, perform these actions in `https://github.com/ahliweb/sikesra` only:

1. Check existing GitHub labels and milestones in `sikesra`.
2. Create missing backend labels in `sikesra`.
3. Create missing backend milestones in `sikesra`.
4. Search existing `sikesra` issues to avoid duplicates.
5. Create or update issues based on the backend epic structure above in `sikesra` only.
6. Link related issues through dependencies where GitHub supports it.
7. Add each issue to the correct milestone.
8. Add appropriate labels.
9. Add a final summary comment listing created issue numbers grouped by milestone.

Do not create duplicate issues. If a similar issue already exists in `sikesra`, update it with missing PRD details, backend requirements, religion-reference requirements, Guru Agama terminology requirements, Lansia Terlantar requirements, and repository-boundary requirements instead of creating a new issue.

Do not create or update any issue, pull request, branch, commit, workflow, label, milestone, or file in `https://github.com/ahliweb/awcms-mini`.

---

## Backend Quality Bar

The final backend issue set is acceptable only if:

- Every major SIKESRA PRD backend concern is represented.
- Database schema, migration, service layer, API, authorization, audit, import/export, document storage, and tests are covered.
- ID SIKESRA 20D has a dedicated critical backend issue.
- Religion reference has dedicated master-data and service support.
- Guru Agama terminology is corrected and preserved at backend/API level.
- Lansia Terlantar has dedicated schema, service, privacy, import/export, report, and audit coverage.
- Sensitive data handling has dedicated security issues.
- Region scope and RBAC/ABAC are enforced server-side.
- Import Excel uses staging before promotion.
- Documents use metadata + object storage, not raw DB blob storage.
- Issues are implementable within small-to-medium engineering tasks.
- Acceptance criteria are testable.
- No real personal data, NIK/KIA, No KK, religion data, credentials, or secrets are included in issue examples.
- The plan respects AWCMS Mini single-tenant architecture.
- All issues, changes, commits, branches, and PRs target only `https://github.com/ahliweb/sikesra`.
- `https://github.com/ahliweb/awcms-mini` remains read-only reference material.

---

## Final Response Format

After creating or updating GitHub Issues, respond with:

```markdown
# SIKESRA Backend GitHub Planning Completed

## Repository Reviewed
- Implementation repository: `https://github.com/ahliweb/sikesra`
- Reference repository only: `https://github.com/ahliweb/awcms-mini`
- Confirmation: no changes were made to any other repositories.

## Backend Milestones Created/Updated
1. ...

## Backend Labels Created/Updated
- ...

## Issues Created/Updated

### Sprint 1 — Database, References, and Core Registry
- #... [title]

### Sprint 2 — Authorization, Region Scope, and ID Code Service
- #... [title]

### Sprint 3 — Module Services and Detail Tables
- #... [title]

### Sprint 4 — Documents, Verification, and Audit
- #... [title]

### Sprint 5 — Import, Export, Reports, and API Contracts
- #... [title]

### Hardening
- #... [title]

## Backend Coverage Summary
- Database/migrations: ...
- Services/API: ...
- RBAC/ABAC and region scope: ...
- ID SIKESRA 20D: ...
- Religion reference: ...
- Guru Agama terminology: ...
- Lansia Terlantar: ...
- Documents/R2: ...
- Import/export/reports: ...
- Audit/security/tests/docs: ...
- Repository boundary compliance: ...

## Risks / Blockers
- ...

## Recommended Next Step
- ...
```

---

## Important Constraints

- Do not change, create issues in, open pull requests in, push commits to, or modify any repository other than `https://github.com/ahliweb/sikesra`.
- The master repository `https://github.com/ahliweb/awcms-mini` is a read-only reference example only; do not modify it.
- Do not hardcode secrets.
- Do not expose credentials in issues.
- Do not expose NIK/KIA, No KK, or sample real personal data.
- Do not expose real individual religion data in examples.
- Do not expose real elderly/vulnerable-person data in examples.
- Do not implement public access to sensitive data.
- Do not assume Supabase-first architecture.
- Do not assume AWCMS full multi-tenant behavior.
- Do not use arbitrary free text for religion fields by default.
- Do not use `Guru Ngaji` as the general backend module/table/API label.
- Use respectful and non-stigmatizing language for Lansia Terlantar.
- Keep SIKESRA MVP aligned with AWCMS Mini single-tenant.
- Keep all sensitive backend behavior aligned with RBAC/ABAC, region scope, auditability, privacy, and data minimization.

