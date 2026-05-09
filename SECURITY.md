# Security Policy

SIKESRA handles sensitive welfare, personal, institutional, document, import, export, audit, and public aggregate data. Security must be built into every phase, not added at the end.

## Reporting Security Issues

Do not open public issues for vulnerabilities involving authentication, authorization, sensitive data exposure, document access, export leakage, import corruption, tenant isolation, or Cloudflare secrets.

Report privately to the repository owner or project maintainer through the approved internal channel.

Include:

1. Affected area.
2. Reproduction steps.
3. Expected behavior.
4. Actual behavior.
5. Potential data exposure.
6. Suggested mitigation, if known.

## Sensitive Data Rules

Never expose through normal API responses, UI output, logs, exports, or public pages:

1. NIK/KIA hash.
2. Raw NIK/KIA.
3. Raw R2 storage key.
4. Private document URL.
5. Highly restricted values.
6. Protected names where masking is required.
7. Exact addresses for protected records.
8. Individual desil/extreme poverty data unless explicitly authorized.
9. Disability or ODGJ details except through authorized masked/internal flows.

## Required Controls

1. Authentication for all admin routes and admin APIs.
2. RBAC base permission on every admin API.
3. ABAC for object-level reads, writes, downloads, exports, and verification decisions.
4. Tenant, site, soft-delete, and backend-computed region scope filters in repositories.
5. Server-side masking before JSON serialization.
6. Public aggregate-only output with small-cell suppression.
7. Signed or proxy-only private document access.
8. Staged import with validation and duplicate review before promotion.
9. Restricted export permission, reason, and audit.
10. Audit trail for all high-risk actions.

## High-Risk Areas

Treat these changes as security-sensitive:

1. Request context builder.
2. Route guard.
3. Permission registration.
4. ABAC evaluator.
5. Masking utility.
6. Public aggregation service.
7. D1 migrations for sensitive data.
8. R2 storage adapter and download endpoints.
9. Import staging and promotion.
10. Export job creation and download.
11. Audit list/detail redaction.
12. Settings that control public visibility or security thresholds.

## Validation Before Release

Use `docs/sikesra/10_validation_checklist.md`. MVP go/no-go requires passing P0 checks for security, public privacy, cross-region access, masking, import, document access, verification, export, audit redaction, and backup/restore linkage.
