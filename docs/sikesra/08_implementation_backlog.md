# 08 Implementation Backlog

This backlog is designed for GitHub issues, junior programmers, or AI coding agents. Each item should be implemented and reviewed independently. Use `11_ai_implementation_handoff.md` to split broad items and create limited-context prompts after Phase 0 discovery confirms real repository paths.

## Labels

Recommended labels: `mvp`, `backend`, `frontend`, `database`, `security`, `privacy`, `integration`, `import`, `export`, `dashboard`, `verification`, `documents`, `regions`, `abac`, `audit`, `docs`, `test`, `blocked`, `post-mvp`, `good-first-issue`, `ai-ready`.

## Task Template

```txt
Task Title:
Implement <feature> for SIKESRA

Read First:
- docs/sikesra/<doc>.md section <x>
- docs/sikesra/11_ai_implementation_handoff.md Universal Safety Rules

Files To Create/Edit:
- <exact path after repository discovery>

Do:
- Follow common API response envelope.
- Enforce tenant/site, permission, ABAC, and region scope.
- Add tests or documented manual checks.

Do Not:
- Modify EmDash core unless documented and approved.
- Expose sensitive fields.
- Bypass staging, service layer, or audit.

Acceptance Checks:
- <specific checks>
```

## Phase 0: Discovery

### SIKESRA-001: Audit repository structure and extension points

Priority: P0. Labels: `mvp`, `docs`, `backend`, `ai-ready`.

Scope:

1. Find plugin/module registration pattern.
2. Find manifest convention.
3. Find admin page contribution convention.
4. Find API route convention.
5. Find public route convention.
6. Find D1 migration and seed convention.
7. Find R2/media helpers.
8. Find auth/session context.
9. Find permission, audit, and ABAC extension points.

Acceptance:

1. Target module folder is identified.
2. Shared services are listed.
3. Missing extension points are documented.
4. No core change is made.

### SIKESRA-002: Create implementation decision log

Priority: P0. Labels: `mvp`, `docs`, `security`, `ai-ready`.

Create a decision log covering plugin folder, shared audit/media/ABAC choices, public data delivery, import parser, PDF support, and any core divergence.

## Phase 1: Module Foundation

### SIKESRA-003: Scaffold plugin skeleton

Priority: P0. Depends on SIKESRA-001.

Acceptance:

1. Module folder exists.
2. Minimal plugin registration compiles or is documented against repo convention.
3. Placeholder admin/public/API route plan exists.
4. No unnecessary core change.

### SIKESRA-004: Add `module.manifest.json`

Priority: P0. Depends on SIKESRA-003.

Acceptance:

1. Module ID is `sikesra`.
2. Admin, API, and public routes are declared.
3. Permissions use `awcms:sikesra:*`.
4. Storage scopes, migrations, dependencies, and rollback behavior are declared.

### SIKESRA-005: Implement response envelope and request ID utility

Priority: P0. Depends on SIKESRA-003.

Acceptance:

1. Success and failure helpers exist.
2. `requestId` is generated or propagated.
3. Tests cover response shape.

### SIKESRA-006: Implement request context builder

Priority: P0. Depends on SIKESRA-005.

Acceptance:

1. Context derives tenant, site, user, roles, permissions, and scope from trusted session.
2. Public context exists.
3. Frontend-supplied tenant/site/scope is never trusted.

## Phase 2: Database and Seeds

### SIKESRA-007: Add settings and object master migration

Priority: P0. Depends on SIKESRA-003.

Tables: `awcms_sikesra_settings`, `awcms_sikesra_object_types`, `awcms_sikesra_object_subtypes`.

### SIKESRA-008: Add object type and subtype seeds

Priority: P0. Depends on SIKESRA-007.

Seed all MVP modules and subtypes from `01_product_requirements.md`.

### SIKESRA-009: Add official and local region migration

Priority: P0. Depends on SIKESRA-007.

Tables: `awcms_sikesra_official_regions`, `awcms_sikesra_local_regions`.

### SIKESRA-010: Add entities, code, and person profile migration

Priority: P0. Depends on SIKESRA-009.

Tables: `awcms_sikesra_entities`, `awcms_sikesra_code_sequences`, `awcms_sikesra_code_history`, `awcms_sikesra_person_profiles`.

### SIKESRA-011: Add MVP detail module migrations

Priority: P0. Depends on SIKESRA-010.

Create all eight detail tables from `03_data_model.md`.

### SIKESRA-012: Add relationships, attributes, and ABAC migrations

Priority: P0. Depends on SIKESRA-010.

Tables: entity people, attribute definitions, entity attributes, user scopes, ABAC policies, ABAC conditions.

### SIKESRA-013: Add verification, documents, imports, duplicates, benefits, exports, and audit migrations

Priority: P0. Depends on SIKESRA-012.

Acceptance:

1. Tables use prefix and standard columns.
2. Indexes cover queue/list/report/audit paths.
3. Migration runs locally.

### SIKESRA-014: Add core attribute and baseline ABAC seeds

Priority: P0. Depends on SIKESRA-012.

Seed religion, neglected status, desil, SPM, PKH, BPNT, BPJS/PBI, extreme poverty, sensitivity, official/local region scope, source input, and verification level attributes.

## Phase 3: Security Foundation

### SIKESRA-015: Register permissions

Priority: P0. Depends on SIKESRA-004.

Register all permissions from `06_security_rbac_abac.md`.

### SIKESRA-016: Implement route guard

Priority: P0. Depends on SIKESRA-006 and SIKESRA-015.

Acceptance: unauthenticated admin API denied, unauthorized user receives 403, safe 404 is available for sensitive existence denial.

### SIKESRA-017: Implement ABAC evaluator

Priority: P0. Depends on SIKESRA-014.

Acceptance: allow/deny policies, deny precedence, region/module/sensitivity/status/verification checks, tests for conflicts.

### SIKESRA-018: Implement masking utility

Priority: P0. Depends on SIKESRA-017.

Acceptance: masks NIK/KIA, child names, phone, address, guardian, disability, desil, document metadata, audit before/after; never returns NIK/KIA hash.

### SIKESRA-019: Implement audit service baseline

Priority: P0. Depends on SIKESRA-013.

Acceptance: writes tenant, site, actor, action, resource, request ID, success/failure, reason, and before/after where needed.

## Phase 4: Public and Admin Dashboards

### SIKESRA-020: Implement public metadata

Priority: P0. Depends on SIKESRA-007 and SIKESRA-016.

### SIKESRA-021: Implement public filters

Priority: P0. Depends on SIKESRA-009 and SIKESRA-020.

### SIKESRA-022: Implement public summary with small-cell suppression

Priority: P0. Depends on SIKESRA-018 and SIKESRA-021.

### SIKESRA-023: Build public `/sikesra` page

Priority: P0. Depends on SIKESRA-020, SIKESRA-021, SIKESRA-022.

### SIKESRA-024: Implement admin dashboard API

Priority: P0. Depends on SIKESRA-016, SIKESRA-018, SIKESRA-019.

### SIKESRA-025: Build admin dashboard page

Priority: P0. Depends on SIKESRA-024.

## Phase 5: Regions and Registry

### SIKESRA-026: Implement official region service

Priority: P0. Depends on SIKESRA-009.

### SIKESRA-027: Implement local region CRUD service

Priority: P0. Depends on SIKESRA-026.

### SIKESRA-028: Build region management UI

Priority: P1. Depends on SIKESRA-026 and SIKESRA-027.

### SIKESRA-029: Implement entity list API

Priority: P0. Depends on SIKESRA-010, SIKESRA-016, SIKESRA-018.

Acceptance: filters, pagination, tenant/site/deleted/region scope, masking, no raw hashes or R2 keys.

### SIKESRA-030: Implement entity detail API

Priority: P0. Depends on SIKESRA-029.

Acceptance: tabs, access flags, object ABAC, masking.

### SIKESRA-031: Build registry list UI

Priority: P0. Depends on SIKESRA-029.

### SIKESRA-032: Build entity detail UI

Priority: P0. Depends on SIKESRA-030.

## Phase 6: Wizard and ID

### SIKESRA-033: Implement create draft API

Priority: P0. Depends on SIKESRA-029.

### SIKESRA-034: Implement autosave/update API

Priority: P0. Depends on SIKESRA-033.

### SIKESRA-035: Implement validation and completeness service

Priority: P0. Depends on SIKESRA-034.

### SIKESRA-036: Build progressive wizard UI

Priority: P0. Depends on SIKESRA-033, SIKESRA-034, SIKESRA-035.

### SIKESRA-037: Implement 20-digit code generation service

Priority: P0. Depends on SIKESRA-010 and SIKESRA-035.

### SIKESRA-038: Implement generate-code endpoint

Priority: P0. Depends on SIKESRA-037.

### SIKESRA-039: Implement controlled ID correction flow

Priority: P1. Depends on SIKESRA-037.

## Phase 7: Verification

### SIKESRA-040: Implement submit endpoint

Priority: P0. Depends on SIKESRA-035 and SIKESRA-038.

### SIKESRA-041: Implement verification queue API

Priority: P0. Depends on SIKESRA-040.

### SIKESRA-042: Implement verification decision API

Priority: P0. Depends on SIKESRA-041.

### SIKESRA-043: Build verification queue and review UI

Priority: P0. Depends on SIKESRA-041 and SIKESRA-042.

## Phase 8: Documents and R2

### SIKESRA-044: Implement R2 storage adapter

Priority: P0. Depends on SIKESRA-013.

### SIKESRA-045: Implement upload and complete-upload endpoints

Priority: P0. Depends on SIKESRA-044.

### SIKESRA-046: Implement private document download endpoint

Priority: P0. Depends on SIKESRA-045.

### SIKESRA-047: Implement document verification and replacement endpoints

Priority: P1. Depends on SIKESRA-045 and SIKESRA-046.

### SIKESRA-048: Build document upload/list UI

Priority: P0. Depends on SIKESRA-045 and SIKESRA-046.

## Phase 9: Import and Deduplication

### SIKESRA-049: Implement import batch creation

Priority: P0. Depends on SIKESRA-045.

### SIKESRA-050: Implement sheet reading and mapping

Priority: P0. Depends on SIKESRA-049.

### SIKESRA-051: Implement staging row parser and validator

Priority: P0. Depends on SIKESRA-050.

### SIKESRA-052: Implement import rows list and correction API

Priority: P0. Depends on SIKESRA-051.

### SIKESRA-053: Build import center UI

Priority: P0. Depends on SIKESRA-049, SIKESRA-050, SIKESRA-052.

### SIKESRA-054: Implement deduplication service

Priority: P0. Depends on SIKESRA-010 and SIKESRA-018.

### SIKESRA-055: Implement duplicate persistence

Priority: P0. Depends on SIKESRA-054.

### SIKESRA-056: Implement import promotion

Priority: P0. Depends on SIKESRA-052, SIKESRA-055, SIKESRA-037.

## Phase 10: Reports, Audit, Settings

### SIKESRA-057: Implement report metadata API

Priority: P1. Depends on SIKESRA-024.

### SIKESRA-058: Implement export job creation API

Priority: P1. Depends on SIKESRA-057 and SIKESRA-044.

### SIKESRA-059: Build reports/export UI

Priority: P1. Depends on SIKESRA-057 and SIKESRA-058.

### SIKESRA-060: Implement audit list/detail API

Priority: P1. Depends on SIKESRA-019.

### SIKESRA-061: Build audit UI

Priority: P1. Depends on SIKESRA-060.

### SIKESRA-062: Implement settings API

Priority: P1. Depends on SIKESRA-007 and SIKESRA-019.

### SIKESRA-063: Build settings UI

Priority: P1. Depends on SIKESRA-062.

## Phase 11: Hardening

### SIKESRA-064: Add RBAC, ABAC, masking, and region tests

Priority: P0. Depends on SIKESRA-017, SIKESRA-018, SIKESRA-029, SIKESRA-030.

### SIKESRA-065: Add import, duplicate, and promotion tests

Priority: P0. Depends on SIKESRA-056.

### SIKESRA-066: Add document and export security tests

Priority: P0. Depends on SIKESRA-046 and SIKESRA-058.

### SIKESRA-067: Add public dashboard privacy tests

Priority: P0. Depends on SIKESRA-022 and SIKESRA-023.

### SIKESRA-068: Perform performance and index review

Priority: P1. Depends on dashboard, entity, import, audit APIs.

### SIKESRA-069: Test D1/R2 backup and restore linkage

Priority: P0. Depends on documents and migrations.

## Phase 12: Documentation and Release

### SIKESRA-070: Finalize implementation documentation

Priority: P0. Depends on all P0 features.

### SIKESRA-071: Prepare MVP go/no-go report

Priority: P0. Depends on validation checklist and UAT.

### SIKESRA-072: Create operator training notes

Priority: P1. Depends on SOP and UI completion.

## GitHub Issue Creation Recommendation

Create GitHub issues from this backlog after repository discovery confirms exact file paths and conventions. Creating all issues before discovery would make file paths speculative. For junior programmers or limited-context AI agents, use the ticket template, required splits, and prompt packs in `11_ai_implementation_handoff.md`.
