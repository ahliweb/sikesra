# SIKESRA Penetration Testing Plan

**Date:** 2026-05-13
**Version:** 1.0
**Scope:** SIKESRA Application (staging environment)
**Classification:** Confidential

## Purpose

This document defines the penetration testing scope, methodology, and test cases for SIKESRA. The goal is to validate security controls against real-world attack scenarios before production deployment.

## Testing Environment

| Component | Value |
|-----------|-------|
| Environment | Staging (sikesra-staging.ahlikoding.com) |
| D1 Database | `sikesra` (staging) |
| R2 Bucket | `sikesra` (staging) |
| KV Namespace | `sikesra-session` (staging) |
| Worker | `sikesra-staging` |

## Rules of Engagement

1. **No production data** - All tests use staging environment only
2. **No denial of service** - Rate-limited testing only
3. **Document all findings** - Every test case result recorded
4. **Confidential findings** - Vulnerabilities not disclosed publicly before remediation
5. **Time-boxed testing** - Complete within 5 business days

## Test Scope

### 1. Authentication Bypass

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 1.1 | Access admin API without authentication | Direct API call | 401 Unauthorized | ⬜ |
| 1.2 | Access admin UI without session | Direct URL access | Redirect to login | ⬜ |
| 1.3 | Use expired JWT token | Modified Authorization header | 401 Unauthorized | ⬜ |
| 1.4 | Use invalid JWT signature | Tampered JWT | 401 Unauthorized | ⬜ |
| 1.5 | Access public API with admin token | Public endpoint + admin token | 200 OK (public data) | ⬜ |
| 1.6 | Bypass Cloudflare Access JWT | Missing CF-Access header | 401 Unauthorized | ⬜ |

### 2. RBAC/ABAC Bypass

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 2.1 | Access entity without ENTITY_READ permission | User without permission | 403 Forbidden | ⬜ |
| 2.2 | Create entity without ENTITY_CREATE permission | User without permission | 403 Forbidden | ⬜ |
| 2.3 | Delete entity without ENTITY_DELETE permission | User without permission | 403 Forbidden | ⬜ |
| 2.4 | Bypass ABAC deny policy | User blocked by policy | 403 Forbidden | ⬜ |
| 2.5 | Access entity outside region scope | User with different region | 403 Forbidden | ⬜ |
| 2.6 | Modify ABAC policy without POLICY_WRITE | User without permission | 403 Forbidden | ⬜ |

### 3. Tenant/Site Isolation Bypass

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 3.1 | Access another tenant's entities | Modified tenant context | 403/404 | ⬜ |
| 3.2 | Access another site's documents | Modified site context | 403/404 | ⬜ |
| 3.3 | Cross-tenant import promotion | Modified import context | 403 Forbidden | ⬜ |
| 3.4 | Cross-tenant audit log access | Modified audit context | 403 Forbidden | ⬜ |

### 4. Small-Cell Suppression Bypass

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 4.1 | Query public summary with small cell | Filter to < 5 entities | Suppressed data | ⬜ |
| 4.2 | Iterate filters to isolate entity | Multiple filter combinations | Suppressed data | ⬜ |
| 4.3 | Access individual names via public API | Public endpoint | No names returned | ⬜ |
| 4.4 | Access exact coordinates via public API | Public endpoint | No coordinates | ⬜ |
| 4.5 | Access NIK/KIA via public API | Public endpoint | No NIK/KIA | ⬜ |

### 5. IDOR (Insecure Direct Object Reference)

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 5.1 | Access entity by ID without permission | Direct entity ID | 403 Forbidden | ⬜ |
| 5.2 | Access document by key without permission | Direct R2 key | 403 Forbidden | ⬜ |
| 5.3 | Access import batch by ID without permission | Direct batch ID | 403 Forbidden | ⬜ |
| 5.4 | Access export job by ID without permission | Direct job ID | 403 Forbidden | ⬜ |
| 5.5 | Access audit log by ID without permission | Direct audit ID | 403 Forbidden | ⬜ |

### 6. Import/Export Abuse

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 6.1 | Upload malicious file type | Non-Excel/CSV file | 400 Bad Request | ⬜ |
| 6.2 | Upload oversized file | File > 10MB | 413 Payload Too Large | ⬜ |
| 6.3 | Bypass import rate limit | > 5 imports/hour | 429 Too Many Requests | ⬜ |
| 6.4 | Bypass export rate limit | > 10 exports/hour | 429 Too Many Requests | ⬜ |
| 6.5 | Access restricted export without permission | User without EXPORT_RESTRICTED | 403 Forbidden | ⬜ |
| 6.6 | Export without reason when required | Missing reason field | 400 Bad Request | ⬜ |

### 7. Rate Limiting Bypass

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 7.1 | Bypass import rate limit | Rapid import requests | 429 after 5 | ⬜ |
| 7.2 | Bypass export rate limit | Rapid export requests | 429 after 10 | ⬜ |
| 7.3 | Bypass document rate limit | Rapid document requests | 429 after 50 | ⬜ |
| 7.4 | Bypass ID correction rate limit | Rapid correction requests | 429 after 10 | ⬜ |
| 7.5 | Bypass sensitive reveal rate limit | Rapid reveal requests | 429 after 20 | ⬜ |
| 7.6 | Admin bypass rate limit | User with RATE_LIMIT_BYPASS | 200 OK | ⬜ |

### 8. XSS/CSRF on Admin UI

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 8.1 | Stored XSS in entity name | Script tag in display_name | Sanitized/escaped | ⬜ |
| 8.2 | Stored XSS in entity address | Script tag in address | Sanitized/escaped | ⬜ |
| 8.3 | Reflected XSS in search params | Script in query string | Sanitized/escaped | ⬜ |
| 8.4 | CSRF on entity create | Cross-origin POST | CSRF token required | ⬜ |
| 8.5 | CSRF on settings update | Cross-origin POST | CSRF token required | ⬜ |
| 8.6 | CSRF on import promotion | Cross-origin POST | CSRF token required | ⬜ |

### 9. SQL Injection on D1 Queries

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 9.1 | SQL injection in entity filter | `' OR 1=1 --` | Parameterized query | ⬜ |
| 9.2 | SQL injection in region filter | `' UNION SELECT ... --` | Parameterized query | ⬜ |
| 9.3 | SQL injection in search | `' DROP TABLE ... --` | Parameterized query | ⬜ |
| 9.4 | SQL injection in sort order | `; SELECT ... --` | Parameterized query | ⬜ |
| 9.5 | SQL injection in pagination | `1; SELECT ... --` | Parameterized query | ⬜ |

### 10. R2 Unauthorized Access

| # | Test Case | Method | Expected | Status |
|---|-----------|--------|----------|--------|
| 10.1 | Access R2 object without signed URL | Direct R2 URL | 403 Forbidden | ⬜ |
| 10.2 | Access R2 object with expired signed URL | Expired signed URL | 403 Forbidden | ⬜ |
| 10.3 | Access R2 object for another tenant | Modified tenant path | 403 Forbidden | ⬜ |
| 10.4 | List R2 objects without permission | List bucket request | 403 Forbidden | ⬜ |
| 10.5 | Upload R2 object without permission | Direct PUT request | 403 Forbidden | ⬜ |

## Test Methodology

### Manual Testing

1. **Reconnaissance** - Map application surface, identify endpoints
2. **Authentication Testing** - Test login, session, JWT validation
3. **Authorization Testing** - Test RBAC, ABAC, tenant isolation
4. **Input Validation Testing** - Test XSS, SQLi, file upload
5. **Business Logic Testing** - Test workflow bypass, rate limiting
6. **Data Exposure Testing** - Test small-cell suppression, masking

### Automated Testing

1. **OWASP ZAP** - Automated vulnerability scanning
2. **SQLMap** - SQL injection testing (staging only)
3. **Custom Scripts** - Rate limiting, IDOR testing

## Reporting Format

### Finding Template

| Field | Value |
|-------|-------|
| ID | PT-001 |
| Title | _vulnerability title_ |
| Severity | Critical / High / Medium / Low / Info |
| Category | Authentication / Authorization / Input Validation / etc. |
| Description | _detailed description_ |
| Steps to Reproduce | _step-by-step instructions_ |
| Impact | _potential impact_ |
| Remediation | _recommended fix_ |
| Status | Open / In Progress / Resolved |

### Severity Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Immediate data breach or system compromise | 24 hours |
| High | Significant security weakness | 3 days |
| Medium | Moderate security weakness | 1 week |
| Low | Minor security weakness | 2 weeks |
| Info | Informational finding | As needed |

## Test Results Summary

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Authentication Bypass | 6 | | | |
| RBAC/ABAC Bypass | 6 | | | |
| Tenant/Site Isolation | 4 | | | |
| Small-Cell Suppression | 5 | | | |
| IDOR | 5 | | | |
| Import/Export Abuse | 6 | | | |
| Rate Limiting | 6 | | | |
| XSS/CSRF | 6 | | | |
| SQL Injection | 5 | | | |
| R2 Unauthorized Access | 5 | | | |
| **Total** | **54** | | | |

## Findings Log

| ID | Title | Severity | Status | Remediation |
|----|-------|----------|--------|-------------|
| _pending_ | | | | |

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Tester | _pending_ | _pending_ | _pending_ |
| Security Review | _pending_ | _pending_ | _pending_ |
| Technical Lead | _pending_ | _pending_ | _pending_ |
