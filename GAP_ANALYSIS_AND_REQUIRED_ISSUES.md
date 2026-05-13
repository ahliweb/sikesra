# SIKESRA Gap Analysis & Required GitHub Issues

**Date:** 2026-05-13
**Status:** MVP CONDITIONAL GO - 8 issues identified for pre-production and post-MVP hardening

## Summary

After comprehensive analysis of the SIKESRA repository (`ahliweb/sikesra`), the following gaps have been identified that require GitHub issues. The MVP is in **CONDITIONAL GO** status with 143 tests passing across 14 test files, 64 API routes implemented, 0 TypeScript errors, and all 28 previously tracked issues closed.

---

## Issue 1: Pre-Production Performance Review & Staging Validation

**Priority:** P0 (Blocks production scaling)
**Labels:** `mvp`, `operations`, `performance`, `staging`

### Problem
The MVP Go/No-Go Report shows CONDITIONAL GO with 3 criteria not met:
1. Performance review not completed
2. Staging environment not validated
3. Backup/restore not tested in staging

### Required Work
- [ ] Worker resource limits validation (CPU, memory)
- [ ] D1 query performance with 10K+ entities
- [ ] R2 upload/download throughput testing
- [ ] Deploy to staging and validate all MVP workflows
- [ ] Execute and validate backup/restore procedures
- [ ] Update MVP Go/No-Go Report to GO status

### Acceptance Criteria
1. Performance review document with metrics
2. Staging validation checklist completed
3. Backup/restore test results documented
4. MVP Go/No-Go Report updated to GO

### References
- `docs/sikesra/MVP_GO_NO_GO_REPORT.md`
- `docs/sikesra/BACKUP_RESTORE.md`
- `docs/sikesra/07_operations_sop.md`

---

## Issue 2: Cloudflare Access JWT Validation

**Priority:** P1 (Post-MVP security hardening)
**Labels:** `post-mvp`, `security`, `authentication`

### Problem
Cloudflare Access JWT validation is not implemented (`src/security/cloudflare-access.ts` exists but JWT validation is deferred). Currently relying on EmDash session/cookie authentication only.

### Required Work
- [ ] Implement JWT validation for Cloudflare Access tokens
- [ ] Add JWT claims extraction to request context builder
- [ ] Validate token expiration and issuer
- [ ] Add JWT validation tests
- [ ] Document JWT configuration requirements

### Acceptance Criteria
1. Cloudflare Access JWTs validated on all admin/API routes
2. Invalid/expired tokens rejected with 401
3. JWT claims available in request context
4. Tests cover valid/invalid/expired token scenarios

### References
- `src/security/cloudflare-access.ts`
- `src/security/request-context.ts`
- `docs/sikesra/06_security_rbac_abac.md`

---

## Issue 3: R2 Lifecycle Rules Configuration

**Priority:** P1 (Post-MVP operations)
**Labels:** `post-mvp`, `operations`, `storage`

### Problem
R2 lifecycle rules for document retention, import staging cleanup, and export job cleanup are not configured. This will lead to unbounded storage growth.

### Required Work
- [ ] Define lifecycle rules for each R2 prefix:
  - `/documents/` - retain per document classification
  - `/imports/` - auto-delete after 90 days
  - `/exports/` - auto-delete after 30 days
- [ ] Configure R2 lifecycle rules via wrangler or dashboard
- [ ] Document lifecycle policy in operations docs
- [ ] Test lifecycle rule behavior

### Acceptance Criteria
1. R2 lifecycle rules configured and documented
2. Import staging data auto-cleaned after 90 days
3. Export files auto-cleaned after 30 days
4. Document retention follows classification policy

### References
- `docs/sikesra/OPERATIONS.md`
- `docs/sikesra/BACKUP_RESTORE.md`
- `wrangler.toml`

---

## Issue 4: Penetration Testing Plan

**Priority:** P1 (Post-MVP security)
**Labels:** `post-mvp`, `security`, `testing`

### Problem
No comprehensive penetration testing has been performed on the SIKESRA application. Security controls are implemented but not validated against real-world attack scenarios.

### Required Work
- [ ] Define penetration testing scope:
  - Authentication bypass attempts
  - RBAC/ABAC bypass attempts
  - Tenant/site isolation bypass
  - Small-cell suppression bypass
  - IDOR on entity/document access
  - Import/export abuse scenarios
  - Rate limiting bypass
- [ ] Execute penetration tests (manual or automated)
- [ ] Document findings and remediation
- [ ] Add regression tests for any vulnerabilities found

### Acceptance Criteria
1. Penetration testing scope document
2. Test results with findings
3. Remediation plan for any vulnerabilities
4. Regression tests added for critical findings

### References
- `docs/sikesra/06_security_rbac_abac.md`
- `docs/sikesra/INCIDENT_RESPONSE_RUNBOOK.md`
- `src/security/` (all security modules)

---

## Issue 5: ABAC Policy/Attribute Management UI Refinements

**Priority:** P1 (Post-MVP UX)
**Labels:** `post-mvp`, `frontend`, `abac`

### Problem
ABAC policy and attribute management UI needs refinements for better operator experience. API is complete (14 endpoints) but UI is basic.

### Required Work
- [ ] Visual ABAC policy builder UI
- [ ] Policy preview with affected entities count
- [ ] Attribute value management UI with validation
- [ ] Policy activation/deactivation workflow UI
- [ ] Policy conflict detection and warning UI
- [ ] Add UI tests for ABAC management

### Acceptance Criteria
1. Visual policy builder with condition editor
2. Policy preview shows impact before activation
3. Attribute CRUD with validation feedback
4. Conflict warnings for overlapping policies
5. UI tests for all ABAC management workflows

### References
- `src/services/abac-policy-service.ts`
- `src/services/abac-attribute-service.ts`
- `src/routes/abac-routes.ts`
- Issue #176 (previously tracked)

---

## Issue 6: Permission Registry Integration to EmDash Role UI

**Priority:** P1 (Post-MVP integration)
**Labels:** `post-mvp`, `integration`, `permissions`

### Problem
SIKESRA permissions (`awcms:sikesra:*`) are not integrated into EmDash role assignment UI. Currently permissions are defined in code but not visible in EmDash admin role management.

### Required Work
- [ ] Create permission registry adapter for EmDash
- [ ] Register all 38 SIKESRA permissions with EmDash
- [ ] Add permission descriptions and grouping
- [ ] Test permission assignment in EmDash role UI
- [ ] Document permission registry integration

### Acceptance Criteria
1. All 38 SIKESRA permissions visible in EmDash role UI
2. Permissions grouped logically (dashboard, entity, verification, etc.)
3. Permission descriptions helpful for role assignment
4. Role assignments enforced correctly

### References
- `src/security/permissions.ts`
- `src/security/permission-registry.ts`
- `docs/sikesra/IMPLEMENTATION_DECISIONS.md` (Missing Extension Points)

---

## Issue 7: CI/CD Pipeline Enhancements

**Priority:** P1 (Operations improvement)
**Labels:** `operations`, `ci-cd`, `testing`

### Problem
Current CI/CD pipeline (`.github/workflows/deploy.yml`) runs typecheck, tests, and deploy but is missing:
1. Test coverage reporting
2. Build artifact validation
3. Security scanning
4. Deployment verification smoke tests

### Required Work
- [ ] Add test coverage reporting to CI
- [ ] Add coverage threshold gate (e.g., 80% minimum)
- [ ] Add build artifact validation step
- [ ] Add dependency security scanning (npm audit)
- [ ] Add post-deployment smoke test step
- [ ] Add PR status check for coverage

### Acceptance Criteria
1. CI reports test coverage on every PR
2. Coverage threshold enforced (configurable)
3. Build artifacts validated before deploy
4. npm audit runs with failure on critical vulnerabilities
5. Post-deployment smoke test validates key endpoints

### References
- `.github/workflows/deploy.yml`
- `vitest.config.ts`
- `package.json` (test:coverage script)

---

## Issue 8: Test Coverage Gaps - Automated Tests for Manual Items

**Priority:** P1 (Testing hardening)
**Labels:** `test`, `quality`, `post-mvp`

### Problem
Test coverage mapping (`docs/sikesra/TEST_COVERAGE_MAPPING.md`) shows 25 items (22%) with partial/manual coverage only. Key gaps include:

**High Priority:**
- ID generation automated tests (currently manual review only for some checks)
- Document workflow tests (upload validation, signed URLs, audit)
- Audit workflow tests (list filters, detail view, export)
- Entity wizard tests (draft creation, autosave, section validation)

**Medium Priority:**
- Duplicate detection tests (signals, risk levels, decisions)
- Plugin state tests (inactive plugin 404 behavior)
- Export job tests (creation, download flow)

**Low Priority:**
- Dangerous file type blocking tests
- UI layout tests (mobile/desktop)

### Required Work
- [ ] Add automated tests for high-priority gaps
- [ ] Add automated tests for medium-priority gaps
- [ ] Document manual-only tests with justification
- [ ] Update TEST_COVERAGE_MAPPING.md with new coverage
- [ ] Target 90%+ checklist items with automated tests

### Acceptance Criteria
1. All high-priority gaps have automated tests
2. Medium-priority gaps have automated tests or documented justification
3. Test coverage mapping updated
4. All tests pass in CI

### References
- `docs/sikesra/TEST_COVERAGE_MAPPING.md`
- `docs/sikesra/10_validation_checklist.md`
- `src/__tests__/` (existing test files)

---

## Implementation Priority Order

1. **Issue 1** (P0) - Pre-Production Performance Review & Staging Validation - **Must complete before production**
2. **Issue 8** (P1) - Test Coverage Gaps - Improves quality and confidence
3. **Issue 2** (P1) - Cloudflare Access JWT Validation - Security hardening
4. **Issue 4** (P1) - Penetration Testing Plan - Security validation
5. **Issue 7** (P1) - CI/CD Pipeline Enhancements - Operations improvement
6. **Issue 6** (P1) - Permission Registry Integration - UX improvement
7. **Issue 5** (P1) - ABAC UI Refinements - UX improvement
8. **Issue 3** (P1) - R2 Lifecycle Rules - Operations (can be done anytime post-MVP)

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Total Source Files | 92+ |
| API Routes | 64 |
| Test Files | 14 |
| Total Tests | 143 |
| Migrations | 14 |
| Seed Files | 5 |
| Permissions | 38 |
| TypeScript Errors | 0 |
| GitHub Issues (Previously Tracked) | 28 (all closed) |
| MVP Status | CONDITIONAL GO |

## Documentation Status

All documentation is complete and up-to-date:
- ✅ 23 SIKESRA-specific documents in `docs/sikesra/`
- ✅ 16 core platform documents in `docs/core/`
- ✅ Implementation decisions logged
- ✅ Operations runbooks complete
- ✅ Training notes complete
- ✅ Test coverage mapping complete
