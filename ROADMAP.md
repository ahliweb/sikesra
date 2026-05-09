# Roadmap

This roadmap summarizes the SIKESRA implementation sequence. The detailed source of truth is `docs/sikesra/IMPLEMENTATION_PLAN.md`.

## Phase 0: Discovery

Outcome: repository conventions and extension points are known and documented in `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.

Required before feature work:

1. Plugin/module target folder.
2. Plugin registration convention.
3. Manifest convention.
4. Admin, API, and public route conventions.
5. D1 migration and seed conventions.
6. Test command and test file convention.
7. Auth/session, permission, audit, ABAC, and media/R2 helpers or fallbacks.

## Phase 1: Module Foundation

Outcome: SIKESRA plugin/module shell, manifest, response envelope, and request context builder.

## Phase 2: Database and Seeds

Outcome: D1-compatible migrations and repeatable seeds for settings, master data, regions, registry, details, attributes, ABAC, verification, documents, imports, deduplication, benefits, exports, audit, and public summary support.

## Phase 3: Security Foundation

Outcome: permissions, route guard, ABAC evaluator, masking utility, audit baseline, and negative leakage tests.

## Phase 4: Public and Admin Dashboards

Outcome: aggregate-safe public `/sikesra` page and scoped admin dashboard.

## Phase 5: Regions and Registry

Outcome: official/local region services, entity list/detail APIs, registry UI, and entity detail UI.

## Phase 6: Progressive Input and ID

Outcome: draft creation, autosave, validation, completeness, wizard UI, SIKESRA 20-digit ID generation, and controlled correction.

## Phase 7: Verification

Outcome: submit endpoint, queue, verification decisions, notes, audit, and verifier UI.

## Phase 8: Documents and R2

Outcome: secure upload, metadata, private preview/download, document verification/replacement, and document UI.

## Phase 9: Import and Deduplication

Outcome: workbook upload, mapping, staging, validation, correction, duplicate review, and promotion.

## Phase 10: Reports, Audit, Settings

Outcome: report metadata, controlled export jobs, audit list/detail, settings API, and corresponding UI.

## Phase 11: Hardening and Operations

Outcome: security tests, privacy tests, backup/restore validation, performance review, and operational procedures.

## Phase 12: Release Candidate

Outcome: UAT, documentation finalization, operator training notes, rollback/disable documentation, and MVP go/no-go decision.

## Critical Path

```txt
Discovery -> plugin foundation -> database -> security -> public/admin dashboards -> regions/registry -> wizard -> ID -> verification -> documents -> import/dedup/promotion -> reports/audit/settings -> hardening -> release candidate
```
