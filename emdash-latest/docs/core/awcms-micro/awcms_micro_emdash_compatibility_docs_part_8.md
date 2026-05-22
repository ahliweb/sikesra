# AWCMS-Micro Implementation Documentation

## Part 8 — Cloudflare Deployment and Operational Runbook

**Document status:** Draft v0.1  
**Purpose:** Define the Cloudflare deployment architecture, operational procedures, rollback strategy, backup/restore plan, monitoring, and maintenance runbook for AWCMS-Micro while preserving EmDash compatibility and AWCMS governance.

---

## 1. Objective of Part 8

Part 8 defines how AWCMS-Micro should be deployed and operated using Cloudflare-first infrastructure.

This document covers:

1. deployment architecture;
2. Cloudflare Workers strategy;
3. D1 database strategy;
4. R2 storage strategy;
5. KV/cache strategy;
6. Turnstile bot protection;
7. environment variables and secrets;
8. staging vs production;
9. CI/CD deployment;
10. monitoring and observability;
11. rollback;
12. backup and restore;
13. incident response operations;
14. monthly maintenance checklist;
15. GitHub Issues;
16. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
AWCMS-Micro should be deployable as a simple website today, while using Cloudflare patterns that can scale toward secure, tenant-ready, multi-channel delivery later.
```

---

## 2. Cloudflare Deployment Philosophy

AWCMS-Micro should use Cloudflare as an edge-first deployment platform where appropriate.

Primary Cloudflare components:

```txt
Cloudflare Workers      = application runtime / API gateway / SSR edge runtime
Cloudflare D1           = lightweight SQL database for Cloudflare-native deployments
Cloudflare R2           = S3-compatible object storage for media and documents
Cloudflare KV           = lightweight cache/config store where appropriate
Cloudflare Turnstile    = bot protection for public forms and sensitive verification
Cloudflare DNS/CDN/WAF  = domain, caching, and edge security
Workers Logs/Tracing    = operational observability
```

AWCMS-Micro must still keep a clean boundary:

```txt
EmDash compatibility first.
Cloudflare deployment second.
AWCMS governance around both.
```

---

## 3. Deployment Architecture

### 3.1 Recommended Cloudflare Production Architecture

```txt
Visitor / Mobile App / Admin User
        ↓
Cloudflare DNS + CDN + WAF
        ↓
Cloudflare Worker / Pages Function
        ↓
AWCMS-Micro / EmDash-compatible runtime
        ↓
Cloudflare D1       Cloudflare R2       Cloudflare KV
(database)          (media/files)       (cache/config)
        ↓
Audit Logs / Worker Logs / Optional Logpush
```

### 3.2 Runtime Roles

| Layer          | Role                                                        |
| -------------- | ----------------------------------------------------------- |
| Cloudflare DNS | Domain routing and DNS management                           |
| Cloudflare CDN | Cache public assets and responses                           |
| Cloudflare WAF | Edge protection and managed rules                           |
| Worker         | SSR/API runtime and gateway logic                           |
| D1             | SQL records, content metadata, settings, module data        |
| R2             | media, documents, private files, backups                    |
| KV             | cache, feature flags, lightweight config, maintenance flags |
| Turnstile      | bot mitigation for forms and verification flows             |
| Workers Logs   | runtime logs, errors, request troubleshooting               |

---

## 4. Deployment Modes

### 4.1 Local Development

Use:

```txt
Node.js
SQLite/local D1 simulation
local uploads folder
local environment variables
```

Goal:

```txt
Fast development without production risk.
```

### 4.2 Staging

Use:

```txt
Cloudflare Worker staging environment
D1 staging database
R2 staging bucket
KV staging namespace
staging domain/subdomain
separate secrets
```

Goal:

```txt
Production-like validation before production release.
```

### 4.3 Production

Use:

```txt
Cloudflare Worker production environment
D1 production database
R2 production bucket
KV production namespace
production domain
production secrets
WAF/rate limiting/Turnstile
```

Goal:

```txt
Stable public service with rollback, observability, and backup discipline.
```

---

## 5. Recommended Environment Naming

Use consistent names:

```txt
local
staging
production
```

Optional:

```txt
dev
preview
qa
production
```

Recommended domain pattern:

```txt
local:       http://127.0.0.1:4321
staging:     staging.example.com
production:  example.com
api staging: api-staging.example.com
api prod:    api.example.com
```

For AWCMS-Micro school websites:

```txt
staging.sman2pangkalanbun.sch.id
sman2pangkalanbun.sch.id
api.sman2pangkalanbun.sch.id
```

---

## 6. Wrangler Configuration Strategy

### 6.1 Recommended Config File

Use:

```txt
wrangler.jsonc (preferred by EmDash upstream)
```

EmDash uses `wrangler.jsonc` (JSON with comments). Run `pnpm wrangler types` to generate `worker-configuration.d.ts` with correct bindings for the current environment.

### 6.2 Cloudflare `astro.config.mjs`

For Cloudflare deployment, the `astro.config.mjs` must use Cloudflare-specific adapters:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import emdash, { r2 } from "emdash/astro";
import { d1 } from "@emdash-cms/cloudflare";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB" }),
			storage: r2({
				binding: "MEDIA_BUCKET",
				publicUrl: "https://cdn.example.com", // optional
			}),
			plugins: [],
		}),
	],
});
```

Note: Sandboxed plugins run via Dynamic Worker Loaders on Cloudflare Workers. These V8 isolates are automatically managed by EmDash's plugin runtime.

### 6.3 Example `wrangler.example.jsonc`

```jsonc
{
	"$schema": "./node_modules/wrangler/config-schema.json",
	"name": "awcms-micro-standard",
	"main": "./dist/_worker.js/index.js",
	"compatibility_date": "2026-05-05",
	"compatibility_flags": ["nodejs_compat"],
	"observability": {
		"enabled": true,
	},
	"vars": {
		"ENVIRONMENT": "staging",
		"PUBLIC_SITE_URL": "https://staging.example.com",
		"AWCMS_DEFAULT_TENANT_ID": "00000000-0000-0000-0000-000000000001",
		"AWCMS_DEFAULT_TENANT_CODE": "default",
		"AWCMS_DEFAULT_SITE_ID": "main",
	},
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "awcms_micro_staging",
			"database_id": "REPLACE_WITH_STAGING_D1_DATABASE_ID",
		},
	],
	"r2_buckets": [
		{
			"binding": "MEDIA_BUCKET",
			"bucket_name": "awcms-micro-staging-media",
		},
	],
	"kv_namespaces": [
		{
			"binding": "AWCMS_KV",
			"id": "REPLACE_WITH_STAGING_KV_NAMESPACE_ID",
		},
	],
	"env": {
		"production": {
			"name": "awcms-micro-standard-production",
			"routes": [
				{
					"pattern": "example.com/*",
					"zone_name": "example.com",
				},
			],
			"vars": {
				"ENVIRONMENT": "production",
				"PUBLIC_SITE_URL": "https://example.com",
				"AWCMS_DEFAULT_TENANT_ID": "00000000-0000-0000-0000-000000000001",
				"AWCMS_DEFAULT_TENANT_CODE": "default",
				"AWCMS_DEFAULT_SITE_ID": "main",
			},
			"d1_databases": [
				{
					"binding": "DB",
					"database_name": "awcms_micro_production",
					"database_id": "REPLACE_WITH_PRODUCTION_D1_DATABASE_ID",
				},
			],
			"r2_buckets": [
				{
					"binding": "MEDIA_BUCKET",
					"bucket_name": "awcms-micro-production-media",
				},
			],
			"kv_namespaces": [
				{
					"binding": "AWCMS_KV",
					"id": "REPLACE_WITH_PRODUCTION_KV_NAMESPACE_ID",
				},
			],
		},
	},
}
```

### 6.3 Wrangler Environment Rule

Bindings and secrets must be configured per environment.

```txt
Do not assume staging bindings automatically apply to production.
```

### 6.4 Secret Rule

Do not put secrets in `vars`.

Use Wrangler secrets or secure CI/CD secrets for:

```txt
JWT_SECRET
TURNSTILE_SECRET_KEY
WEBHOOK_SECRET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
CRM_API_TOKEN
EMAIL_API_KEY
```

---

## 7. Cloudflare Workers Strategy

### 7.1 Worker Responsibilities

The Worker may handle:

- public Astro/SSR requests;
- EmDash-compatible admin runtime;
- plugin API routes;
- mobile API routes;
- media signed URL gateway;
- form submission endpoints;
- secure document verification;
- maintenance mode;
- request ID generation;
- edge caching decisions.

### 7.2 Worker Should Not

The Worker should not:

- expose secrets to client;
- bypass AWCMS/EmDash permission checks;
- mutate data through GET requests;
- serve private R2 objects without authorization;
- cache private responses publicly;
- hide origin/API validation responsibilities.

### 7.3 Deployment Versioning

Use Cloudflare Workers versions/deployments or deployment history where available to reduce production risk.

Recommended release approach:

```txt
Upload/build version
Deploy to staging
Run smoke tests
Deploy to production gradually or directly based on risk
Monitor logs/errors
Rollback if needed
```

---

## 8. D1 Database Strategy

### 8.1 D1 Role

D1 stores:

- content metadata;
- EmDash CMS tables if Cloudflare-native mode is used;
- AWCMS custom module tables;
- module registry;
- document metadata;
- form submissions;
- audit events;
- ABAC policies;
- site settings.

### 8.2 D1 Environments

Use separate databases:

```txt
awcms_micro_local
awcms_micro_staging
awcms_micro_production
```

Do not share staging and production database.

### 8.3 D1 Migration Commands

Example conceptual commands:

```bash
npx wrangler d1 migrations list DB --env staging
npx wrangler d1 migrations apply DB --env staging
npx wrangler d1 migrations apply DB --env production
```

Always verify actual binding name and repository scripts before running.

### 8.4 Migration Rule

Production migration requires:

```txt
[ ] GitHub Issue
[ ] PR reviewed
[ ] staging migration passed
[ ] database backup / Time Travel checkpoint understood
[ ] rollback plan documented
[ ] release window approved for high-risk changes
```

---

## 9. D1 Backup and Restore Strategy

### 9.1 D1 Time Travel

Use Cloudflare D1 Time Travel / point-in-time recovery when available.

Operational rule:

```txt
Before major migration, record current time, database name, deployment version, and git commit.
```

### 9.2 Manual Export Strategy

For additional safety, export important data before major releases.

Examples:

```txt
content export
site settings export
module registry export
ABAC policy export
audit snapshot when needed
```

### 9.3 Restore Scenarios

| Scenario               | Restore Strategy                                         |
| ---------------------- | -------------------------------------------------------- |
| Bad migration          | D1 point-in-time restore or corrective migration         |
| Bad seed               | Restore backup or reverse seed with corrective migration |
| Accidental soft delete | Restore row by clearing `deleted_at`                     |
| Accidental hard delete | Restore from backup/time travel                          |
| Plugin corruption      | Disable plugin and restore affected records              |

### 9.4 Restore Test

At least quarterly for important websites:

```txt
restore staging copy
verify admin login
verify public pages
verify documents
verify forms
verify audit log
```

---

## 10. R2 Storage Strategy

### 10.1 R2 Role

R2 stores:

- media library files;
- public images;
- public documents;
- private documents;
- form attachments;
- secure document PDFs;
- optional backup exports.

### 10.2 Bucket Strategy

Recommended simple strategy:

```txt
awcms-micro-staging-media
awcms-micro-production-media
```

Optional separation:

```txt
awcms-micro-production-public
awcms-micro-production-private
awcms-micro-production-backups
```

### 10.3 Object Key Standard

Single-tenant production:

```txt
tenants/default/sites/main/media/{year}/{month}/{filename}
```

Module-specific:

```txt
tenants/default/sites/main/modules/{module_id}/{year}/{month}/{filename}
```

Future multi-tenant:

```txt
tenants/{tenant_id}/sites/{site_id}/modules/{module_id}/{year}/{month}/{filename}
```

### 10.4 R2 Public Access Rule

```txt
R2 bucket should be private by default.
Public access must be intentionally routed through approved public paths or controlled public bucket settings.
```

### 10.5 R2 Private File Rule

Private files require:

- metadata record;
- permission check;
- ABAC policy check;
- signed URL;
- short expiration;
- audit event.

---

## 11. R2 Lifecycle and Cleanup

### 11.1 Cleanup Targets

Candidates for cleanup:

```txt
expired upload sessions
orphaned temporary files
failed upload objects
old generated image variants
expired backup exports
old log exports
```

### 11.2 Do Not Automatically Delete

Do not automatically delete:

```txt
private documents
student documents
audit-related files
legal documents
published documents
```

unless retention policy explicitly allows it.

### 11.3 Cleanup Rule

```txt
Metadata status should control cleanup.
Storage cleanup should be conservative and auditable.
```

---

## 12. KV Strategy

### 12.1 KV Role

KV may be used for:

- cache metadata;
- feature flags;
- maintenance mode flag;
- lightweight public config;
- rate-limit counters where acceptable;
- mobile bootstrap cache;
- sitemap cache metadata.

### 12.2 KV Should Not Be Used For

Do not use KV as source of truth for:

- personal data;
- form submissions;
- ABAC policies;
- audit logs;
- private document metadata;
- financial/ERP records.

### 12.3 KV Rule

```txt
KV is cache/config support, not the primary database for sensitive records.
```

---

## 13. Turnstile Strategy

### 13.1 Turnstile Use Cases

Use Turnstile for:

- contact forms;
- registration forms;
- complaint forms;
- suspicious secure document verification;
- repeated failed lookup attempts;
- public API abuse mitigation.

### 13.2 Turnstile Server-Side Validation Rule

Client widget alone is not enough.

```txt
The backend must validate Turnstile tokens with Cloudflare Siteverify before accepting protected actions.
```

### 13.3 Token Handling

Turnstile tokens should be treated as:

```txt
short-lived
single-use
validated server-side
not stored longer than needed
```

### 13.4 Turnstile Failure Behavior

If validation fails:

- reject submission;
- show user-friendly message;
- avoid exposing internal errors;
- log failed validation without storing secrets;
- rate-limit repeated failures.

---

## 14. Environment Variables and Secrets

### 14.1 Public Variables

May be configured as non-secret vars:

```txt
ENVIRONMENT
PUBLIC_SITE_URL
PUBLIC_SITE_NAME
AWCMS_DEFAULT_TENANT_ID
AWCMS_DEFAULT_TENANT_CODE
AWCMS_DEFAULT_SITE_ID
```

### 14.2 Secrets

Must be configured as secrets:

```txt
JWT_SECRET
TURNSTILE_SECRET_KEY
WEBHOOK_SECRET
CRM_API_TOKEN
EMAIL_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### 14.3 Local Secret Files

Use local development secret files such as:

```txt
.dev.vars
.dev.vars.staging
.dev.vars.production.example
.env.example
```

Never commit real `.dev.vars`, `.env`, or production secret files.

### 14.4 Secret Rotation

Rotate secrets when:

- accidentally exposed;
- staff/vendor access changes;
- suspicious activity occurs;
- plugin/integration is removed;
- scheduled rotation policy requires.

---

## 15. Staging and Production Separation

### 15.1 Required Separation

Staging and production must have separate:

```txt
Worker name
D1 database
R2 bucket
KV namespace
Turnstile keys
secrets
routes/domains
API tokens
```

### 15.2 Staging Deployment Rule

```txt
Every production release must be tested in staging first unless it is an emergency hotfix.
```

### 15.3 Production Protection

Production changes require:

```txt
GitHub Issue
branch/PR
validation
staging test
backup/restore awareness
rollback plan
approval for high-risk changes
```

---

## 16. CI/CD Strategy

### 16.1 Recommended Pipeline

```txt
Pull Request
  ↓
Install dependencies
  ↓
Lint
  ↓
Typecheck
  ↓
Unit tests
  ↓
Build
  ↓
E2E tests where possible
  ↓
Deploy preview/staging
  ↓
Smoke test
  ↓
Manual approval for production
  ↓
Deploy production
  ↓
Post-deploy smoke test
```

### 16.2 GitHub Actions Secrets

Store in GitHub environment secrets:

```txt
CLOUDFLARE_API_TOKEN_STAGING
CLOUDFLARE_API_TOKEN_PRODUCTION
CLOUDFLARE_ACCOUNT_ID
```

Use separate GitHub Environments:

```txt
staging
production
```

Production environment should require manual approval.

### 16.3 GitHub Actions Example

```yaml
name: Deploy AWCMS-Micro

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  deploy-staging:
    needs: validate
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_STAGING }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_PRODUCTION }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Adjust script names according to the actual repository.

---

## 17. Deployment Commands

### 17.1 Local Development

```bash
pnpm install
pnpm dev
```

For Wrangler local development:

```bash
npx wrangler dev --env staging
```

### 17.2 Staging Deployment

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
npx wrangler deploy --env staging
```

### 17.3 Production Deployment

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
npx wrangler deploy --env production
```

Production deployment should normally run through CI/CD, not local machine.

---

## 18. Pre-Deployment Checklist

Before staging:

```txt
[ ] branch created
[ ] GitHub Issue linked
[ ] AGENTS.md followed
[ ] docs updated
[ ] no secrets committed
[ ] no private uploads committed
[ ] pnpm lint passed
[ ] pnpm typecheck passed
[ ] pnpm test passed
[ ] pnpm build passed
[ ] migration impact reviewed
[ ] Cloudflare bindings checked
```

Before production:

```txt
[ ] staging tested
[ ] database backup/Time Travel point noted
[ ] R2 critical objects safe
[ ] environment secrets configured
[ ] production routes verified
[ ] rollback target known
[ ] post-deploy smoke tests prepared
[ ] owner approval for high-risk change
```

---

## 19. Post-Deployment Smoke Tests

Run after deployment:

```txt
visit homepage
visit news page
visit document page
submit test form in staging
open admin login
verify admin dashboard
verify media route
verify mobile bootstrap endpoint
verify private document is not public
verify Worker logs for errors
```

Example URLs:

```txt
https://example.com/
https://example.com/news
https://example.com/documents
https://example.com/_emdash/admin
https://example.com/api/mobile/v1/bootstrap
```

---

## 20. Observability and Logs

### 20.1 What to Log

Log:

```txt
request_id
route
method
status_code
duration_ms
user_id where authenticated
tenant_id
site_id
module_id
error_code
```

Do not log:

```txt
passwords
secrets
raw tokens
private document contents
full sensitive form payloads
full personal data unnecessarily
```

### 20.2 Workers Logs

Use Workers Logs for:

- runtime errors;
- uncaught exceptions;
- request diagnostics;
- deployment troubleshooting;
- API error visibility.

### 20.3 Tail Workers / Logpush

For larger deployments, consider:

```txt
Tail Workers
Workers Logpush
external observability platform
R2 log archive
```

### 20.4 Alert Conditions

Alert on:

```txt
5xx error spike
admin login failure spike
private document access spike
Turnstile failure spike
suspicious upload attempts
D1 migration failure
Worker deployment failure
module disabled unexpectedly
high-risk permission change
```

---

## 21. Monitoring Dashboard

Recommended dashboard metrics:

```txt
request volume
error rate
latency p50/p95/p99
5xx count
4xx count
form submissions
private document downloads
admin logins
failed admin logins
upload attempts
storage usage
D1 query errors
Worker CPU/errors
```

---

## 22. Rollback Strategy

### 22.1 Worker Rollback

If new deployment breaks:

```txt
Rollback to previous Worker deployment/version.
```

Also:

```txt
check logs
record incident
create corrective issue
avoid repeated blind redeploys
```

### 22.2 Database Rollback

If migration breaks:

Options:

```txt
D1 point-in-time restore
corrective forward migration
restore export backup
feature flag disable
module disable
```

Never run destructive rollback without backup review.

### 22.3 R2 Rollback

If files are wrongly exposed:

```txt
remove public route/access
mark media metadata private/deleted
rotate signed URL secret if needed
review audit logs
restore object if deleted
```

### 22.4 KV Rollback

If bad config cached:

```txt
clear affected KV key
restore previous value
use maintenance mode if needed
```

### 22.5 Module Rollback

If plugin/module breaks:

```txt
disable module
hide admin page
disable API routes
keep data
restore previous module version
write audit event
```

---

## 23. Maintenance Mode

### 23.1 Purpose

Maintenance mode allows temporary public service protection during migration, incident, or emergency repair.

### 23.2 Maintenance Mode Sources

Possible control sources:

```txt
KV flag
site_settings flag
environment variable
emergency Worker route logic
```

### 23.3 Maintenance Mode Behavior

Public routes:

```txt
show friendly maintenance page
return 503 with Retry-After where appropriate
```

Admin routes:

```txt
allow owner/admin access if safe
block non-essential actions during migration
```

Mobile API:

```json
{
	"success": false,
	"error": {
		"code": "MAINTENANCE_MODE",
		"message": "Service is temporarily unavailable."
	}
}
```

---

## 24. Backup and Restore Operations

### 24.1 Backup Items

Backup:

```txt
D1 database
R2 media/documents
KV important config
module manifests/settings
ABAC policies
site settings
content export
wrangler config without secrets
```

### 24.2 Pre-Migration Backup Checklist

```txt
[ ] record git commit
[ ] record current Worker deployment/version
[ ] record D1 database name/id
[ ] record current timestamp
[ ] export critical policy/settings data
[ ] verify R2 critical bucket status
[ ] confirm rollback command/path
```

### 24.3 Restore Drill

Quarterly for important sites:

```txt
restore database to staging
verify admin login
verify public pages
verify media files
verify documents
verify forms
verify mobile API
verify audit logs
record result
```

---

## 25. Operational Runbook

### 25.1 Daily Checks

For active production sites:

```txt
check site homepage
check admin availability
check Worker error logs
check form submission errors
check suspicious uploads
check critical alerts
```

### 25.2 Weekly Checks

```txt
review deployment status
review failed logins
review audit events
review storage usage
review form spam
review dependency update notices
review unresolved GitHub Issues
```

### 25.3 Monthly Checks

```txt
review Cloudflare account users and tokens
review secrets rotation needs
review backup status
review restore readiness
review module list and versions
review marketplace plugin capabilities
review ABAC high-risk permissions
review privacy/data retention tasks
review performance metrics
```

### 25.4 Quarterly Checks

```txt
perform restore drill
review incident response plan
review ISO/security alignment
review risk register
review Cloudflare billing/usage
review tenant/site storage quota plan
review major dependency upgrades
```

---

## 26. Incident Operations

### 26.1 Common Incidents

```txt
site down
admin inaccessible
bad deployment
D1 migration failure
private document exposed
R2 object deleted
form spam attack
mobile API leaking private data
plugin vulnerability
Cloudflare token exposed
```

### 26.2 Response Pattern

```txt
Detect
  ↓
Classify severity
  ↓
Contain
  ↓
Preserve logs/evidence
  ↓
Rollback or disable affected feature
  ↓
Restore service
  ↓
Assess data exposure
  ↓
Notify stakeholders where required
  ↓
Create corrective GitHub Issue
  ↓
Post-incident review
```

### 26.3 Severity Levels

| Severity | Example                            | Response                                     |
| -------- | ---------------------------------- | -------------------------------------------- |
| SEV-1    | private data exposure, full outage | immediate containment and owner notification |
| SEV-2    | admin broken, major feature down   | rollback or hotfix quickly                   |
| SEV-3    | non-critical page/module issue     | fix in normal sprint                         |
| SEV-4    | documentation/cosmetic issue       | backlog                                      |

---

## 27. Domain and DNS Strategy

### 27.1 Recommended DNS Records

```txt
example.com              → production site
www.example.com          → redirect/canonical
staging.example.com      → staging site
api.example.com          → API/mobile gateway if separated
media.example.com        → approved public media route if needed
```

### 27.2 Canonical URL Rule

```txt
Choose one canonical production domain and redirect alternatives to it.
```

### 27.3 DNS Safety

Before changing DNS:

```txt
[ ] current records exported/screenshot
[ ] TTL reviewed
[ ] rollback record known
[ ] staging tested
[ ] SSL/TLS active
```

---

## 28. SSL/TLS and Headers

### 28.1 SSL/TLS

Use HTTPS only.

Recommended:

```txt
Full/strict TLS mode where applicable
redirect HTTP to HTTPS
HSTS when ready
```

### 28.2 Security Headers

Recommended headers:

```txt
Strict-Transport-Security
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
X-Frame-Options or CSP frame-ancestors
```

### 28.3 CSP Rule

Start with a practical CSP and tighten gradually.

Be careful with:

- admin scripts;
- plugin UI;
- external fonts;
- analytics;
- embedded media;
- Turnstile.

---

## 29. Cache Strategy

### 29.1 Cache Public Content

Cache:

```txt
public pages
public media
static assets
public API responses where safe
```

### 29.2 Do Not Publicly Cache

Do not cache publicly:

```txt
admin pages
authenticated responses
private document signed URLs
form submission responses
ABAC policy responses
user-specific mobile API responses
```

### 29.3 Cache Invalidation

Invalidate or bypass cache when:

```txt
content published
content deleted/restored
theme changed
site settings changed
navigation changed
document visibility changed
```

---

## 30. Performance Operations

Monitor:

```txt
Worker response time
D1 query time
R2 object latency
cache hit rate
large media files
build time
bundle size
mobile API payload size
```

Optimizations:

```txt
image compression
responsive images
edge cache public content
cursor pagination
avoid overfetching
cache mobile bootstrap
precompute sitemap
lazy-load admin modules
```

---

## 31. Cost and Quota Monitoring

Track:

```txt
Worker requests
D1 reads/writes/storage
R2 storage and operations
KV reads/writes/storage
Turnstile usage
Logpush/log storage
bandwidth/cache behavior
```

Monthly review:

```txt
compare usage to expected traffic
identify expensive endpoints
review media growth
review backup size
review unused resources
```

---

## 32. GitHub Issues for Part 8

### Issue 1 — Add Cloudflare Deployment Architecture

```md
## Goal

Document Cloudflare deployment architecture for AWCMS-Micro.

## Tasks

- Define Workers role
- Define D1 role
- Define R2 role
- Define KV role
- Define Turnstile role
- Define staging/production separation

## Validation

- docs/deployment.md updated
- architecture diagram exists
- no production resources changed

## Rollback

Revert documentation changes.
```

### Issue 2 — Add Wrangler Example Configuration

```md
## Goal

Create safe example Wrangler configuration.

## Tasks

- Add wrangler.example.jsonc
- Add staging and production examples
- Add D1 binding placeholders
- Add R2 binding placeholders
- Add KV binding placeholders
- Add required secrets list

## Validation

- no real IDs/secrets committed
- config is clearly marked example
- .gitignore excludes local secret files

## Rollback

Remove example config.
```

### Issue 3 — Add Cloudflare Environment and Secret Policy

```md
## Goal

Document environment and secret handling for Cloudflare deployment.

## Tasks

- Define public vars
- Define secrets
- Define local .dev.vars usage
- Define staging/production separation
- Define secret rotation rule

## Validation

- docs/cloudflare-security.md updated
- .env.example updated
- no secrets committed

## Rollback

Revert docs and example env changes.
```

### Issue 4 — Add CI/CD Deployment Baseline

```md
## Goal

Add GitHub Actions deployment baseline.

## Tasks

- Add validation job
- Add staging deployment job
- Add production deployment job with environment approval
- Document required GitHub secrets
- Document rollback process

## Validation

- workflow uses secrets, not hardcoded tokens
- production requires approval
- validation runs before deployment

## Rollback

Disable workflow or revert workflow file.
```

### Issue 5 — Add Backup and Restore Runbook

```md
## Goal

Document backup and restore operations for D1, R2, KV, and module data.

## Tasks

- Add pre-migration backup checklist
- Add D1 restore strategy
- Add R2 restore strategy
- Add quarterly restore drill
- Add post-restore validation

## Validation

- docs/backup-restore.md updated
- restore checklist exists
- migration checklist references backup

## Rollback

Revert documentation changes.
```

### Issue 6 — Add Monitoring and Incident Operations Runbook

```md
## Goal

Define operational monitoring and incident handling.

## Tasks

- Define logs to monitor
- Define alert conditions
- Define incident severity levels
- Define emergency actions
- Define post-incident review
- Define monthly maintenance checklist

## Validation

- docs/incident-response.md updated
- docs/operations.md updated
- monitoring events are listed

## Rollback

Revert runbook changes.
```

---

## 33. OpenCode / Antigravity Implementation Prompt for Part 8

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, Cloudflare Workers, D1, R2, KV, Turnstile, CI/CD, security, and operations implementation agent.

TASK:
Implement Part 8 of the AWCMS-Micro documentation: Cloudflare Deployment and Operational Runbook.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Official Cloudflare Workers, D1, R2, KV, Turnstile, and Wrangler documentation

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/security.md, docs/storage.md, docs/testing.md, docs/deployment.md, and docs/rollback.md.
3. Inspect existing Wrangler/Cloudflare config if present.
4. Do not modify production Cloudflare resources without explicit approval.
5. Do not commit secrets, `.dev.vars`, `.env`, local databases, uploaded files, or production credentials.
6. Use GitHub Issues for non-trivial work.
7. Create a dedicated branch before implementation.
8. Make atomic changes.
9. Run validation before completion.
10. Preserve EmDash compatibility.

GOAL:
Add Cloudflare deployment architecture, example configuration, environment/secrets policy, CI/CD baseline, backup/restore runbook, monitoring, incident response operations, and maintenance checklist for AWCMS-Micro.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect existing docs.
- Inspect package scripts.
- Inspect Cloudflare/Wrangler config if present.
- Inspect SMAN 2 reference repo only for deployment patterns.
- Summarize deployment risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Add Cloudflare Deployment Architecture
2. Add Wrangler Example Configuration
3. Add Cloudflare Environment and Secret Policy
4. Add CI/CD Deployment Baseline
5. Add Backup and Restore Runbook
6. Add Monitoring and Incident Operations Runbook

PHASE 2 — BRANCH
Create branch:
docs/add-cloudflare-deployment-runbook

PHASE 3 — DOCUMENTATION
Create or update:
- docs/deployment.md
- docs/cloudflare-security.md
- docs/operations.md
- docs/backup-restore.md
- docs/incident-response.md
- docs/release-checklist.md
- docs/rollback.md

PHASE 4 — WRANGLER EXAMPLE
Add:
- wrangler.example.jsonc

Requirements:
- placeholders only
- staging and production examples
- no real Cloudflare IDs
- no secrets
- D1/R2/KV bindings shown safely
- observability enabled as example

PHASE 5 — ENVIRONMENT EXAMPLES
Update:
- .env.example
- .gitignore

Ensure `.dev.vars*` and `.env*` are ignored except `.env.example`.

PHASE 6 — CI/CD BASELINE
If repository uses GitHub Actions, add example workflow under:
.github/workflows/deploy-cloudflare.example.yml

Do not enable production deployment automatically unless requested.
Use environment approval for production.

PHASE 7 — BACKUP/RESTORE RUNBOOK
Document:
- D1 Time Travel / restore strategy
- manual export strategy
- R2 restore strategy
- KV restore strategy
- pre-migration checklist
- quarterly restore drill

PHASE 8 — MONITORING/INCIDENT RUNBOOK
Document:
- Workers Logs
- alert conditions
- incident severity levels
- emergency actions
- post-incident review
- daily/weekly/monthly/quarterly maintenance

PHASE 9 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 10 — COMMIT
Commit:
docs: add Cloudflare deployment and operations runbook

PHASE 11 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. Cloudflare deployment impact
5. security impact
6. EmDash compatibility impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- deploying to Cloudflare production
- creating/deleting D1/R2/KV production resources
- changing DNS records
- changing production routes
- committing real Cloudflare IDs/secrets
- running production migrations
- deleting backups/logs
- force pushing
```

---

## 34. Definition of Done for Part 8

Part 8 is complete when:

```txt
[ ] Cloudflare deployment architecture is documented
[ ] Workers strategy is documented
[ ] D1 strategy is documented
[ ] R2 strategy is documented
[ ] KV strategy is documented
[ ] Turnstile strategy is documented
[ ] environment and secret rules are documented
[ ] staging/production separation is documented
[ ] wrangler.example.jsonc exists or is specified
[ ] CI/CD baseline is documented
[ ] pre-deployment checklist exists
[ ] post-deployment smoke tests exist
[ ] observability/logging strategy exists
[ ] rollback strategy exists
[ ] backup/restore operations exist
[ ] incident operations exist
[ ] DNS/TLS/header strategy exists
[ ] cache/performance/cost monitoring is documented
[ ] maintenance checklist exists
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
```

---

## 35. Documentation Series Completion Note

Parts 1–8 now define a complete AWCMS-Micro implementation guidance series:

```txt
Part 1 — EmDash Compatibility Architecture and Governance
Part 2 — Repository Structure and Initial Implementation
Part 3 — Database, Tenancy, Soft Delete, and Storage
Part 4 — Plugin and Module System
Part 5 — ABAC and Permission Matrix GUI
Part 6 — Admin, Public Frontend, Mobile API, and Theme System
Part 7 — Security, Compliance, ISO Alignment, and Testing
Part 8 — Cloudflare Deployment and Operational Runbook
```

Recommended next documentation after Part 8:

```txt
Part 9 — MVP Implementation Sprint Plan and GitHub Issue Backlog
Part 10 — AWCMS-Micro Standard Website Template Specification
Part 11 — School Website Template and Kelulusan Module Implementation
Part 12 — Mobile API SDK and Flutter Client Integration
```
