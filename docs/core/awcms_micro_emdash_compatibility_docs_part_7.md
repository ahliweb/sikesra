# AWCMS-Micro Implementation Documentation

## Part 7 — Security, Compliance, ISO Alignment, and Testing

**Document status:** Draft v0.1  
**Purpose:** Define the security, compliance, ISO alignment, and testing baseline for AWCMS-Micro so it remains secure, auditable, legally responsible, operationally reliable, and compatible with original EmDash architecture.

---

## 1. Objective of Part 7

Part 7 defines the minimum security and quality baseline for AWCMS-Micro.

This document covers:

1. secure-by-default engineering baseline;
2. threat model;
3. security controls by system layer;
4. Indonesian compliance alignment;
5. privacy and personal data protection controls;
6. ISO alignment;
7. secure upload controls;
8. audit logging;
9. Cloudflare security controls;
10. testing strategy;
11. release validation gates;
12. incident response;
13. backup/restore verification;
14. GitHub Issues;
15. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
AWCMS-Micro must be simple enough for standard websites, but secure enough for schools, public portals, private documents, mobile APIs, and future tenant-ready modules.
```

---

## 2. Security Philosophy

AWCMS-Micro must follow secure-by-default engineering.

Security is not a plugin added at the end. Security must be part of:

- architecture;
- database design;
- plugin design;
- API routes;
- public frontend;
- admin UI;
- mobile API;
- storage;
- deployment;
- testing;
- operations;
- documentation.

Core principle:

```txt
Deny by default.
Allow explicitly.
Audit sensitive actions.
Minimize data exposure.
Prefer reversible changes.
```

---

## 3. Security Objectives

AWCMS-Micro must protect:

1. admin accounts;
2. website content;
3. unpublished drafts;
4. private documents;
5. form submissions;
6. student/child data;
7. user roles and policies;
8. API endpoints;
9. storage objects;
10. configuration and secrets;
11. audit logs;
12. future tenant data;
13. future ERP-like records.

Security objectives:

```txt
Confidentiality
Integrity
Availability
Accountability
Privacy
Resilience
Maintainability
Compatibility
```

---

## 4. AWCMS-Micro Security Baseline

Minimum controls:

```txt
authentication for admin
permission checks for admin routes
ABAC checks for sensitive resources
tenant/site filtering for custom modules
input validation
output escaping
CSRF or trusted request protection for mutations
rate limiting for public-sensitive routes
secure upload validation
safe filenames
signed URLs for private files
audit logs for sensitive actions
soft delete for recoverability
backup and restore process
no secrets in source code
secure environment variable handling
least privilege deployment credentials
security test plan
incident response procedure
```

---

## 5. Threat Model

### 5.1 Main Threat Actors

| Threat Actor | Example |
| --- | --- |
| Anonymous public user | tries to access private document |
| Authenticated low-privilege user | tries to call admin API directly |
| Compromised editor account | attempts to export submissions |
| Malicious uploader | uploads executable/malware file |
| Bot/spammer | floods public forms |
| Misconfigured admin | exposes private file publicly |
| Malicious/unsafe plugin | requests broad capabilities |
| Insider | abuses permission to access sensitive data |
| External attacker | attempts injection/XSS/session abuse |
| Infrastructure attacker | targets Cloudflare/DNS/storage/API routes |

### 5.2 Main Assets

| Asset | Sensitivity |
| --- | --- |
| Public pages/posts | Low |
| Draft content | Medium |
| Form submissions | High |
| Student/private documents | High/Critical |
| Admin accounts | Critical |
| ABAC policies | Critical |
| Audit logs | High |
| Storage credentials | Critical |
| Cloudflare tokens | Critical |
| Mobile sessions | High |
| Future ERP records | High/Critical |

### 5.3 Main Attack Scenarios

```txt
- public user downloads private PDF without verification
- editor accesses form submissions export endpoint directly
- attacker uploads HTML/JS/PHP file and executes it publicly
- plugin writes outside its storage scope
- mobile API leaks draft content
- admin changes permissions and locks out owner
- public route leaks soft-deleted content
- insecure CORS allows unauthorized mobile/web access
- secret key is committed to repository
- R2 object path is guessable and publicly accessible
```

---

## 6. Security by Layer

### 6.1 Admin Layer

Controls:

```txt
authentication required
permission-aware navigation
API-level authorization
ABAC for sensitive actions
CSRF/trusted request protection
no GET mutation
rate limit login-sensitive routes
audit policy/module/document changes
prevent last-owner lockout
```

### 6.2 Public Frontend Layer

Controls:

```txt
render public/published content only
exclude draft/private/restricted/deleted content
escape output
sanitize rich content
avoid exposing internal metadata
secure form submission
privacy notice and consent
safe document links
SEO excludes private content
```

### 6.3 Mobile API Layer

Controls:

```txt
versioned API
stable response contract
public-only data filter
CORS allowlist
rate limiting
request IDs
short-lived tokens when authenticated
refresh-token rotation later
device session revocation later
no admin API exposure
```

### 6.4 Plugin/Module Layer

Controls:

```txt
manifest validation
permission declaration
capability review
storage scope enforcement
risk classification
audit lifecycle events
safe disable/rollback
staging test for high-risk modules
```

### 6.5 Database Layer

Controls:

```txt
tenant_id on AWCMS custom tables
site_id where site-scoped
soft delete with deleted_at
created_at/updated_at
created_by/updated_by
audit_events
parameterized queries
no unsafe raw SQL interpolation
migration review
backup before production migration
```

### 6.6 Storage Layer

Controls:

```txt
tenant/site/module object keys
safe filenames
MIME and extension validation
file size limits
private files use signed URLs
public files only after approval
metadata records
quarantine suspicious files
storage cleanup policy
audit private access
```

### 6.7 Cloudflare/Edge Layer

Controls:

```txt
HTTPS only
WAF rules
rate limiting
Turnstile for public forms if needed
cache only safe public responses
origin protection
R2 bucket access control
D1/KV least privilege bindings
separate staging/production environments
```

---

## 7. Authentication and Session Security

### 7.1 Admin Authentication

Admin authentication must be strong.

EmDash uses **passkey-first (WebAuthn) authentication** as the canonical upstream standard, with OAuth and magic link fallbacks. Passkey authentication cannot be automated in browser tests, so EmDash provides dev-only bypass endpoints:

- `GET /_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` — Setup bypass (runs migrations, creates dev admin)
- `GET /_emdash/api/auth/dev-bypass?redirect=/_emdash/admin` — Auth bypass (assumes setup complete)

These endpoints only work when `import.meta.env.DEV` is true and return 403 in production.

Minimum expectations:

```txt
passkey-first (WebAuthn) login flow
OAuth provider fallbacks (GitHub, Google, AT Protocol)
session expiration with configurable maxAge
secure cookies (SameSite, Secure, HttpOnly)
HTTPS only
logout support
no shared admin accounts
account disable/revoke process
audit login-sensitive events
```

### 7.2 Mobile Authentication Later

For future mobile apps:

```txt
short-lived access token
refresh token rotation
device session table
session revocation
logout endpoint
lost device revocation
rate-limited login
```

### 7.3 Service Accounts

Service accounts must:

- be explicitly created;
- have scoped permissions;
- avoid broad owner privileges;
- rotate credentials;
- be audited;
- be disabled when unused.

---

## 8. Authorization Security

### 8.1 Permission Model

Use the authorization model from Part 5:

```txt
Authentication
  ↓
EmDash baseline permission
  ↓
AWCMS permission registry
  ↓
ABAC policy evaluation
  ↓
Tenant/site/resource condition
  ↓
Allow or deny
```

### 8.2 Deny-by-Default Rule

```txt
No permission means no access.
No matching allow policy means no access.
Explicit deny overrides allow.
```

### 8.3 High-Risk Actions

High-risk actions:

```txt
change policy
assign permission
install module
disable module
delete/restore document
export form submissions
private document download
audit export
hard delete
Cloudflare production deployment
migration execution
```

Controls:

```txt
explicit permission
ABAC allow
audit event
confirmation UI
optional re-authentication
owner approval for critical actions
```

---

## 9. Input Validation and Output Safety

### 9.1 Input Validation

Every API route must validate:

```txt
required fields
type
length
format
allowed values
foreign key/resource existence
permission context
file metadata
```

Recommended validation tool:

```txt
Zod or equivalent schema validation
```

### 9.2 Output Safety

Public output must:

- escape HTML by default;
- sanitize rich text content;
- avoid leaking internal IDs when unnecessary;
- avoid leaking private metadata;
- avoid exposing stack traces;
- use safe error messages.

### 9.3 Rich Content Safety

If rich text/HTML is allowed:

```txt
sanitize allowed tags
strip scripts
strip event handlers
strip unsafe URLs
sanitize iframes/embeds
allowlist domains for embeds
```

---

## 10. Secure Upload Controls

### 10.1 Upload Security Rule

```txt
No file is trusted just because an admin uploaded it.
```

### 10.2 Required Upload Checks

Every upload must check:

1. authentication or public upload policy;
2. permission;
3. tenant/site context;
4. module storage scope;
5. file extension;
6. MIME type;
7. file size;
8. safe filename;
9. storage path;
10. metadata record;
11. malware scanning when available;
12. audit event.

### 10.3 Blocked Extensions by Default

```txt
exe
bat
cmd
sh
php
js
mjs
html
htm
jar
apk
msi
ps1
vbs
scr
```

SVG should be treated carefully. Use only sanitized SVG or restrict SVG upload to trusted administrators.

### 10.4 Safe Public Files

Prefer public downloads as:

```txt
PDF for documents
WebP/JPEG/PNG for images
MP4/WebM for videos
```

### 10.5 Private File Download

Private file flow:

```txt
request download
  ↓
check permission
  ↓
ABAC policy
  ↓
classification check
  ↓
generate signed URL
  ↓
short expiration
  ↓
audit event
```

---

## 11. Audit Logging

### 11.1 Audit Purpose

Audit logging supports:

- accountability;
- incident response;
- compliance evidence;
- debugging;
- abuse investigation;
- governance reporting.

### 11.2 Required Audit Events

```txt
auth.login.success
auth.login.failed
auth.logout
content.created
content.updated
content.published
content.soft_deleted
content.restored
media.upload_requested
media.upload_confirmed
media.deleted
document.created
document.published
document.private_downloaded
form.submitted
form_submission.viewed
form_submission.exported
module.installed
module.enabled
module.disabled
module.upgraded
abac.policy.created
abac.policy.updated
abac.permission.assigned
abac.permission.revoked
plugin.capability.approved
plugin.capability.rejected
security.access_denied
security.rate_limited
security.suspicious_upload
```

### 11.3 Audit Event Fields

```txt
id
tenant_id
site_id
actor_user_id
actor_type
action
resource_type
resource_id
ip_address
user_agent
request_id
metadata_json
created_at
```

### 11.4 Audit Log Protection

Audit logs should be:

- append-only where possible;
- protected from normal deletion;
- searchable by authorized auditors;
- exportable only by authorized users;
- retained according to policy;
- excluded from public APIs.

---

## 12. Privacy and Personal Data Protection

### 12.1 Personal Data Categories

AWCMS-Micro may process:

```txt
name
email
phone number
address
student identity number
parent/guardian contact
document metadata
form submission data
IP address
user agent
login/session metadata
photos/videos
```

Sensitive/high-risk data may include:

```txt
student/child data
private documents
health-related fields if any
identity numbers
financial/payment fields if later added
biometric data if future modules add it
```

### 12.2 Privacy Controls

Minimum privacy controls:

```txt
privacy policy page
consent checkbox for forms when needed
purpose limitation
data minimization
data retention policy
access control
export request process
correction request process
delete/anonymize request process
audit data access
secure backup
incident response process
```

### 12.3 Data Minimization Rule

```txt
Collect only data that is needed for the stated purpose.
```

### 12.4 Form Submission Privacy

Every public form should define:

```txt
purpose
fields collected
retention period
who can access submissions
whether data is sent to third party integrations
contact for correction/deletion requests
```

---

## 13. Indonesian Compliance Alignment

### 13.1 UU No. 27 Tahun 2022 — Pelindungan Data Pribadi

AWCMS-Micro should align with Indonesian personal data protection principles, including:

- personal data processing principles;
- personal data categories;
- data subject rights;
- controller and processor obligations;
- personal data transfer governance;
- administrative sanctions and dispute handling;
- prohibited use of personal data.

Implementation implications:

```txt
privacy policy
consent and lawful basis tracking
purpose limitation
data subject request workflow
access control for personal data
retention and deletion/anonymization
breach/incident response
processor/vendor documentation
```

### 13.2 PP No. 71 Tahun 2019 — Penyelenggaraan Sistem dan Transaksi Elektronik

AWCMS-Micro should align with electronic system governance requirements, including:

- reliability and security of electronic systems;
- system operation responsibility;
- electronic data governance;
- availability and integrity considerations;
- protection of users and electronic information.

Implementation implications:

```txt
secure deployment
logging and audit
backup/restore
incident response
access control
system documentation
operational responsibility
```

### 13.3 Permenkominfo No. 5 Tahun 2020 — PSE Lingkup Privat

If AWCMS-Micro is operated as a private electronic system provider or supports clients who must register as PSE, consider:

- PSE scope and obligations;
- system registration requirements;
- electronic system governance;
- data and access obligations;
- lawful compliance requirements.

Implementation implications:

```txt
operator identity documentation
system description
security documentation
data processing description
incident contact
operational logs
```

### 13.4 Education/School Context

For school websites:

```txt
student data must be minimized
private student files require verification
bulk student lists should not be public
photos/videos should follow consent/policy
student documents should use signed URLs
access should be audited
```

### 13.5 Government/Public-Sector Context

For public-sector portals:

```txt
classify public vs internal documents
track publication responsibility
protect citizen form submissions
preserve audit trail
provide accurate public information
follow local document retention rules
```

---

## 14. ISO Alignment Overview

AWCMS-Micro is not automatically ISO-certified by following this document. However, this document provides a control alignment foundation.

| Standard | Relevance to AWCMS-Micro |
| --- | --- |
| ISO/IEC 27001 | Information Security Management System controls |
| ISO/IEC 27002 | Information security control guidance |
| ISO/IEC 27005 | Information security risk management |
| ISO/IEC 27017 | Cloud security controls |
| ISO/IEC 27018 | Personal data protection in cloud services |
| ISO/IEC 27701 | Privacy Information Management System |
| ISO/IEC 27034 | Application security lifecycle |
| ISO/IEC 20000-1 | IT service management |
| ISO 22301 | Business continuity management |
| ISO/IEC 15408 | Security assurance thinking |

---

## 15. ISO/IEC 27001 Alignment

AWCMS-Micro controls should support:

```txt
information security policy
risk assessment
asset inventory
access control
cryptography and secret management
operations security
communications security
secure system development
supplier/plugin management
incident management
business continuity
compliance evidence
```

Implementation examples:

- maintain asset inventory for domains, databases, R2 buckets, Workers, secrets;
- enforce access control for admin and modules;
- maintain audit logs;
- document risks before new modules;
- run validation before release;
- maintain backup/restore process.

---

## 16. ISO/IEC 27002 Alignment

Relevant control areas:

```txt
identity management
authentication information
access rights provisioning
privileged access management
information classification
secure configuration
logging
malware protection
backup
vulnerability management
secure coding
supplier relationship
```

AWCMS-Micro implementation examples:

- role/permission matrix;
- ABAC evaluator;
- private document classification;
- secure upload allowlist/blocklist;
- audit logs;
- dependency scanning;
- code review for plugin changes.

---

## 17. ISO/IEC 27005 Alignment

Use risk management for:

```txt
new plugin installation
marketplace plugin capability changes
private document modules
mobile API authentication
public form exposure
storage configuration
Cloudflare deployment changes
migration execution
```

Risk register fields:

```txt
risk_id
asset
threat
vulnerability
impact
likelihood
risk_level
control
treatment_owner
status
review_date
```

Example risk:

```txt
Risk: Private document exposed publicly
Asset: student PDF
Impact: high
Likelihood: medium
Controls: signed URL, ABAC, classification, audit log, storage prefix
Residual risk: low/medium
```

---

## 18. ISO/IEC 27017 and 27018 Alignment

Cloud controls should cover:

```txt
Cloudflare account access
least privilege API tokens
separate staging/production
R2 bucket access policies
D1/KV bindings
Worker route restrictions
logging and monitoring
backup/export
cloud provider responsibility documentation
```

Personal data in cloud services should cover:

```txt
where data is stored
who can access it
how long it is retained
how it is deleted/exported
how incidents are handled
```

---

## 19. ISO/IEC 27701 Alignment

Privacy management controls:

```txt
privacy policy
data inventory
purpose of processing
lawful basis/consent record
controller/processor roles
data subject request workflow
retention schedule
third-party sharing record
privacy impact assessment for high-risk modules
```

AWCMS-Micro modules that need privacy review:

```txt
forms
form submissions
mobile API
secure document lookup
kelulusan
CRM/webhook integration
future ERP modules
```

---

## 20. ISO/IEC 27034 Alignment

Application security lifecycle:

```txt
security requirements before coding
secure design review
input validation
authorization tests
secure upload tests
code review
dependency review
e2e tests
release security gate
post-release monitoring
```

Every new module should include:

- security assumptions;
- threat model;
- permission list;
- storage scope;
- test plan;
- rollback plan.

---

## 21. ISO/IEC 20000-1 Alignment

Service management controls:

```txt
incident management
problem management
change management
release management
service availability
service continuity
configuration management
service reporting
```

AWCMS-Micro operational examples:

- GitHub Issues for changes;
- pull request review;
- release notes;
- deployment checklist;
- rollback plan;
- monthly audit review;
- incident log.

---

## 22. ISO 22301 Alignment

Business continuity controls:

```txt
business impact analysis
recovery time objective
recovery point objective
backup schedule
restore testing
incident response team
communication plan
manual workaround
post-incident review
```

Recommended baseline:

| Site Type | RTO | RPO |
| --- | ---: | ---: |
| Landing page | 24 hours | 7 days |
| Company profile | 8–24 hours | 1 day |
| School website | 4–12 hours | 1 day |
| Government portal | 2–8 hours | 1 day or less |
| Secure document service | 1–4 hours | 1 day or less |

---

## 23. ISO/IEC 15408 Alignment

Use ISO/IEC 15408 as security assurance thinking for high-risk components.

High-risk components:

```txt
ABAC evaluator
permission matrix GUI
secure document lookup
mobile authentication
private file signed URL service
marketplace plugin capability gate
```

Assurance practices:

```txt
clear security target
threat assumptions
defined security functions
testable claims
independent review where possible
evidence from tests and audit logs
```

---

## 24. Cloudflare Security Baseline

### 24.1 Account and Access

Controls:

```txt
MFA for Cloudflare accounts
least privilege API tokens
separate tokens for CI/deployment
no shared accounts
rotate tokens when staff changes
store tokens only in secure secrets manager/CI secrets
```

### 24.2 Workers

Controls:

```txt
separate staging and production Workers
environment-specific bindings
no secrets in code
request ID forwarding
CORS allowlist
rate limiting at edge where possible
origin/API validation still required
```

### 24.3 R2

Controls:

```txt
private bucket by default
tenant/site/module object key prefix
signed URL for private files
public access only through approved routes or public bucket policy
object lifecycle policy later
metadata record in database
```

### 24.4 D1/KV

Controls:

```txt
separate staging/production databases
backup/export process
migration review
no direct public write access
KV for cache/config only, not source of truth for sensitive records
```

### 24.5 Turnstile

Use Turnstile or equivalent bot protection for:

```txt
public contact forms
registration forms
complaint forms
secure document verification after suspicious activity
```

---

## 25. Dependency and Supply Chain Security

Controls:

```txt
lockfile committed
review package changes
avoid abandoned packages
prefer official packages
scan dependencies in CI
pin critical dependencies when appropriate
review marketplace plugins
review postinstall scripts
```

Before adding dependency:

```txt
Why is it needed?
Is it maintained?
What permissions does it require?
Does it run code during build?
Can we implement safely without it?
```

---

## 26. Secret Management

### 26.1 Never Commit

Never commit:

```txt
.env
.dev.vars
Cloudflare API tokens
R2 access keys
database credentials
JWT secrets
webhook secrets
private keys
production config with secrets
```

### 26.2 Use `.env.example`

`.env.example` may contain names only:

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
DATABASE_URL=
JWT_SECRET=
WEBHOOK_SECRET=
```

### 26.3 Rotation

Rotate secrets when:

- exposed accidentally;
- employee/contractor leaves;
- integration is replaced;
- suspicion of compromise;
- scheduled policy requires.

---

## 27. Testing Strategy Overview

Testing layers:

EmDash upstream uses **vitest** for unit/integration tests and **Playwright** for e2e tests:

```txt
static checks (oxlint, TypeScript)
unit tests (vitest)
integration tests (vitest with real databases)
API tests
e2e/Playwright tests
security tests
compatibility tests
migration tests
backup/restore tests
performance smoke tests
```

EmDash test utilities available from `tests/utils/test-db.ts`:

- `createTestDatabase()` — fresh SQLite in-memory
- `setupTestDatabase()` — runs migrations
- `setupTestDatabaseWithCollections()` — migrations + standard collections
- `setupTestPostgresDatabase()` — PostgreSQL with per-test schema isolation
- `describeEachDialect(name, fn)` — runs same test against SQLite and PostgreSQL

Each test gets a fresh database in `beforeEach`, destroyed in `afterEach`.

Required before production:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

If scripts differ, use repository-defined equivalents.

---

## 28. Static Checks

Static checks should cover:

```txt
TypeScript type safety
lint rules
formatting
unused exports
unsafe imports
secret scanning
dependency audit
```

Recommended commands:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm audit
```

Use actual available scripts from `package.json`.

---

## 29. Unit Tests

Unit tests should cover:

```txt
permission evaluator
ABAC decision logic
safe filename generation
storage key generation
input validation schemas
API response helpers
SEO fallback logic
content filtering helpers
rate limit helpers
```

Examples:

```txt
- deleted resource is denied
- tenant mismatch is denied
- explicit deny overrides allow
- unsafe filename is sanitized
- private path contains tenant/site/module prefix
```

---

## 30. Integration Tests

Integration tests should cover:

```txt
module install/enable/disable
permission registration
media upload metadata creation
document publish flow
form submission storage
audit event creation
mobile API content filtering
theme setting update
```

Use real database test environment where possible.

---

## 31. API Tests

API tests should cover:

```txt
public content endpoints
admin plugin endpoints
mobile API endpoints
form submission endpoint
upload request/confirm endpoint
private document signed URL endpoint
ABAC evaluate endpoint
```

Required checks:

```txt
valid input succeeds
invalid input fails with validation error
unauthenticated access denied
unauthorized access denied
private data not leaked
soft-deleted data hidden
response contract stable
```

---

## 32. Playwright / E2E Tests

Minimum flows:

```txt
1. admin login;
2. create page;
3. create blog/news post;
4. upload media;
5. create menu item;
6. publish page;
7. visit public page;
8. edit SEO metadata;
9. submit public form;
10. confirm role-based access;
11. verify ABAC deny case;
12. upload public document;
13. verify private document hidden publicly;
14. call mobile bootstrap endpoint;
15. change theme setting;
16. verify audit log entries.
```

Security e2e flows:

```txt
- unauthorized user cannot open admin module page
- direct API access denied without permission
- draft content does not appear publicly
- soft-deleted content does not appear publicly
- private document requires signed URL/verification
```

---

## 33. Security Tests

Security tests should include:

```txt
XSS prevention
CSRF/trusted request enforcement
upload extension blocklist
MIME mismatch handling
path traversal prevention
rate limit test
CORS test
private content leak test
permission bypass test
last-owner lockout prevention
```

Example test cases:

```txt
Upload `test.php` → rejected
Upload `../../file.pdf` → sanitized/rejected
Call DELETE endpoint with GET → rejected/not available
Call private document endpoint as public → denied
Create policy removing last owner → blocked
```

---

## 34. Compatibility Tests

Compatibility tests protect the EmDash update path.

Test:

```txt
EmDash admin opens
EmDash collections still work
EmDash media flow still works
native plugins load
marketplace plugin assumptions preserved
official template assumptions preserved
AWCMS modules do not require EmDash core patch
upstream merge does not break public site
```

Compatibility matrix must be updated after upstream sync.

---

## 35. Migration Tests

Migration tests:

```txt
migrations run on empty database
migrations run on seeded database
migrations do not modify EmDash core unexpectedly
soft delete columns exist in AWCMS custom tables
default tenant seed exists
rollback plan exists
backup required for production migration
```

---

## 36. Backup and Restore Tests

Backup/restore tests:

```txt
database export works
storage inventory/export works
restore to staging works
admin login works after restore
public pages render after restore
private document links still behave correctly
media metadata matches storage objects
```

Quarterly restore test is recommended for important sites.

---

## 37. Release Validation Checklist

Before release:

```txt
[ ] GitHub Issue exists
[ ] branch is dedicated and clean
[ ] AGENTS.md followed
[ ] EmDash compatibility impact reviewed
[ ] security impact reviewed
[ ] privacy impact reviewed
[ ] migration impact reviewed
[ ] rollback plan exists
[ ] .env/secrets not committed
[ ] private uploads not committed
[ ] pnpm lint passed
[ ] pnpm typecheck passed
[ ] pnpm test passed
[ ] pnpm build passed
[ ] pnpm test:e2e passed or documented
[ ] documentation updated
[ ] compatibility matrix updated
[ ] divergence log updated if needed
[ ] release notes prepared
```

---

## 38. Production Deployment Security Gate

Before production deployment:

```txt
[ ] staging deployment tested
[ ] production secrets configured in secure store
[ ] database backup completed
[ ] storage backup/snapshot considered
[ ] Cloudflare routes reviewed
[ ] D1/R2/KV bindings verified
[ ] no debug endpoints exposed
[ ] rate limits reviewed
[ ] WAF/Turnstile rules reviewed
[ ] rollback deployment identified
[ ] monitoring/logging ready
```

---

## 39. Incident Response

### 39.1 Incident Types

```txt
private data exposure
admin account compromise
plugin vulnerability
malicious upload
public website defacement
mobile API leak
Cloudflare token exposure
database migration failure
storage object deletion
availability outage
```

### 39.2 Incident Response Steps

```txt
1. detect and classify incident
2. preserve evidence/logs
3. contain impact
4. disable affected module/plugin if needed
5. revoke/rotate secrets if needed
6. restore service or rollback
7. assess data exposure
8. notify responsible stakeholders
9. document incident timeline
10. apply corrective action
11. update tests and controls
```

### 39.3 Emergency Actions

Possible actions:

```txt
disable public form
disable mobile API endpoint
disable module
revoke user sessions
rotate API token
remove public object access
put site in maintenance mode
rollback deployment
restore backup
```

---

## 40. Logging and Monitoring

Monitor:

```txt
admin login failures
access denied events
rate limit triggers
private document downloads
form submission spikes
upload failures/suspicious files
API error rates
build/deploy failures
Cloudflare Worker errors
storage access anomalies
```

Alert on:

```txt
multiple failed admin logins
high-risk permission changes
private document access spike
module install/disable event
unexpected 5xx increase
suspicious upload attempts
secret scan finding
```

---

## 41. Security Documentation Files

Recommended files:

```txt
docs/security.md
docs/privacy.md
docs/testing.md
docs/incident-response.md
docs/backup-restore.md
docs/risk-register.md
docs/compliance.md
docs/cloudflare-security.md
docs/release-checklist.md
docs/secure-upload.md
```

---

## 42. Practical Implementation Examples

### Example 1 — School Website with Graduation Documents

Security controls:

```txt
private PDFs stored under protected R2 prefix
verification required before download
signed URL expires quickly
rate limit verification attempts
audit every successful and failed access
no public list of student records
```

Tests:

```txt
public user cannot list PDFs
wrong NISN rejected
valid verification creates short session
PDF download creates audit event
expired session denied
```

### Example 2 — Company Website Contact Form

Security controls:

```txt
consent checkbox
spam protection
input validation
submission retention policy
webhook secret
CRM delivery log
```

Tests:

```txt
invalid email rejected
missing consent rejected
spam token required when enabled
submission stored
webhook failure logged
```

### Example 3 — Government Portal Document Publication

Security controls:

```txt
document classification
publication workflow
audit document update and publish
private/internal documents excluded from sitemap
```

Tests:

```txt
public document appears in list
restricted document hidden
soft-deleted document hidden
publish action audited
```

### Example 4 — Mobile API Public Content

Security controls:

```txt
versioned endpoint
CORS allowlist
public-only data filter
rate limit
stable JSON response
```

Tests:

```txt
bootstrap returns contract
posts exclude drafts
documents exclude private items
invalid route returns stable error
```

### Example 5 — ABAC Matrix

Security controls:

```txt
last-owner lockout prevention
high-risk confirmation
policy export/import validation
audit every policy change
default deny
```

Tests:

```txt
editor cannot write policy
owner can write policy
explicit deny overrides allow
removing last owner blocked
policy import dry-run works
```

---

## 43. GitHub Issues for Part 7

### Issue 1 — Add Security Baseline Documentation

```md
## Goal
Document the AWCMS-Micro secure-by-default baseline.

## Tasks
- Add threat model
- Add security controls by layer
- Add authentication and authorization controls
- Add secure upload controls
- Add audit logging baseline

## Validation
- docs/security.md exists
- high-risk actions are listed
- required controls are documented

## Rollback
Revert documentation changes.
```

### Issue 2 — Add Privacy and Compliance Baseline

```md
## Goal
Document Indonesian privacy and electronic system compliance baseline.

## Tasks
- Add UU PDP alignment
- Add PP 71/2019 alignment
- Add PSE Lingkup Privat considerations
- Add privacy policy requirements
- Add consent and retention controls

## Validation
- docs/privacy.md exists
- docs/compliance.md exists
- form privacy requirements are clear

## Rollback
Revert compliance documentation changes.
```

### Issue 3 — Add Secure Upload Policy

```md
## Goal
Define secure upload controls for media/documents/modules.

## Tasks
- Define allowed file types
- Define blocked file types
- Define safe filename strategy
- Define storage scope checks
- Define signed URL requirements
- Define suspicious upload audit events

## Validation
- docs/secure-upload.md exists
- upload policy includes extension/MIME/size checks
- private files require signed URLs

## Rollback
Revert upload policy implementation or disable upload feature.
```

### Issue 4 — Add Testing and Release Gate Checklist

```md
## Goal
Create complete testing and release validation checklist.

## Tasks
- Add static check requirements
- Add unit test requirements
- Add API test requirements
- Add Playwright flows
- Add security tests
- Add release checklist

## Validation
- docs/testing.md exists
- docs/release-checklist.md exists
- required commands are listed

## Rollback
Revert testing documentation or mark pending tests.
```

### Issue 5 — Add Incident Response and Backup/Restore Runbook

```md
## Goal
Document incident response, backup, restore, and continuity procedures.

## Tasks
- Add incident types
- Add response steps
- Add emergency actions
- Add backup/restore test requirements
- Add monitoring/alerting events

## Validation
- docs/incident-response.md exists
- docs/backup-restore.md exists
- emergency module disable path is documented

## Rollback
Revert runbook changes.
```

### Issue 6 — Add ISO Alignment Matrix

```md
## Goal
Map AWCMS-Micro controls to relevant ISO standards.

## Tasks
- Add ISO/IEC 27001 mapping
- Add ISO/IEC 27002 mapping
- Add ISO/IEC 27005 mapping
- Add ISO/IEC 27017/27018 mapping
- Add ISO/IEC 27701 mapping
- Add ISO/IEC 27034 mapping
- Add ISO/IEC 20000-1 mapping
- Add ISO 22301 mapping
- Add ISO/IEC 15408 assurance notes

## Validation
- docs/iso-alignment.md exists
- each standard has relevant control mapping

## Rollback
Revert ISO documentation changes.
```

---

## 44. OpenCode / Antigravity Implementation Prompt for Part 7

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, security engineering, privacy compliance, ISO alignment, testing, Cloudflare security, and DevSecOps implementation agent.

TASK:
Implement Part 7 of the AWCMS-Micro documentation: Security, Compliance, ISO Alignment, and Testing.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Indonesian regulations: UU No. 27 Tahun 2022, PP No. 71 Tahun 2019, Permenkominfo No. 5 Tahun 2020
- ISO standards: ISO/IEC 27001, 27002, 27005, 27017, 27018, 27701, 27034, 20000-1, ISO 22301, ISO/IEC 15408

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/modules.md, docs/abac.md, docs/storage.md, docs/mobile-api.md, and docs/testing.md.
3. Inspect EmDash security, authorization, storage, and plugin conventions before coding.
4. Do not modify EmDash core unless no safe extension path exists.
5. Do not commit secrets, local databases, uploaded files, or production config.
6. Use GitHub Issues for non-trivial work.
7. Create a dedicated branch before implementation.
8. Make atomic changes.
9. Run validation before completion.
10. Preserve EmDash compatibility.

GOAL:
Add the security, compliance, ISO alignment, testing, release gate, and incident response baseline for AWCMS-Micro.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Review existing docs.
- Inspect package scripts.
- Inspect security-sensitive routes/plugins if present.
- Summarize current security gaps.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Add Security Baseline Documentation
2. Add Privacy and Compliance Baseline
3. Add Secure Upload Policy
4. Add Testing and Release Gate Checklist
5. Add Incident Response and Backup/Restore Runbook
6. Add ISO Alignment Matrix

PHASE 2 — BRANCH
Create branch:
docs/add-security-compliance-testing-baseline

PHASE 3 — DOCUMENTATION
Create or update:
- docs/security.md
- docs/privacy.md
- docs/compliance.md
- docs/secure-upload.md
- docs/testing.md
- docs/release-checklist.md
- docs/incident-response.md
- docs/backup-restore.md
- docs/risk-register.md
- docs/cloudflare-security.md
- docs/iso-alignment.md

PHASE 4 — SECURITY BASELINE
Document:
- threat model
- security objectives
- controls by layer
- authentication controls
- authorization controls
- upload controls
- audit logging
- secret management

PHASE 5 — COMPLIANCE BASELINE
Document:
- UU PDP alignment
- PP 71/2019 alignment
- PSE Lingkup Privat considerations
- privacy policy requirements
- consent and retention
- school/public-sector data concerns

PHASE 6 — TESTING BASELINE
Document or implement:
- static checks
- unit tests
- integration tests
- API tests
- Playwright tests
- security tests
- compatibility tests
- migration tests
- backup/restore tests

PHASE 7 — RELEASE GATES
Add:
- release validation checklist
- production deployment security gate
- rollback requirements
- compatibility matrix update rule

PHASE 8 — INCIDENT RESPONSE
Add:
- incident types
- response steps
- emergency actions
- monitoring and alerting baseline

PHASE 9 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm test:e2e if configured

If scripts are missing, document what is pending.

PHASE 10 — COMMIT
Commit:
docs: add security compliance and testing baseline

PHASE 11 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. security impact
5. compliance impact
6. EmDash compatibility impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- changing production Cloudflare resources
- changing authentication or authorization behavior in production
- modifying EmDash core security code
- committing secrets
- running destructive migrations
- deleting logs/backups
- force pushing
```

---

## 45. Definition of Done for Part 7

Part 7 is complete when:

```txt
[ ] security philosophy is documented
[ ] threat model is documented
[ ] security controls by layer are documented
[ ] authentication baseline is documented
[ ] authorization baseline is documented
[ ] secure upload policy is documented
[ ] audit logging baseline is documented
[ ] privacy controls are documented
[ ] Indonesian compliance alignment is documented
[ ] ISO alignment is documented
[ ] Cloudflare security baseline is documented
[ ] dependency and secret management rules are documented
[ ] static/unit/integration/API/e2e/security tests are defined
[ ] release validation checklist exists
[ ] production deployment gate exists
[ ] incident response procedure exists
[ ] backup/restore test requirements exist
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
```

---

## 46. Next Part

Continue with **Part 8 — Cloudflare Deployment and Operational Runbook**.

Part 8 should include:

- Cloudflare Workers deployment;
- D1 setup;
- R2 setup;
- KV setup;
- Turnstile setup;
- environment variables;
- staging vs production;
- CI/CD deployment;
- monitoring;
- rollback;
- backup/restore operations;
- incident response operations;
- monthly maintenance checklist.
