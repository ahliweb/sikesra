# AWCMS-Micro Implementation Documentation

## Part 15 — AWCMS-Micro Implementation Master Index and Final Roadmap

**Document status:** Draft v0.1  
**Purpose:** Provide the master index, consolidated roadmap, repository execution order, documentation index, MVP checklist, post-MVP checklist, AI-agent prompt index, GitHub Issue index, and final implementation guidance for AWCMS-Micro.

---

## 1. Objective of Part 15

Part 15 consolidates Parts 1–14 into one implementation master index and final roadmap.

For this self-contained SIKESRA deployment, also read `docs/core/SIKESRA_INTEGRATION_OVERLAY.md`. The overlay maps every generic core part to the current runtime: local `src/` plugin source, hybrid worker wrapper, SIKESRA D1/R2 bindings, EmDash admin delegation, postbuild sidebar adapter, and repository-specific build/deploy commands.

This document helps the implementation team answer:

1. What has been documented?
2. What should be implemented first?
3. Which documentation file should be created or updated?
4. Which GitHub Issues should be opened?
5. Which AI-agent prompt should be used?
6. What is MVP and what is post-MVP?
7. How do we preserve EmDash compatibility?
8. How do we avoid scope creep?
9. How do we validate completion?

The main principle:

```txt
AWCMS-Micro must be built as a disciplined, EmDash-compatible, single-tenant-first website system that is structurally ready for future multi-tenant and multi-application expansion.
```

---

## 2. Final Product Definition

AWCMS-Micro is:

```txt
single-tenant-first website system
+ EmDash-based architecture
+ AWCMS governance
+ tenant-ready database design
+ plugin/module discipline
+ Cloudflare-ready deployment
+ future upgrade path to multi-tenant and multi-application platform
```

AWCMS-Micro is not:

```txt
AWCMS-Mini
full Odoo clone
full ERP in MVP
fragile EmDash fork
static-only website builder
unstructured client-specific website
```

AWCMS-Micro should become:

```txt
A standard website operating system for schools, companies, foundations, public portals, landing pages, and lightweight digital services.
```

---

## 3. Master Rule

The most important rule for all development:

```txt
Track EmDash upstream continuously, but isolate AWCMS-Micro custom behavior in adapters, modules, plugins, themes, permissions, tenancy layers, docs, and tests.
```

Do not modify EmDash core unless:

```txt
1. no safe extension path exists;
2. the reason is documented;
3. the divergence log is updated;
4. compatibility tests are added;
5. rollback is documented.
```

---

## 4. Canonical EmDash Resources

All AWCMS-Micro development must reference these canonical upstream sources:

| Resource | URL |
| --- | --- |
| EmDash Repository | `https://github.com/emdash-cms/emdash` |
| EmDash Docs | `https://docs.emdashcms.com/` |
| EmDash AI Index | `https://docs.emdashcms.com/llms.txt` |
| EmDash Docs MCP | `https://docs.emdashcms.com/docs-mcp/` |
| EmDash AGENTS.md | `https://github.com/emdash-cms/emdash/blob/main/AGENTS.md` |

### Table Naming Convention Summary

```txt
_emdash_*   System tables (EmDash internal, do not modify)
ec_*        Content collection tables (EmDash managed, e.g., ec_posts, ec_pages)
awcms_*     AWCMS-Micro custom module tables (governance, ERP-ready, tenant-ready)
```

### Key Technical Standards

```txt
Astro 6+ required
Import: emdash/astro (integration), emdash/db (database adapters)
Auth: Passkey-first (WebAuthn) with OAuth and magic link fallbacks
Content: Portable Text (structured JSON via TipTap editor)
Plugins: definePlugin() API, Native and Sandboxed modes
Toolchain: oxfmt, oxlint, vitest, tsdown, Playwright
```

---

## 5. Documentation Series Index

The AWCMS-Micro implementation documentation series consists of:

```txt
Part 1  — EmDash Compatibility Architecture and Governance
Part 2  — Repository Structure and Initial Implementation
Part 3  — Database, Tenancy, Soft Delete, and Storage
Part 4  — Plugin and Module System
Part 5  — ABAC and Permission Matrix GUI
Part 6  — Admin, Public Frontend, Mobile API, and Theme System
Part 7  — Security, Compliance, ISO Alignment, and Testing
Part 8  — Cloudflare Deployment and Operational Runbook
Part 9  — MVP Implementation Sprint Plan and GitHub Issue Backlog
Part 10 — AWCMS-Micro Standard Website Template Specification
Part 11 — School Website Template and Kelulusan Module Implementation
Part 12 — Mobile API SDK and Flutter Client Integration
Part 13 — AWCMS-Micro ERP-Ready Module Expansion Strategy
Part 14 — EmDash Upstream Sync and Compatibility Maintenance Playbook
Part 15 — AWCMS-Micro Implementation Master Index and Final Roadmap
```

---

## 6. Summary of Parts 1–14

### Part 1 — EmDash Compatibility Architecture and Governance

Defines:

- EmDash as upstream authority;
- AWCMS-Micro as governed implementation;
- compatibility rules;
- extension-first strategy;
- divergence discipline;
- architecture boundaries.

Main output:

```txt
AWCMS-Micro must remain updateable with EmDash.
```

### Part 2 — Repository Structure and Initial Implementation

Defines:

- repository layout;
- AGENTS.md;
- README.md;
- package/workspace strategy;
- docs folder;
- sites/main;
- packages/awcms;
- packages/plugins;
- validation scripts.

Main output:

```txt
A clean repository foundation that isolates custom AWCMS layers.
```

### Part 3 — Database, Tenancy, Soft Delete, and Storage

Defines:

- default tenant;
- default site;
- tenant-ready table standards;
- soft delete;
- media metadata;
- document metadata;
- secure upload;
- R2/S3 path discipline;
- backup/restore.

Main output:

```txt
Single-tenant operation with multi-tenant-ready data structure.
```

### Part 4 — Plugin and Module System

Defines:

- plugin vs module boundary;
- module manifest;
- module registry;
- lifecycle;
- capabilities;
- storage scopes;
- marketplace compatibility;
- plugin risk classification.

Main output:

```txt
Every feature must be explicit, versioned, permission-aware, tenant-ready, and documented.
```

### Part 5 — ABAC and Permission Matrix GUI

Defines:

- RBAC vs ABAC;
- permission registry;
- policy model;
- evaluator;
- permission matrix GUI;
- effective access preview;
- audit events;
- high-risk access controls.

Main output:

```txt
Authorization is layered: EmDash permission + AWCMS permission + ABAC policy.
```

### Part 6 — Admin, Public Frontend, Mobile API, and Theme System

Defines:

- EmDash-compatible admin;
- Astro public frontend;
- role-aware menu;
- mobile API plugin;
- theme/layout manager;
- template compatibility;
- SEO;
- public content filtering.

Main output:

```txt
Website-first system with controlled admin, public, mobile, and theme layers.
```

### Part 7 — Security, Compliance, ISO Alignment, and Testing

Defines:

- secure-by-default baseline;
- threat model;
- Indonesian compliance alignment;
- ISO alignment;
- secure upload;
- audit logging;
- testing strategy;
- release gates;
- incident response.

Main output:

```txt
Security, privacy, testing, and compliance are required parts of MVP, not optional add-ons.
```

### Part 8 — Cloudflare Deployment and Operational Runbook

Defines:

- Workers;
- D1;
- R2;
- KV;
- Turnstile;
- Wrangler config;
- staging vs production;
- CI/CD;
- monitoring;
- rollback;
- operations checklist.

Main output:

```txt
Cloudflare deployment must be environment-separated, observable, and rollback-ready.
```

### Part 9 — MVP Implementation Sprint Plan and GitHub Issue Backlog

Defines:

- MVP milestones;
- sprint model;
- dependency map;
- GitHub labels;
- GitHub milestones;
- atomic issues;
- release gates;
- risk register.

Main output:

```txt
Build in small, reversible, testable increments through GitHub Issues.
```

### Part 10 — AWCMS-Micro Standard Website Template Specification

Defines:

- template philosophy;
- template manifest;
- standard layout;
- reusable sections;
- seed data;
- school/company/foundation/government/landing variants;
- SEO and accessibility.

Main output:

```txt
Templates must be reusable, client-neutral, safe, and EmDash-compatible.
```

### Part 11 — School Website Template and Kelulusan Module Implementation

Defines:

- school template;
- school content model;
- teacher/staff directory;
- academic calendar;
- Kelulusan module;
- NISN verification;
- R2 PDF storage;
- signed URL;
- audit and privacy controls.

Main output:

```txt
School websites may publish public information, but student-private data must be protected.
```

### Part 12 — Mobile API SDK and Flutter Client Integration

Defines:

- Mobile API contract;
- Flutter SDK;
- Flutter app structure;
- bootstrap endpoint;
- public content endpoints;
- Kelulusan mobile flow;
- future auth/session;
- offline cache;
- testing.

Main output:

```txt
Mobile apps consume stable AWCMS-Micro Mobile API, not EmDash admin APIs.
```

### Part 13 — AWCMS-Micro ERP-Ready Module Expansion Strategy

Defines:

- ERP-ready boundary;
- Odoo-inspired module thinking;
- future CRM/sales/inventory/procurement/HR/project modules;
- Odoo integration;
- workflow/approval;
- post-MVP roadmap.

Main output:

```txt
AWCMS-Micro is ERP-ready, not ERP-heavy in MVP.
```

### Part 14 — EmDash Upstream Sync and Compatibility Maintenance Playbook

Defines:

- upstream remote;
- sync frequency;
- adopt/adapt/delay/reject framework;
- compatibility matrix;
- divergence log;
- plugin/template tests;
- rollback from bad sync.

Main output:

```txt
AWCMS-Micro must remain maintainable and updateable with original EmDash.
```

---

## 7. Recommended Repository Structure

Final recommended structure:

```txt
awcms-micro/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  .gitignore
  .env.example
  wrangler.example.jsonc

  docs/
    architecture.md
    upstream-sync.md
    compatibility-matrix.md
    divergence-log.md
    repository-structure.md
    database-tenancy-storage.md
    modules.md
    abac.md
    admin.md
    frontend.md
    mobile-api.md
    flutter-client.md
    theme-system.md
    template-system.md
    standard-template.md
    school-template.md
    kelulusan.md
    erp-ready-strategy.md
    security.md
    privacy.md
    compliance.md
    iso-alignment.md
    testing.md
    deployment.md
    cloudflare-security.md
    backup-restore.md
    incident-response.md
    operations.md
    rollback.md
    release-checklist.md
    mvp-sprint-plan.md
    github-backlog.md
    risk-register.md

  sites/
    main/
      package.json
      astro.config.mjs
      src/
        pages/
        layouts/
        components/
        styles/
        services/
        live.config.ts
      public/

  packages/
    awcms/
      compatibility/
      tenancy/
      permissions/
      module-registry/
      audit/
      storage/
      theme-standard/

    plugins/
      audit-log/
      documents/
      forms/
      mobile-api/
      abac-matrix/
      kelulusan/

    flutter/
      awcms_micro_client/

  templates/
    standard/
    school/
    company/
    foundation/
    government-portal/
    landing-page/
    secure-document-publication/

  apps/
    flutter/
      school_app/

  tests/
    unit/
    integration/
    e2e/
    security/
    compatibility/

  scripts/
    validate.sh
    upstream-sync-check.sh
```

---

## 8. Execution Order: From Empty Repository to MVP

### Phase 0 — Prepare Repository Governance

Implement:

```txt
AGENTS.md
README.md
.gitignore
.env.example
package.json
pnpm-workspace.yaml
docs base folder
GitHub labels
GitHub milestones
GitHub issue template
```

Purpose:

```txt
Make repository safe, organized, and AI-agent-ready.
```

### Phase 1 — EmDash Compatibility Foundation

Implement:

```txt
docs/architecture.md
docs/upstream-sync.md
docs/compatibility-matrix.md
docs/divergence-log.md
docs/rollback.md
docs/testing.md
```

Purpose:

```txt
Prevent fragile fork from the beginning.
```

### Phase 2 — Local Development Baseline

Implement:

```txt
sites/main
Astro config
local scripts
validation scripts
safe env examples
```

Purpose:

```txt
Make AWCMS-Micro runnable and buildable locally.
```

### Phase 3 — Standard Public Website Shell

Implement:

```txt
BaseLayout
Header
Footer
Homepage
global CSS
design tokens
theme manifest
```

Purpose:

```txt
Create reusable standard website frontend.
```

### Phase 4 — Core Website Content

Implement:

```txt
site settings
pages strategy
news strategy
announcements strategy
menus strategy
public content filtering
SEO baseline
```

Purpose:

```txt
Enable standard school/company/foundation/government websites.
```

### Phase 5 — Interaction Modules

Implement:

```txt
media policy
documents module baseline
forms module baseline
secure upload policy
privacy/consent baseline
```

Purpose:

```txt
Enable real website operations: uploads, downloads, and form submissions.
```

### Phase 6 — Governance Layer

Implement:

```txt
default tenant/site
audit log baseline
module registry baseline
permission registry baseline
soft delete strategy
```

Purpose:

```txt
Prepare for secure modules, future ABAC, and multi-tenant upgrade.
```

### Phase 7 — Security and Testing

Implement:

```txt
security baseline
privacy/compliance docs
ISO alignment
unit/integration/e2e test plan
release checklist
incident response
backup/restore
```

Purpose:

```txt
Make the system safe to use for real organizations.
```

### Phase 8 — Cloudflare Staging Deployment

Implement:

```txt
wrangler.example.jsonc
Cloudflare deployment docs
D1/R2/KV/Turnstile strategy
staging/prod separation
CI/CD example
operations runbook
```

Purpose:

```txt
Make deployment repeatable and rollback-ready.
```

### Phase 9 — Template and School Use Case

Implement:

```txt
standard template
school template
Kelulusan module baseline
secure document publication
testing and privacy controls
```

Purpose:

```txt
Provide a realistic first market implementation.
```

### Phase 10 — Mobile and Post-MVP Expansion

Implement later:

```txt
mobile API plugin
Flutter SDK
Flutter school app
ERP-ready docs
Odoo/Kommo/payment integration adapters
```

Purpose:

```txt
Expand after MVP is stable.
```

---

## 9. MVP Checklist

The MVP should be considered complete only when:

```txt
[ ] AGENTS.md exists and is followed
[ ] EmDash upstream repository is documented
[ ] official EmDash docs are referenced
[ ] upstream sync policy exists
[ ] compatibility matrix exists
[ ] divergence log exists
[ ] repository structure is clean
[ ] local development path exists
[ ] public website shell exists
[ ] standard theme baseline exists
[ ] pages/news/announcements/menu strategy exists
[ ] media policy exists
[ ] documents module baseline exists
[ ] forms module baseline exists
[ ] SEO baseline exists
[ ] default tenant/site exists or is documented
[ ] soft delete strategy exists
[ ] storage path policy exists
[ ] audit log baseline exists
[ ] module registry baseline exists
[ ] security baseline exists
[ ] privacy/compliance baseline exists
[ ] testing strategy exists
[ ] Cloudflare staging deployment docs exist
[ ] rollback plan exists
[ ] GitHub Issues and milestones exist
[ ] validation commands are defined
[ ] no secrets/private uploads/private data are committed
```

---

## 10. MVP Non-Goals

Do not implement in MVP:

```txt
full ERP
full accounting
full HR/payroll
full procurement
full inventory
complex workflow engine
marketplace publishing
multi-tenant SaaS billing
advanced visual builder
AI content automation
complex mobile authentication
production Odoo sync
production payment accounting
```

These are post-MVP modules or integrations.

---

## 11. Post-MVP Checklist

After MVP is stable, continue with:

```txt
[ ] ABAC Matrix GUI implementation
[ ] secure document lookup module
[ ] Kelulusan module production hardening
[ ] school template production polish
[ ] mobile API v1 implementation
[ ] Flutter SDK
[ ] Flutter school app
[ ] webhook notifier
[ ] Kommo integration
[ ] Odoo integration adapter
[ ] payment event logging
[ ] workflow/approval baseline
[ ] tenant domain mapping
[ ] storage quota tracking
[ ] tenant backup strategy
[ ] plugin marketplace compatibility gate
[ ] additional templates
```

---

## 12. Documentation File Index

### Architecture and Governance

```txt
docs/architecture.md
docs/upstream-sync.md
docs/compatibility-matrix.md
docs/divergence-log.md
docs/rollback.md
```

### Database, Storage, and Tenancy

```txt
docs/database-tenancy-storage.md
docs/tenancy.md
docs/storage.md
docs/secure-upload.md
docs/backup-restore.md
```

### Modules and Permissions

```txt
docs/modules.md
docs/abac.md
docs/permissions.md
docs/module-registry.md
```

### Admin, Frontend, and Templates

```txt
docs/admin.md
docs/frontend.md
docs/theme-system.md
docs/template-system.md
docs/standard-template.md
docs/school-template.md
```

### Mobile and Flutter

```txt
docs/mobile-api.md
docs/mobile-sdk.md
docs/flutter-client.md
```

### Security and Compliance

```txt
docs/security.md
docs/privacy.md
docs/compliance.md
docs/iso-alignment.md
docs/incident-response.md
```

### Deployment and Operations

```txt
docs/deployment.md
docs/cloudflare-security.md
docs/operations.md
docs/release-checklist.md
```

### Product Roadmap

```txt
docs/mvp-sprint-plan.md
docs/github-backlog.md
docs/risk-register.md
docs/erp-ready-strategy.md
```

### Specific Modules

```txt
docs/kelulusan.md
docs/secure-document-publication.md
docs/student-data-protection.md
```

---

## 13. AI-Agent Prompt Index

Use the prompt from the corresponding part based on implementation need.

| Need | Use Prompt From |
| --- | --- |
| Overall architecture | Part 1 |
| Initial repo setup | Part 2 |
| Database/storage/tenant baseline | Part 3 |
| Plugin/module system | Part 4 |
| ABAC and permission matrix | Part 5 |
| Admin/public/mobile/theme | Part 6 |
| Security/compliance/testing | Part 7 |
| Cloudflare deployment | Part 8 |
| Sprint planning/backlog | Part 9 |
| Standard website template | Part 10 |
| School template/Kelulusan | Part 11 |
| Mobile API/Flutter | Part 12 |
| ERP-ready roadmap | Part 13 |
| Upstream sync | Part 14 |

### 12.1 Universal AI-Agent Rules

Every prompt should include:

```txt
Read AGENTS.md first.
Use original EmDash repository as canonical upstream.
Use official EmDash docs as canonical reference.
Treat reference implementation as read-only pattern source.
Use GitHub Issues for non-trivial work.
Create a new branch before implementation.
Make atomic changes.
Run validation before completion.
Do not commit secrets/private data/uploads/local DBs.
Do not modify EmDash core unless justified and documented.
Update compatibility matrix and divergence log when needed.
```

---

## 14. GitHub Issue Master Index

### Foundation Issues

```txt
Inspect EmDash and reference repository
Create GitHub labels and milestones
Create repository foundation
Add AGENTS.md
Add README.md
Add issue templates
```

### Compatibility Issues

```txt
Add upstream sync policy
Add compatibility matrix
Add divergence log
Add upstream sync issue/PR templates
Add bad sync rollback playbook
```

### Development Baseline Issues

```txt
Add local site package
Add Astro config
Add environment examples
Add validation script
Add public layout
Add header/footer
Add homepage shell
```

### Content and Template Issues

```txt
Add site settings strategy
Add pages strategy
Add blog/news strategy
Add menus strategy
Add announcements strategy
Add standard template
Add school template
Add template seed data
```

### Module Issues

```txt
Add module manifest standard
Add module registry baseline
Add plugin permission/capability policy
Add documents module baseline
Add forms module baseline
Add audit log baseline
Add mobile API plugin skeleton
Add Kelulusan module skeleton
```

### Security and Access Issues

```txt
Add security baseline
Add privacy/compliance baseline
Add secure upload policy
Add permission registry baseline
Add ABAC policy model
Add ABAC evaluator
Add permission matrix GUI skeleton
Add audit events
```

### Deployment Issues

```txt
Add Cloudflare deployment architecture
Add Wrangler example configuration
Add environment and secret policy
Add CI/CD baseline
Add backup/restore runbook
Add monitoring and incident runbook
```

### Testing Issues

```txt
Add Playwright smoke test plan
Add compatibility test plan
Add security tests
Add mobile API contract tests
Add Kelulusan security tests
Run full validation
Prepare MVP release notes
```

### Expansion Issues

```txt
Define ERP-ready expansion boundary
Define future module categories
Define Odoo integration strategy
Define workflow and approval baseline
Define mobile SDK and Flutter client
Define post-MVP roadmap
```

---

## 15. Recommended GitHub Milestones

```txt
M0 — Discovery and Foundation
M1 — Local Website Baseline
M2 — Standard Website Core
M3 — Interaction Modules
M4 — Governance Baseline
M5 — Security and Staging Readiness
M6 — MVP Release Candidate
M7 — Production Deployment Baseline
M8 — School Template and Kelulusan
M9 — Mobile API and Flutter
M10 — ERP-Ready Expansion
M11 — Upstream Sync Maintenance
```

---

## 16. Recommended Labels

```txt
type:docs
type:feature
type:bug
type:refactor
type:test
type:security
type:deployment
type:chore

area:emdash-compat
area:frontend
area:admin
area:database
area:storage
area:plugin
area:module-registry
area:abac
area:mobile-api
area:flutter
area:cloudflare
area:security
area:template
area:kelulusan
area:erp-ready
area:docs

priority:p0
priority:p1
priority:p2
priority:p3

status:blocked
status:ready
status:in-progress
status:needs-review
status:done
```

---

## 17. Release Roadmap

### Release v0.1.0 — Documentation and Repository Foundation

Scope:

```txt
repo structure
docs baseline
upstream sync policy
compatibility matrix
divergence log
AGENTS.md
README.md
```

### Release v0.2.0 — Local Website Baseline

Scope:

```txt
sites/main
Astro shell
homepage
layout/header/footer
theme baseline
validation script
```

### Release v0.3.0 — Standard Website Core

Scope:

```txt
pages
news
announcements
menus
SEO baseline
site settings
public content safety rules
```

### Release v0.4.0 — Interaction Modules

Scope:

```txt
media policy
documents baseline
forms baseline
secure upload policy
privacy/consent baseline
```

### Release v0.5.0 — Governance Baseline

Scope:

```txt
default tenant/site
audit baseline
module registry baseline
permission registry baseline
soft delete/storage metadata baseline
```

### Release v0.6.0 — Security and Deployment Baseline

Scope:

```txt
security docs
compliance docs
ISO alignment
testing docs
Cloudflare staging docs
backup/restore
incident response
```

### Release v0.7.0 — MVP Release Candidate

Scope:

```txt
full validation
compatibility audit
release notes
known limitations
rollback plan
```

### Release v0.8.0 — School Template and Kelulusan Beta

Scope:

```txt
school template
Kelulusan module skeleton
NISN verification design
R2 signed URL flow
audit/privacy tests
```

### Release v0.9.0 — Mobile API and Flutter Beta

Scope:

```txt
mobile API plugin
Flutter SDK skeleton
Flutter school app skeleton
contract tests
Kelulusan mobile flow
```

### Release v1.0.0 — Stable Standard Website System

Scope:

```txt
stable local/staging deployment
standard template stable
school template stable
documents/forms/media stable
audit/security baseline stable
EmDash compatibility verified
production runbook ready
```

---

## 18. Validation Command Index

Run these based on repository scripts:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Cloudflare staging:

```bash
npx wrangler deploy --env staging
```

Flutter, if applicable:

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Upstream sync:

```bash
git status
git fetch upstream
git checkout -b sync/emdash-upstream-YYYYMMDD
git merge upstream/main
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 19. Final Risk Register

| Risk | Impact | Mitigation |
| --- | ---: | --- |
| AWCMS-Micro becomes fragile EmDash fork | Critical | isolate custom logic, update divergence log |
| MVP becomes too large | High | follow MVP non-goals |
| Private student data exposed | Critical | signed URLs, safe errors, rate limit, audit |
| Secrets committed | Critical | .gitignore, secret scanning, review |
| Production Cloudflare misconfigured | High | staging/prod separation, checklist |
| Database migration breaks data | High | staging migration, backup, rollback |
| Plugin breaks admin | Medium/High | module registry, disable plugin, tests |
| Template leaks private content | High | public content filters, tests |
| Mobile API exposes admin data | Critical | separate mobile API layer |
| ERP scope creep | High | ERP-ready boundary, Odoo integration strategy |
| Upstream sync breaks custom modules | High | compatibility matrix, tests, adapters |

---

## 20. Final Security Baseline

Minimum required security posture:

```txt
[ ] deny by default
[ ] least privilege
[ ] no secrets in code
[ ] input validation
[ ] output escaping
[ ] safe file upload
[ ] tenant/site filtering
[ ] soft delete
[ ] audit log
[ ] signed URLs for private files
[ ] rate limiting for sensitive public endpoints
[ ] privacy policy and consent controls
[ ] backup/restore plan
[ ] incident response plan
[ ] validation before deployment
```

---

## 21. Final EmDash Compatibility Baseline

Every meaningful implementation must answer:

```txt
Does this modify EmDash core?
Does this break EmDash admin behavior?
Does this break EmDash plugin compatibility?
Does this break EmDash template compatibility?
Does this affect database/schema assumptions?
Does this affect media/upload flow?
Does this affect storage adapters?
Does this affect security/auth?
Does this require compatibility matrix update?
Does this require divergence log entry?
```

---

## 22. Final Implementation Decision Order

When decisions conflict, use this order:

```txt
1. Security and data protection
2. Tenant-readiness
3. EmDash architectural compatibility
4. AWCMS governance
5. Simplicity for MVP
6. Maintainability
7. Upgrade path to multi-tenant and multi-application platform
8. Visual/UX preference
```

---

## 23. Final Implementation Guidance

### 22.1 Start Small

Begin with:

```txt
repository foundation
docs
local website shell
standard template
security/testing baseline
```

Do not start with:

```txt
ERP
billing
marketplace
complex ABAC UI
mobile auth
multi-tenant billing
```

### 22.2 Keep Custom Logic Isolated

Use:

```txt
packages/awcms
packages/plugins
templates
sites/main
docs
tests
```

Avoid:

```txt
random edits inside EmDash core
hardcoded client-specific logic
hidden custom behavior
untracked divergence
```

### 22.3 Use GitHub Issues as Work Units

Every feature should have:

```txt
issue
branch
acceptance criteria
validation
rollback plan
PR
merge
delete branch
```

### 22.4 Build Website MVP Before Platform Expansion

Correct order:

```txt
standard website
school template
Kelulusan
mobile API
ABAC GUI
integration adapters
ERP-ready modules
multi-tenant platform
```

### 22.5 Validate Frequently

At minimum:

```txt
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For user flows:

```txt
Playwright/e2e smoke tests
```

For Cloudflare:

```txt
staging deployment before production
```

---

## 24. Final OpenCode / Antigravity Master Prompt

```txt
You are an expert AI-native software architect, TypeScript/Astro developer, EmDash-compatible CMS engineer, AWCMS-Micro product strategist, security engineer, Cloudflare deployment engineer, GitHub project manager, and documentation maintainer.

TASK:
Implement AWCMS-Micro according to the complete documentation series Parts 1–15.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Project documentation Parts 1–15

MASTER RULES:
1. Read AGENTS.md first.
2. Treat original EmDash as upstream architectural authority.
3. Treat official EmDash docs as canonical reference.
4. Treat SMAN 2 repository as reference-only, not upstream authority.
5. Do not modify EmDash core unless no safe extension path exists.
6. Isolate AWCMS custom logic in adapters, modules, plugins, themes, docs, and tests.
7. Use GitHub Issues for non-trivial work.
8. Create a dedicated branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Update docs, compatibility matrix, and divergence log when needed.
12. Do not commit secrets, local databases, uploaded files, private PDFs, real student data, or production config.
13. Preserve EmDash plugin/template compatibility.
14. Use Cloudflare staging before production.
15. Merge only after validation and delete branch after merge.

IMPLEMENTATION ORDER:
1. Repository foundation
2. EmDash compatibility docs
3. Local website baseline
4. Public website shell
5. Standard website content modules
6. Media/documents/forms/SEO
7. Default tenant/site, audit, module registry
8. Security/privacy/testing baseline
9. Cloudflare staging deployment
10. Standard template
11. School template and Kelulusan module
12. Mobile API and Flutter SDK
13. ABAC Matrix GUI
14. Integrations and ERP-ready modules later
15. Upstream sync maintenance

VALIDATION:
Run available commands:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm test:e2e if configured

For Flutter work:
- flutter pub get
- flutter analyze
- flutter test

For Cloudflare staging:
- npx wrangler deploy --env staging

FINAL REPORT FORMAT:
1. GitHub Issues created/updated
2. Branch name
3. Files changed
4. EmDash compatibility impact
5. Security/privacy impact
6. Migration/storage/deployment impact
7. Validation results
8. Risks
9. Rollback plan
10. Next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core
- running destructive migrations
- changing production Cloudflare resources
- committing secrets/private data/uploads/local DBs
- exposing raw NISN or private R2 object keys
- enabling production ERP/payment/accounting logic
- force pushing shared branches
```

---

## 25. Final Definition of Done for the Documentation Series

The documentation series is complete when:

```txt
[ ] Parts 1–15 exist
[ ] each part has clear objective
[ ] each part has implementation guidance
[ ] each part has GitHub Issues
[ ] each part has OpenCode/Antigravity prompt
[ ] MVP scope is clear
[ ] post-MVP scope is clear
[ ] EmDash compatibility is protected
[ ] security/privacy baseline is documented
[ ] Cloudflare deployment is documented
[ ] school/Kelulusan use case is documented
[ ] mobile/Flutter use case is documented
[ ] ERP-ready expansion is documented without MVP scope creep
[ ] upstream sync playbook exists
[ ] master index and final roadmap exists
```

---

## 26. Final Recommended Next Action

After this documentation series, the next practical action is not another architecture document.

The next practical action is:

```txt
Create GitHub Issues and implement Phase 0 — Repository Governance and Foundation.
```

Start with these issues:

```txt
1. Create Repository Foundation
2. Add AGENTS.md
3. Add README.md
4. Add Upstream Sync Policy
5. Add Compatibility Matrix
6. Add Divergence Log
7. Add MVP Sprint Plan
8. Add Validation Script
```

Recommended first branch:

```txt
chore/init-awcms-micro-foundation
```

Recommended first commit:

```txt
chore: initialize AWCMS-Micro foundation
```

---

## 27. Closing Principle

AWCMS-Micro should grow carefully.

```txt
Start as a standard website system.
Stay compatible with EmDash.
Secure data from the beginning.
Document every important decision.
Build modules only when needed.
Validate every release.
Prepare for the future without overbuilding the present.
```

This is the safest path for turning AWCMS-Micro into a strong foundation inside the wider AWCMS ecosystem.
