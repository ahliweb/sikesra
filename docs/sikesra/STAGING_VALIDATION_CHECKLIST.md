# SIKESRA Staging Validation Checklist

**Date:** 2026-05-13
**Environment:** Staging (sikesra-staging.ahlikoding.com)
**Validator:** _pending_

## Purpose

This checklist validates all MVP workflows in the staging environment before production deployment. Each item must be tested and marked as PASS or FAIL with notes.

## Pre-Validation Setup

- [ ] Staging worker deployed successfully
- [ ] D1 database provisioned and migrations applied
- [ ] R2 bucket provisioned and accessible
- [ ] KV namespace provisioned for rate limiting
- [ ] Plugin activated in EmDash admin
- [ ] Test user accounts created (admin, verifier, operator)

## 1. Hybrid Worker Routing

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | GET `/` | EmDash host output, `x-route: emdash-root` | ⬜ | |
| 1.2 | GET `/sikesra` | Public SIKESRA page (aggregate data) | ⬜ | |
| 1.3 | GET `/_emdash/admin` | EmDash admin login/shell | ⬜ | |
| 1.4 | GET `/_emdash/api/plugins/sikesra/admin` | Block Kit admin response | ⬜ | |
| 1.5 | GET `/_emdash/api/plugins/sikesra/public/summary` | Public aggregate summary | ⬜ | |
| 1.6 | GET `/_emdash/api/plugins/sikesra/v1/entities` | Auth required or entity list | ⬜ | |

## 2. Plugin Activation/Deactivation

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Plugin visible in EmDash admin plugins page | Listed as "sikesra" | ⬜ | |
| 2.2 | Activate plugin | Status changes to active | ⬜ | |
| 2.3 | `/sikesra` accessible after activation | Returns public page | ⬜ | |
| 2.4 | Deactivate plugin | Status changes to inactive | ⬜ | |
| 2.5 | `/sikesra` returns 404 after deactivation | 404 response | ⬜ | |

## 3. Entity CRUD Workflow

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Create entity via admin UI | Success, entity appears in list | ⬜ | |
| 3.2 | View entity detail | All fields displayed correctly | ⬜ | |
| 3.3 | Update entity | Changes saved, audit log created | ⬜ | |
| 3.4 | Delete entity (soft delete) | Entity marked deleted, reason captured | ⬜ | |
| 3.5 | Restore deleted entity | Entity restored, audit log created | ⬜ | |
| 3.6 | Entity list pagination | Works with LIMIT/OFFSET | ⬜ | |
| 3.7 | Entity list filters | Region, status, type filters work | ⬜ | |

## 4. Verification Workflow

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Submit entity for verification | Status changes to submitted | ⬜ | |
| 4.2 | View verification queue | Submitted entities listed | ⬜ | |
| 4.3 | Verify entity (approve) | Status updated, note captured | ⬜ | |
| 4.4 | Verify entity (revision) | Status set to need_revision | ⬜ | |
| 4.5 | Verify entity (reject) | Status set to rejected | ⬜ | |
| 4.6 | View verification timeline | All events displayed | ⬜ | |

## 5. Import/Promotion Workflow

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Upload Excel/CSV file | File accepted, batch created | ⬜ | |
| 5.2 | View import batch | Rows displayed with validation status | ⬜ | |
| 5.3 | Update staging row | Changes saved | ⬜ | |
| 5.4 | Promote import batch | Rows promoted to entities | ⬜ | |
| 5.5 | Duplicate detection during promotion | Duplicates flagged | ⬜ | |
| 5.6 | Rollback failed promotion | Data restored, audit logged | ⬜ | |

## 6. Document Upload/Download

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Generate upload URL | Signed URL returned | ⬜ | |
| 6.2 | Upload document to R2 | Document stored | ⬜ | |
| 6.3 | Complete upload | Metadata saved in D1 | ⬜ | |
| 6.4 | View entity documents | Documents listed | ⬜ | |
| 6.5 | Download document via proxy | File served, audit logged | ⬜ | |
| 6.6 | Verify document | Status updated | ⬜ | |
| 6.7 | Replace document | New version stored | ⬜ | |

## 7. Export Generation

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | Create export job | Job created, status pending | ⬜ | |
| 7.2 | View export job list | Jobs listed with status | ⬜ | |
| 7.3 | Generate export file | File generated in R2 | ⬜ | |
| 7.4 | Download export file | File downloaded | ⬜ | |
| 7.5 | Export with restricted fields | Requires permission, audit logged | ⬜ | |

## 8. Audit Logging

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 8.1 | View audit log | Events listed | ⬜ | |
| 8.2 | High-risk action creates audit event | Event present with reason | ⬜ | |
| 8.3 | Audit detail view | Full event details displayed | ⬜ | |
| 8.4 | Audit export | Export file generated | ⬜ | |

## 9. ABAC Policy Evaluation

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 9.1 | Create ABAC policy | Policy saved | ⬜ | |
| 9.2 | Activate ABAC policy | Policy active | ⬜ | |
| 9.3 | Policy denies access | Request blocked | ⬜ | |
| 9.4 | Policy allows access | Request succeeds | ⬜ | |
| 9.5 | Preview policy evaluation | Preview results returned | ⬜ | |

## 10. Rate Limiting

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 10.1 | Import rate limit (5/hr) | 6th request blocked | ⬜ | |
| 10.2 | Export rate limit (10/hr) | 11th request blocked | ⬜ | |
| 10.3 | Rate limit bypass permission | Admin can bypass | ⬜ | |

## Validation Summary

| Area | Tests | Passed | Failed | Notes |
|------|-------|--------|--------|-------|
| Hybrid Worker Routing | 6 | | | |
| Plugin Activation | 5 | | | |
| Entity CRUD | 7 | | | |
| Verification | 6 | | | |
| Import/Promotion | 6 | | | |
| Documents | 7 | | | |
| Export | 5 | | | |
| Audit | 4 | | | |
| ABAC | 5 | | | |
| Rate Limiting | 3 | | | |
| **Total** | **54** | | | |

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Validator | _pending_ | _pending_ | _pending_ |
| Technical Lead | _pending_ | _pending_ | _pending_ |
