# SIKESRA Implementation Plan

This plan is derived from the AWCMS-Micro core EmDash compatibility documentation in `docs/core/` and the SIKESRA module documentation in `docs/sikesra/`.

## Execution Retry Notes (2026-05-09)

1. Plugin activation synchronization fixed: deactivating `sikesra` now disables `/sikesra` and `/_emdash/api/plugins/sikesra/*` at runtime.
2. Root route ownership fixed: `/` remains EmDash host route boundary; SIKESRA public output is limited to `/sikesra`.
3. Plugin entry synchronization fixed: `src/plugin-entry.ts` now exports real `createPlugin` from `src/index.ts`.
4. Build/test reliability fixed: malformed architecture test block corrected and repository `tsconfig.json` restored.
5. EmDash admin interaction compatibility fixed: `/_emdash/api/plugins/sikesra/admin` now responds with a valid Block Kit payload, preventing admin UI retry loops and repeated `404` errors.
6. CSP synchronization fixed at hybrid wrapper: EmDash admin responses now keep existing CSP directives while adding Cloudflare Insights script source to avoid blocked beacon script logs.
7. Public API origin synchronization fixed: static public page now resolves SIKESRA API base from the active domain origin, preventing `workers.dev` cross-origin calls from custom domains.
8. Admin CSP compatibility fixed: `script-src-elem` now preserves required inline script execution for EmDash admin while still allowing Cloudflare Insights source.

Current validation target for each release cycle:

1. Active plugin -> `/sikesra` returns `200`, public metadata returns `200`.
2. Inactive plugin -> `/sikesra` and `/_emdash/api/plugins/sikesra/*` return `404`.
3. `/_emdash/admin` remains EmDash-managed and authenticated.
4. `/_emdash/api/plugins/sikesra/admin` returns `200` for authenticated admin requests.

## Implementation Principle

SIKESRA must be implemented as an isolated EmDash/AWCMS-Micro plugin or module named `sikesra`. EmDash remains the architectural authority; SIKESRA business logic, data tables, APIs, UI, permissions, audit, storage, and workflows must live in module/plugin boundaries unless a missing extension point is documented and approved.

Do not start by building screens or migrations blindly. The first deliverable is repository discovery and an implementation decision log with real paths, helpers, conventions, and missing extension points.

## Non-Negotiable Rules

1. Admin UI route: `/_emdash/admin/plugins/sikesra/*`.
2. Admin API route: `/_emdash/api/plugins/sikesra/v1/*`.
3. Public route: `/sikesra`.
4. Permission namespace: `awcms:sikesra:<resource>:<action>`.
5. Custom tables use the `awcms_sikesra_` prefix.
6. Business tables include `tenant_id`, `site_id`, timestamps, soft delete, `created_by`, and `updated_by` unless documented.
7. Normal repository queries enforce tenant, site, `deleted_at IS NULL`, and backend-computed region scope.
8. Admin API handlers enforce authentication, RBAC, ABAC, masking, request ID, and audit where required.
9. Public output is aggregate-only and uses small-cell suppression.
10. Raw NIK/KIA hash, raw R2 key, private document URL, and highly restricted values must not leave backend serializers through normal responses.
11. Excel import must use upload, mapping, staging, validation, duplicate review, and explicit promotion.
12. High-risk actions require reason where configured and must write audit events.
13. Do not modify EmDash core unless discovery proves no safe extension path exists, the adapter is documented, compatibility tests are added, and rollback is documented.

## Phase 0: Repository Discovery and Decision Log

Goal: replace speculative documentation paths with real repository conventions before feature work.

Deliverables:

1. `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.
2. Confirmed module/plugin target folder.
3. Confirmed plugin registration convention.
4. Confirmed manifest convention.
5. Confirmed admin page contribution convention.
6. Confirmed API route convention.
7. Confirmed public route convention.
8. Confirmed D1 migration and seed convention.
9. Confirmed test command and test file convention.
10. Confirmed auth/session, permission, audit, ABAC, R2/media helpers or documented local fallbacks.
11. List of missing extension points and smallest adapter proposal.

Acceptance gate:

1. No business features are implemented yet.
2. Later tickets can name exact files instead of placeholders.
3. Any proposed core change is isolated as a separate adapter decision.

## Phase 1: Module Foundation

Goal: create the smallest compile-safe SIKESRA module shell.

Deliverables:

1. Module folder using the discovered convention, defaulting to `packages/plugins/sikesra/` only if no convention exists.
2. Plugin entrypoint, for example `src/plugin.ts`, using the discovered EmDash `definePlugin()` pattern.
3. `module.manifest.json` declaring module ID `sikesra`, version, lifecycle metadata, admin routes, public route, API namespace, permissions, migrations, seeds, storage scopes, dependencies, and rollback behavior.
4. Common API response envelope helpers with `requestId`.
5. Trusted request context builder deriving tenant, site, user, roles, permissions, ABAC subject attributes, region scope, IP, user agent, and current timestamp from backend/session state.
6. Typed API/client contract scaffolding where the repository convention supports it.

Acceptance gate:

1. Module can be loaded or registered without exposing data.
2. API envelope tests or manual checks verify success/failure shape.
3. Frontend-supplied tenant, site, role, permission, and region scope are ignored for trusted context.

## Phase 2: Database and Seeds

Goal: establish D1-compatible, PostgreSQL-friendly persistence before workflows.

Migration order:

1. `0001_sikesra_settings_and_master.sql`: settings, object types, object subtypes.
2. `0002_sikesra_regions.sql`: official regions and local regions.
3. `0003_sikesra_entities_core.sql`: code sequences, code history, entities, person profiles.
4. `0004_sikesra_detail_modules.sql`: MVP detail tables for the eight data modules.
5. `0005_sikesra_relationships_and_attributes.sql`: entity people, attribute definitions, entity attributes, user scopes.
6. `0006_sikesra_abac.sql`: ABAC policies and conditions.
7. `0007_sikesra_verification.sql`: verification events.
8. `0008_sikesra_documents.sql`: file objects and supporting documents unless shared media is used.
9. `0009_sikesra_imports.sql`: import batches, staging rows, mapping templates.
10. `0010_sikesra_deduplication.sql`: duplicate candidates and decisions.
11. `0011_sikesra_benefits_exports_audit.sql`: benefit history, export jobs, audit logs unless shared audit is used.
12. `0012_sikesra_public_summary.sql`: optional public-safe summary views or summary tables.

Seed order:

1. Settings defaults, including public disabled by default, small-cell threshold, upload limits, export limits, and feature flags.
2. MVP object types and subtypes from `01_product_requirements.md`.
3. Core attribute definitions: religion, neglected status, desil, SPM, PKH, BPNT, BPJS/PBI, extreme poverty, sensitivity, official/local scope, source input, verification level.
4. Baseline ABAC policies and conditions.
5. Baseline permissions or role-policy mappings where the platform convention requires seed data.

Acceptance gate:

1. Migrations run locally.
2. Seeds are repeatable.
3. Indexes support list, dashboard, verification, import, document, export, and audit paths.
4. `sikesra_id_20` uniqueness and length constraints exist.
5. Sequence table is unique per tenant/site/village/type/subtype.

## Phase 3: Security Foundation

Goal: build security before sensitive workflows.

Deliverables:

1. Permission catalog registration for dashboard, entity, code, verification, document, import, export, region, attribute, policy, audit, settings, and sensitive access.
2. Route guard for all admin APIs.
3. ABAC evaluator with deny precedence, region scope checks, module checks, sensitivity checks, verification-level checks, and archived-record restrictions.
4. Server-side masking utility for NIK/KIA, protected names, contacts, exact addresses, guardian details, disability details, individual poverty/desil values, document metadata, audit before/after, and hashes.
5. Audit service baseline writing tenant, site, actor, action, resource, request ID, success/failure, reason, IP/user agent, and redacted before/after where applicable.
6. Negative tests for cross-region access, sensitive response leakage, raw R2 key leakage, and NIK/KIA hash leakage.

Acceptance gate:

1. Unauthenticated admin APIs return unauthorized.
2. Unauthorized admin APIs return forbidden or safe 404 where appropriate.
3. Object operations evaluate ABAC.
4. Sensitive serializers prevent leakage by default.
5. High-risk actions write audit events.

## Phase 4: Public and Admin Dashboards

Goal: establish safe visibility surfaces early.

Deliverables:

1. Public metadata API or Astro loader.
2. Public filters API or loader using only safe aggregate filter values.
3. Public summary service using active, verified, non-deleted records and small-cell suppression.
4. Public `/sikesra` page with hero, safety notice, KPI cards, safe filters, charts, caveat, update timestamp, official contact, and mobile/desktop usability.
5. Admin dashboard API with scoped KPIs, work queues, regional summary, attribute summary, and audit activity.
6. Admin dashboard page under `/_emdash/admin/plugins/sikesra` using EmDash/Kumo design conventions.

Acceptance gate:

1. `/sikesra` loads without login and never calls admin APIs.
2. Public output contains no names, identifiers, individual addresses, documents, individual desil, disability details, protected coordinates, or small-cell aggregates.
3. Admin dashboard requires login and `awcms:sikesra:dashboard:read`.
4. Dashboard queries are region-scoped.

## Phase 5: Regions and Registry

Goal: implement the operational data backbone.

Deliverables:

1. Official region lookup service.
2. Local region CRUD service, visually and technically distinct from official regions.
3. Region management UI.
4. Entity list API with filters, pagination, tenant/site/deleted/region guards, and masked summaries.
5. Entity detail API with tabs, access flags, object ABAC, masking, documents, verification, benefits, and audit where authorized.
6. Registry list UI.
7. Entity detail UI.

Acceptance gate:

1. Cross-region list/detail access is denied or excluded.
2. Local region changes cannot mutate `sikesra_id_20`.
3. UI action availability comes from backend access flags, not only hidden controls.

## Phase 6: Progressive Input and ID Generation

Goal: support manual data entry from draft through submit readiness.

Deliverables:

1. Create draft API.
2. Autosave/section patch API.
3. Section-aware validation and completeness service.
4. Progressive wizard UI with object type, official region, local region, identity, attributes, module detail, related people, documents, validation/duplicate preview, ID generation, review, and submit steps.
5. 20-digit SIKESRA ID generation service using `[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]`.
6. Generate-code endpoint.
7. Controlled ID correction flow with permission, reason, confirmation, code history, and audit.

Acceptance gate:

1. Required fields block ID generation and submit readiness.
2. Generated ID is exactly 20 digits and stable after RT/RW/local-region changes.
3. Normal users cannot edit generated IDs.
4. ID generation and correction are audited.

## Phase 7: Verification Workflow

Goal: implement multi-level verification with notes, scope, and audit.

Deliverables:

1. Submit endpoint from validated draft into configured verification level.
2. Verification queue API filtered by verifier level, module, region, risk, completeness, and duplicate state.
3. Verification decision API for verify, need revision, reject, and final active/verified state.
4. Verification queue and review UI with summary, checklist, field notes, document checklist, duplicate compare, decision panel, and confirmation dialogs.

Acceptance gate:

1. Verifiers act only in allowed region/module/level scope.
2. Need-revision and reject decisions require notes.
3. Verification event and audit records include actor, level, action, previous status, next status, note, and request metadata.
4. Final verification sets record active and verified.

## Phase 8: Documents and R2

Goal: implement secure file handling with metadata discipline.

Deliverables:

1. R2 storage adapter or integration with discovered shared media helper.
2. Upload-url/start-upload endpoint.
3. Complete-upload endpoint storing D1 metadata, checksum, classification, size, MIME, verification state, and entity link.
4. Private preview/download endpoint using signed or proxy access.
5. Document verification and replacement endpoints.
6. Document upload/list UI.

Acceptance gate:

1. MIME, extension, size, checksum, and classification are validated.
2. Dangerous file types are blocked.
3. Raw R2 keys are never returned.
4. Highly restricted download requires reason where configured.
5. Preview/download and replacement are audited.

## Phase 9: Excel Import and Deduplication

Goal: support controlled bulk ingestion without bypassing validation.

Deliverables:

1. Import batch creation.
2. Workbook upload and sheet detection.
3. Column mapping and mapping template persistence.
4. Staging row parser and validator storing raw and mapped data securely.
5. Staging rows list/correction API.
6. Import center UI.
7. Deduplication service for people, institutions, documents, and benefits.
8. Duplicate candidate and decision persistence.
9. Import promotion service creating entity/detail/person/attribute/document records where applicable and integrating ID generation.

Acceptance gate:

1. Excel rows never bypass staging.
2. Invalid rows cannot be promoted.
3. High-risk duplicate decisions require reason.
4. Promoted rows are not automatically verified.
5. Import create/map/validate/promote/skip/override/failure actions are audited.

## Phase 10: Reports, Exports, Audit, and Settings

Goal: complete operational governance surfaces.

Deliverables:

1. Report metadata API with field sensitivity information.
2. Export job creation API enforcing permission, field sensitivity, reason, ABAC, audit, and private download.
3. Reports/export UI.
4. Audit list/detail API with filters and redaction.
5. Audit UI.
6. Settings API for public visibility, suppression threshold, upload limits, export limits, reason requirements, and feature flags.
7. Settings UI.

Acceptance gate:

1. Restricted exports require restricted permission and reason.
2. Highly restricted individual data is excluded by default.
3. Export jobs record filters, fields, format, reason, row count, actor, file metadata, and audit events.
4. Audit before/after values are redacted according to viewer permissions.
5. Settings changes require permission, reason, and audit.

## Phase 11: Hardening and Operations

Goal: prove security, privacy, backup, restore, performance, and operational readiness.

Deliverables:

1. RBAC, ABAC, masking, and region tests.
2. Import, duplicate, and promotion tests.
3. Document and export security tests.
4. Public dashboard privacy tests.
5. Performance and index review for dashboard, entity, import, audit, and public summary queries.
6. D1 backup/export procedure.
7. R2 lifecycle, backup, retention, and inventory procedure.
8. Restore dry run validating D1 metadata and R2 object linkage.
9. Incident response contacts and escalation notes.
10. Rate limits or guardrails for import, export, download, and sensitive reveal where supported.

Acceptance gate:

1. P0 security, public privacy, cross-region, masking, import, document, verification, export, audit, and backup/restore checks pass.
2. Public summary meets the documented performance target for normal MVP data.
3. Admin dashboard meets the documented performance target for normal MVP data.
4. Critical/high risks are fixed or formally accepted by the owner.

## Phase 12: Release Candidate

Goal: make implementation reality match documentation and decide MVP go/no-go.

Deliverables:

1. Updated implementation documentation.
2. Operator training notes.
3. UAT scenarios covering manual input, verification, documents, import, public dashboard, export, audit, settings, and backup/restore.
4. MVP go/no-go report.
5. Rollback and disable behavior documentation.

Acceptance gate:

1. All P0 issues are closed or accepted with documented workaround.
2. UAT passes.
3. Documentation matches shipped behavior.
4. No untreated critical/high risk remains.

## 12-Week Execution Map

| Week | Focus | Required Outcome |
|---:|---|---|
| 1 | Discovery and foundation | Decision log, module folder, plugin skeleton, manifest draft. |
| 2 | Database and seeds | Migrations and repeatable seeds run locally. |
| 3 | Security foundation | Permissions, route guard, ABAC, masking, audit baseline. |
| 4 | Public/admin dashboards | `/sikesra` safe public page and scoped admin dashboard. |
| 5 | Regions and registry | Region services, list/detail APIs, registry/detail UI. |
| 6 | Progressive input | Draft, autosave, validation, completeness, wizard UI. |
| 7 | ID and verification | 20-digit ID, submit, queue, decision flow. |
| 8 | Documents and R2 | Upload, metadata, private download, document UI. |
| 9 | Excel import | Workbook upload, mapping, staging, validation, correction UI. |
| 10 | Dedup/promotion/reports | Duplicate decisions, promotion, basic export/settings. |
| 11 | Audit/hardening | Audit UI, security tests, backup/restore, performance review. |
| 12 | Release candidate | UAT, docs finalization, go/no-go report. |

## Critical Path

```txt
Discovery -> plugin foundation -> database -> security -> public/admin dashboards -> regions/registry -> wizard -> ID -> verification -> documents -> import/dedup/promotion -> reports/audit/settings -> hardening -> release candidate
```

Do not parallelize feature work ahead of the security foundation for workflows that expose entity detail, documents, import rows, exports, or audit data.

## Initial Work Items

Start with these before opening feature implementation tickets:

1. `SIKESRA-001`: audit repository structure and extension points.
2. `SIKESRA-002`: create `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.
3. `SIKESRA-003`: scaffold plugin skeleton using discovered convention.
4. `SIKESRA-004`: add `module.manifest.json`.
5. `SIKESRA-005`: implement response envelope and request ID utility.
6. `SIKESRA-006`: implement trusted request context builder.

After those are done, split later work into atomic tickets using `docs/sikesra/11_ai_implementation_handoff.md` instead of giving implementers the whole documentation set.

## Primary Risks

| Risk | Control |
|---|---|
| Accidental EmDash fork | Decision log, adapter-first policy, compatibility tests. |
| Sensitive data leakage | Central masking, negative tests, serializer discipline. |
| Cross-region access | Repository guards, ABAC tests, backend-computed scope. |
| Public re-identification | Aggregate-only service, small-cell suppression, conservative filters. |
| Raw R2 key exposure | Signed/proxy download, DTO tests, no raw storage keys in API output. |
| Import corruption | Staging, validation, duplicate review, explicit promotion. |
| Export misuse | Field sensitivity resolver, reason requirement, restricted permission, audit. |
| Audit leakage | Redacted audit serializers and permission-aware audit detail. |
| Scope creep | MVP excludes integrations, offline app, full ERP, public detail pages, and advanced GIS. |

## Definition of MVP Done

1. SIKESRA runs as an EmDash/AWCMS-Micro plugin/module.
2. Route namespaces match the documented public, admin, and API boundaries.
3. Migrations and seeds run cleanly.
4. RBAC, ABAC, region scope, masking, and audit are enforced server-side.
5. Public `/sikesra` is aggregate-safe and suppression-aware.
6. Registry, detail, wizard, ID generation, submit, and verification work.
7. Document upload/download uses D1 metadata, R2 storage, signed/proxy access, and audit.
8. Import uses mapping, staging, validation, duplicate review, and promotion.
9. Exports respect sensitivity, permission, reason, and audit rules.
10. Audit list/detail redacts sensitive values.
11. Backup/restore linkage between D1 metadata and R2 objects is tested.
12. P0 validation checks pass and documentation matches implementation reality.
