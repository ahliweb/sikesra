# 09 12-Week MVP Plan

## Delivery Principles

1. Build EmDash-compatible module foundation first.
2. Implement security before sensitive workflows.
3. Use D1-compatible migrations and R2 metadata discipline.
4. Keep public data aggregate-only from the first public endpoint.
5. Treat tests as part of each sprint.
6. Defer non-MVP integrations until the core lifecycle is safe.

## Milestones

| Week | Theme                            | Outcome                                                           |
| ---: | -------------------------------- | ----------------------------------------------------------------- |
|    1 | Discovery and Plugin Foundation  | Repository conventions, decision log, module skeleton, manifest.  |
|    2 | Database Foundation              | D1 migrations and seeds for settings, regions, entities, details. |
|    3 | Security Foundation              | RBAC, ABAC, masking, request context, audit baseline.             |
|    4 | Public and Admin Dashboards      | Public `/sikesra`, scoped admin dashboard, public privacy tests.  |
|    5 | Regions and Registry             | Region services, entity list/detail, filters, masking.            |
|    6 | Progressive Input                | Draft, autosave, validation, completeness, wizard UI.             |
|    7 | ID and Verification              | 20-digit ID generation, submit, verification queue/decision flow. |
|    8 | Documents and R2                 | Upload, metadata, private download, document UI.                  |
|    9 | Excel Import                     | Workbook upload, mapping, staging, validation, correction UI.     |
|   10 | Dedup, Promotion, Reports        | Duplicate service, promotion, basic export/settings.              |
|   11 | Audit and Hardening              | Audit UI, security tests, backup/restore, performance review.     |
|   12 | Acceptance and Release Candidate | UAT, documentation finalization, go/no-go decision.               |

## Week 1 Gate

Must complete:

1. Repository discovery report.
2. Implementation decision log.
3. Target module folder choice.
4. Plugin skeleton or exact registration plan.
5. Manifest draft.
6. No unnecessary EmDash core changes.

## Week 2 Gate

Must complete:

1. Migrations run locally.
2. Seeds are repeatable.
3. All MVP table groups exist or have documented shared-service replacement.
4. Critical indexes are present.
5. Schema differences are reflected in `03_data_model.md` if implementation diverges.

## Week 3 Gate

Must complete:

1. Permission registry complete.
2. Route guard denies unauthenticated/unauthorized access.
3. ABAC evaluator supports required baseline policies.
4. Masking utility prevents sensitive leakage.
5. Audit service can write high-risk events.
6. Tests prove NIK/KIA hash is never returned.

## Week 4 Gate

Must complete:

1. `/sikesra` loads without login.
2. Public summary is active/verified/aggregate-safe only.
3. Small-cell suppression works.
4. Admin dashboard requires login and permission.
5. Dashboard query is region-scoped.
6. Work queues link only to authorized routes.

## Week 5 Gate

Must complete:

1. Official and local regions are separated.
2. Entity list supports key filters and pagination.
3. Entity detail returns tabs and access flags.
4. Cross-region list/detail access is denied or excluded.
5. No raw sensitive values, hashes, or R2 keys appear.

## Week 6 Gate

Must complete:

1. User can create draft.
2. Sections autosave.
3. Validation errors are section-aware.
4. Completeness is calculated.
5. Required fields block submit readiness.
6. Wizard distinguishes official and local regions.

## Week 7 Gate

Must complete:

1. Valid entity generates 20-digit ID.
2. Missing required fields block generation.
3. ID is stable after local RT/RW change.
4. Submit enters verification workflow.
5. Verifiers act only in allowed scope.
6. Revision/rejection require note.
7. Verification event and audit are written.

## Week 8 Gate

Must complete:

1. Valid document uploads.
2. Dangerous files are blocked.
3. D1 metadata and R2 object are linked.
4. Restricted download requires permission.
5. Raw R2 key is never returned.
6. Download is audited.

## Week 9 Gate

Must complete:

1. Workbook creates import batch.
2. Sheet/columns are detected.
3. Mapping is saved/used.
4. Rows enter staging.
5. Invalid rows are marked and cannot be promoted.
6. Staging row data is access-controlled.
7. Row correction revalidates.

## Week 10 Gate

Must complete:

1. Duplicate candidates are generated.
2. High-risk duplicate decisions require reason.
3. Valid import row promotes to entity/detail/person records.
4. Promoted entity is not auto-verified.
5. Export requires permission and reason for restricted fields.
6. Settings update requires permission, reason, and audit.

## Week 11 Gate

Must complete:

1. Audit UI shows events with redaction.
2. Security tests pass.
3. Public privacy tests pass.
4. Document/export tests pass.
5. Import/promotion tests pass.
6. Backup/restore runbook is tested.
7. Performance issues are fixed or documented.

## Week 12 Gate

Must complete:

1. End-to-end UAT scenarios pass.
2. All P0 issues are closed or formally accepted with workaround.
3. Critical/high risks are reduced or accepted by owner.
4. Documentation reflects implementation reality.
5. Release candidate decision is documented.

## Critical Path

```txt
Plugin foundation -> Database -> Security -> Registry -> Wizard -> ID -> Verification -> Documents -> Import/Promotion -> Hardening -> Release candidate
```

## MVP Definition of Done

1. SIKESRA runs as a plugin/module.
2. Route namespaces match documentation.
3. Migrations and seeds run cleanly.
4. R2 flow works securely.
5. RBAC and ABAC are enforced server-side.
6. Region scope is enforced in repositories.
7. Sensitive data is masked server-side.
8. Public dashboard is aggregate-safe.
9. Entity registry and detail work.
10. Wizard can create, autosave, validate, generate ID, and submit.
11. Verification queue and decisions work.
12. Document upload/download is permission-aware and audited.
13. Import uses staging, validation, duplicate review, and promotion.
14. Export respects sensitivity and audit rules.
15. Audit log captures high-risk actions and redacts detail.
16. Backup/restore is tested.
17. P0 tests pass.
18. No untreated critical/high risk remains.
