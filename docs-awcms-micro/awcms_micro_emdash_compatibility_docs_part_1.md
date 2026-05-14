# AWCMS-Micro Implementation Documentation

## Part 1 — EmDash Compatibility Architecture and Governance

**Document status:** Draft v0.1  
**Purpose:** Define the foundation for implementing AWCMS-Micro while keeping it compatible with the original EmDash architecture, features, plugins, templates, and future upstream updates.

---

## 1. Executive Summary

AWCMS-Micro is a **single-tenant-first website system** built as part of the wider AWCMS ecosystem. It should behave today like a simple, fast, practical CMS for schools, company profiles, foundations, government portals, landing pages, and lightweight digital services. However, it must be structurally prepared for future multi-tenancy, mobile API support, module expansion, and ERP-like growth.

The safest formula is:

```txt
AWCMS-Micro
= EmDash-compatible website CMS implementation
+ AWCMS governance layer
+ single-tenant operational mode
+ tenant-ready custom modules
+ plugin/module discipline
+ ABAC-ready authorization overlay
+ Cloudflare/S3-compatible storage discipline
+ future upgrade path to multi-tenant AWCMS
```

The most important rule:

```txt
EmDash upstream is the architectural authority.
AWCMS-Micro is the implementation layer.
Custom behavior must live outside EmDash core whenever possible.
```

AWCMS-Micro must **not** become a fragile fork. It should track EmDash upstream continuously and isolate all AWCMS-specific behavior in:

- adapters;
- modules;
- plugins;
- themes;
- permissions;
- tenancy layers;
- API gateway layers;
- documentation;
- compatibility tests;
- deployment profiles.

---

## 2. Scope of This Documentation Series

This documentation is divided into multiple parts so implementation can proceed step by step.

### Part 1 — Compatibility Architecture and Governance

This part defines:

- product definition;
- compatibility principles;
- EmDash vs AWCMS-Micro boundaries;
- upstream sync policy;
- repository strategy;
- extension strategy;
- high-level roadmap.

### Part 2 — Repository Structure and Initial Implementation

Planned content:

- recommended monorepo layout;
- `sites/main` structure;
- `packages/awcms` structure;
- `packages/plugins` structure;
- required documentation files;
- seed strategy;
- local development baseline;
- initial GitHub Issues.

### Part 3 — Database, Tenancy, Soft Delete, and Storage

Planned content:

- default tenant;
- tenant-ready table standards;
- EmDash schema boundary;
- custom AWCMS tables;
- soft delete rules;
- R2/S3 path discipline;
- backup and restore.

### Part 4 — Plugin and Module System

Planned content:

- EmDash plugin compatibility;
- native plugin strategy;
- sandbox/marketplace plugin strategy;
- AWCMS module manifest;
- module registry;
- plugin permissions;
- plugin testing.

### Part 5 — ABAC and Permission Matrix GUI

Planned content:

- ABAC engine;
- RBAC/ABAC relationship;
- permission naming;
- policy tables;
- evaluator service;
- permission matrix GUI as an EmDash plugin;
- effective-access preview;
- audit log integration.

### Part 6 — Admin, Public Frontend, Mobile API, and Theme System

Planned content:

- public Astro frontend;
- admin extension rules;
- mobile API plugin;
- theme/layout manager;
- template compatibility;
- content rendering.

### Part 7 — Security, Compliance, ISO Alignment, and Testing

Planned content:

- Indonesian PDP compliance;
- PP 71/2019 alignment;
- secure uploads;
- audit log;
- ISO/IEC 27001, 27002, 27005, 27017, 27018, 27701, 27034, 20000-1, 22301, 15408;
- Playwright test flows;
- release validation.

### Part 8 — Cloudflare Deployment and Operational Runbook

Planned content:

- Cloudflare Workers;
- D1;
- R2;
- KV;
- Turnstile;
- environment variables;
- staging and production;
- rollback;
- incident response.

---

## 3. Product Definition

### 3.1 What AWCMS-Micro Is

AWCMS-Micro is a **single-tenant-first website operating system** based on EmDash architecture.

It is intended for:

1. school websites;
2. company profile websites;
3. foundation/nonprofit websites;
4. government/public-sector portals;
5. landing page factories;
6. secure document publication;
7. lightweight public-service applications;
8. future mobile API-backed applications.

AWCMS-Micro should start simple but must be designed with future growth in mind.

### 3.2 What AWCMS-Micro Is Not

AWCMS-Micro is **not**:

- a direct fork of EmDash with uncontrolled changes;
- a full ERP system in MVP;
- a replacement for EmDash core;
- a marketplace-incompatible CMS;
- a database shortcut that ignores future tenancy;
- a static website builder only;
- a system where every client site requires core code changes.

### 3.3 Main Product Formula

```txt
AWCMS-Micro
= single-tenant-first website system
+ EmDash-based architecture
+ AWCMS governance
+ tenant-ready database design
+ plugin/module discipline
+ upgrade path to AWCMS multi-tenant
```

### 3.4 Operating Mode

AWCMS-Micro is initially:

```txt
Single-tenant operationally.
Tenant-ready structurally.
EmDash-compatible architecturally.
AWCMS-governed strategically.
```

---

## 4. Core Architectural Principles

### 4.1 EmDash Upstream First

The original EmDash repository and official EmDash documentation must be treated as the canonical architectural reference.

AWCMS-Micro must continuously ask:

1. Does this change follow EmDash package boundaries?
2. Does this change preserve EmDash plugin compatibility?
3. Does this change preserve official template compatibility?
4. Does this change preserve admin and API behavior?
5. Does this change make future upstream sync harder?
6. Is there a safer extension path through plugins, modules, adapters, or configuration?

### 4.2 Do Not Create a Fragile Fork

A fragile fork occurs when AWCMS-Micro modifies EmDash core behavior so deeply that future upstream updates become dangerous, expensive, or impossible.

Fragile-fork symptoms include:

- custom logic scattered inside EmDash core packages;
- direct edits to internal admin routes without abstraction;
- direct edits to plugin runtime behavior without compatibility tests;
- custom permissions hardcoded inside unrelated route files;
- tenant logic forced into every EmDash table without migration strategy;
- marketplace plugin assumptions broken;
- official templates no longer usable;
- undocumented divergence from upstream.

### 4.3 Extension Before Modification

Preferred order of implementation:

1. configuration;
2. seed data;
3. theme/layout;
4. plugin;
5. module;
6. adapter;
7. wrapper service;
8. documented compatibility layer;
9. upstream contribution;
10. core modification only as a last resort.

### 4.4 Keep Custom Logic Isolated

AWCMS-specific logic should live in places such as:

```txt
src/awcms/
packages/awcms/
packages/plugins/
sites/main/
docs/
tests/
infra/
scripts/
```

Avoid placing AWCMS-specific business logic directly inside EmDash core packages unless it is intentionally being contributed upstream.

---

## 5. EmDash and AWCMS-Micro Boundary Model

### 5.1 EmDash Responsibilities

EmDash should remain responsible for:

- Astro-native CMS foundation (Astro 6+ with Live Collections);
- admin application (React SPA with `@cloudflare/kumo` design system);
- content schema and collections (database-defined, `ec_` prefixed tables);
- database-defined content model (per-collection SQL tables, not JSON blobs);
- Portable Text rich content storage (TipTap editor, structured JSON);
- plugin runtime (`definePlugin()` API with lifecycle hooks);
- sandboxed plugin execution (Dynamic Worker Loaders on Cloudflare);
- marketplace plugin compatibility;
- media abstractions (signed URL uploads, S3/R2/local adapters);
- REST/API conventions (`/_emdash/api/*` routes);
- authentication primitives (passkey-first/WebAuthn, OAuth, magic link);
- built-in MCP server for AI tool integration;
- internationalization (row-per-locale model with `locale` and `translation_group`);
- admin manifest behavior;
- official templates (blog, marketing, portfolio, starter, blank);
- core package lifecycle.

### 5.2 AWCMS-Micro Responsibilities

AWCMS-Micro should be responsible for:

- website implementation pattern;
- school/company/foundation/government templates;
- AWCMS module registry;
- tenant-ready custom tables;
- ABAC policy overlay;
- permission matrix GUI;
- Indonesian compliance documentation;
- audit log extension;
- storage path discipline;
- mobile API plugin;
- Cloudflare deployment profile;
- future ERP integration boundary;
- operational runbooks.

### 5.3 Boundary Rule

```txt
EmDash provides the CMS engine.
AWCMS-Micro provides the governed implementation layer.
```

---

## 6. Recommended High-Level Architecture

```txt
┌────────────────────────────────────────────┐
│ Official EmDash Upstream                    │
│ - Core CMS                                  │
│ - Admin UI                                  │
│ - Plugin runtime                            │
│ - Media/storage abstraction                 │
│ - Database-defined schema                   │
│ - Official templates                        │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ AWCMS-Micro Compatibility Layer             │
│ - EmDash adapters                           │
│ - AWCMS conventions                         │
│ - Tenant context                            │
│ - Permission context                        │
│ - Audit context                             │
│ - Storage path context                      │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ AWCMS-Micro Modules and Plugins             │
│ - Pages extensions                          │
│ - Documents                                 │
│ - Forms                                     │
│ - SEO                                       │
│ - Audit Log                                 │
│ - ABAC Matrix                               │
│ - Mobile API                                │
│ - Future ERP modules                        │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ Website Implementation                      │
│ - Theme                                     │
│ - Content seed                              │
│ - Logo/branding                             │
│ - Menus                                     │
│ - Deployment config                         │
│ - Public pages                              │
└────────────────────────────────────────────┘
```

---

## 7. Repository Strategy

### 7.1 Recommended Repository Types

Use three conceptual repository roles:

| Repository Type | Purpose | Example |
| --- | --- | --- |
| Upstream reference | Original EmDash source | `emdash-cms/emdash` |
| AWCMS-Micro base | Reusable governed implementation | `awcms-micro-standard` |
| Website implementation | Client/site-specific website | `awcms-micro-sman2pangkalanbun` |

### 7.2 Reference Repository Rule

A website-specific repository such as `awcms-micro-sman2pangkalanbun` should be treated as:

```txt
Reference implementation, not universal base.
```

Useful things to copy:

- documentation structure;
- implementation patterns;
- plugin usage patterns;
- Cloudflare deployment ideas;
- local demo structure;
- project planning style;
- Playwright testing patterns.

Things not to copy blindly:

- school-specific branding;
- student data;
- production Cloudflare IDs;
- local database files;
- uploaded private files;
- one-off plugin hacks;
- hardcoded domain names;
- client-specific content.

### 7.3 Suggested Standard Repository Layout

```txt
awcms-micro-standard/
  docs/
    architecture.md
    upstream-sync.md
    compatibility-matrix.md
    divergence-log.md
    security.md
    privacy.md
    modules.md
    deployment.md
    rollback.md

  sites/
    main/
      astro.config.mjs
      package.json
      src/
        pages/
        layouts/
        components/
        styles/
      seed/
        site-settings.json
        menus.json
        pages.json

  packages/
    awcms/
      compatibility/
      tenancy/
      permissions/
      audit/
      module-registry/
      theme-standard/

    plugins/
      mobile-api/
      abac-matrix/
      documents/
      forms/
      audit-log/
      announcements/

  tests/
    compatibility/
    e2e/
    security/

  scripts/
    validate.sh
    sync-upstream.sh
    seed-site.sh
```

---

## 8. Upstream Sync Policy

### 8.1 Required Remote

Every AWCMS-Micro implementation repository should track EmDash upstream:

```bash
git remote add upstream https://github.com/emdash-cms/emdash.git
```

### 8.2 Sync Rule

Every upstream sync must answer these questions:

1. What changed upstream?
2. What affects AWCMS-Micro?
3. Does the change affect package boundaries?
4. Does the change affect plugin API?
5. Does the change affect marketplace plugins?
6. Does the change affect admin manifest?
7. Does the change affect storage/media?
8. Does the change affect authentication or permissions?
9. Does the change affect content schema or migrations?
10. Does the change affect templates or seed files?
11. Should we adopt, adapt, delay, or reject?
12. Are tests updated?
13. Is the divergence log updated?

### 8.3 Adopt / Adapt / Delay / Reject

| Decision | Meaning | Example |
| --- | --- | --- |
| Adopt | Use upstream behavior as-is | Admin route improvement |
| Adapt | Wrap upstream behavior with AWCMS layer | Storage path policy |
| Delay | Wait until AWCMS layer is ready | Major plugin API change |
| Reject | Do not use because it conflicts with governance | Unsafe incompatible pattern |

### 8.4 Divergence Log

Create and maintain:

```txt
docs/divergence-log.md
```

Required table:

| Date | Area | Upstream Behavior | AWCMS-Micro Behavior | Reason | Risk | Rollback |
| --- | --- | --- | --- | --- | --- | --- |

No core divergence should exist without documentation.

### 8.5 Validation Commands

Before any sync is considered complete, run:

```bash
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

If a command is unavailable, inspect `package.json` and use the repository’s equivalent command.

---

## 9. Compatibility Matrix

Create:

```txt
docs/compatibility-matrix.md
```

Recommended matrix:

| Area | Compatibility Target | Status | Risk | Test |
| --- | --- | --- | --- | --- |
| EmDash core | Latest upstream main/release | Pending | Medium | Build/test |
| Admin UI | Manifest-driven admin remains working | Pending | High | Admin smoke test |
| Plugins | Native plugins still load | Pending | High | Plugin load test |
| Marketplace plugins | Sandbox/capabilities preserved | Pending | High | Marketplace install test |
| Templates | Official templates still usable | Pending | Medium | Template seed test |
| Storage | Local and R2/S3 storage work | Pending | High | Upload/download test |
| Content schema | Collections and fields work | Pending | High | CRUD test |
| Soft delete | Deleted records hidden/restorable as intended | Pending | Medium | Delete/restore test |
| Auth | Admin login and permissions work | Pending | High | Auth flow test |
| ABAC overlay | Does not break EmDash permissions | Pending | High | Effective access test |

---

## 10. Plugin Compatibility Strategy

### 10.1 Preserve EmDash Plugin Model

AWCMS-Micro must preserve EmDash plugin compatibility.

EmDash plugins use the `definePlugin()` API with two execution modes:

- **Native plugins** — full access to the host environment (for first-party plugins);
- **Sandboxed plugins** — run in V8 isolates via Dynamic Worker Loaders with capability-based permissions (for third-party plugins on Cloudflare).

EmDash ships first-party plugins as `@emdash-cms/plugin-*` packages:

- `@emdash-cms/plugin-forms`
- `@emdash-cms/plugin-seo`
- `@emdash-cms/plugin-audit-log`
- `@emdash-cms/plugin-embeds`

Do not break:

- native plugin loading;
- sandboxed marketplace plugin loading via Dynamic Worker Loaders;
- plugin capability declarations (e.g., `read:content`, `email:send`);
- plugin API route namespace;
- plugin lifecycle hooks (`content:beforeSave`, `content:afterSave`, `content:beforeDelete`, `content:afterDelete`, `media:beforeUpload`, `media:afterUpload`);
- plugin KV storage isolation;
- plugin admin pages/widgets/dashboard widgets;
- plugin custom block types;
- plugin update/removal process.

Prefer using upstream EmDash first-party plugins (e.g., `@emdash-cms/plugin-seo`) where available instead of rebuilding equivalent functionality in AWCMS-Micro.

### 10.2 AWCMS-Micro Plugin Categories

| Category | Purpose | Example |
| --- | --- | --- |
| Core website plugins | Standard website needs | Documents, Forms, Announcements |
| Governance plugins | Security and admin governance | Audit Log, ABAC Matrix |
| Integration plugins | External systems | Webhook, CRM, WhatsApp, Email |
| Public-service plugins | Domain-specific use cases | Kelulusan, Secure Document Lookup |
| Future business plugins | ERP-like growth | CRM, Inventory, Procurement |

### 10.3 Plugin Review Policy

Every plugin should be reviewed for:

1. capability declarations requested;
2. KV storage access;
3. network access;
4. database access;
5. admin UI access;
6. tenant-awareness;
7. audit logging;
8. rollback behavior;
9. compatibility with EmDash update path.

---

## 11. Template Compatibility Strategy

AWCMS-Micro should remain compatible with official EmDash templates and should also define AWCMS-specific templates.

### 11.1 EmDash Templates

Official EmDash templates should remain usable without major core changes.

AWCMS-Micro should avoid changes that break:

- Astro project structure;
- seed files;
- content collection expectations;
- media assumptions;
- admin manifest behavior;
- deployment assumptions.

### 11.2 AWCMS-Micro Templates

Recommended AWCMS-Micro templates:

```txt
@awcms-micro/template-school
@awcms-micro/template-company
@awcms-micro/template-foundation
@awcms-micro/template-government-portal
@awcms-micro/template-landing-page
@awcms-micro/template-secure-document-publication
```

Each template should include:

- public Astro pages;
- layouts;
- components;
- styles;
- seed data;
- module manifest;
- security notes;
- deployment notes;
- rollback notes.

---

## 12. ABAC Compatibility Principle

AWCMS-Micro may implement ABAC, but it must not destructively replace EmDash authorization.

Recommended model:

```txt
EmDash permission check
  ↓
AWCMS-Micro ABAC policy check
  ↓
Tenant/site/module/resource condition check
  ↓
Allow or deny
```

This means:

- EmDash permissions remain valid;
- AWCMS-specific permissions are namespaced;
- ABAC adds conditions and resource scoping;
- permission matrix GUI manages AWCMS policies;
- admin and API routes stay compatible with EmDash conventions.

Recommended permission namespace:

```txt
awcms:tenant:read
awcms:tenant:manage
awcms:site:read
awcms:site:manage
awcms:module:install
awcms:module:disable
awcms:policy:read
awcms:policy:write
awcms:policy:test
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:delete
awcms:document:restore
awcms:document:private_download
awcms:form_submission:read
awcms:form_submission:export
```

Avoid inventing arbitrary EmDash core permission names inside AWCMS modules.

---

## 13. Tenant-Readiness Principle

AWCMS-Micro is single-tenant first but tenant-ready structurally.

Default tenant:

```txt
id   = 00000000-0000-0000-0000-000000000001
code = default
name = Default Tenant
```

For AWCMS custom business/content tables, use:

```txt
tenant_id uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz null
created_by uuid null
updated_by uuid null
```

Important rule:

```txt
Do not force tenant_id into EmDash core tables prematurely unless a safe upstream-compatible strategy is documented and tested.
```

Recommended multi-tenancy path:

1. single-tenant mode with default tenant;
2. tenant-ready AWCMS custom modules;
3. multi-site / multi-instance orchestration;
4. tenant-aware gateway;
5. shared-database multi-tenancy only after deep compatibility study.

---

## 14. Soft Delete Principle

AWCMS-Micro should reuse EmDash soft delete behavior where EmDash already handles content records.

For AWCMS custom modules, implement consistent soft delete:

```txt
deleted_at timestamptz null
```

Recommended delete policy:

| Data Type | Delete Strategy |
| --- | --- |
| EmDash content entries | Use EmDash behavior |
| AWCMS module records | Soft delete with `deleted_at` |
| Media metadata | Soft delete/hide metadata first |
| R2/S3 object | Delete only through controlled cleanup |
| Audit logs | Do not delete through normal admin UI |
| Permission policies | Disable or soft delete with audit event |
| ERP-like records | Void/reversal/soft delete depending on business rule |

---

## 15. Storage Compatibility Principle

Use EmDash storage abstraction wherever possible.

AWCMS-Micro storage paths should be disciplined.

Single-tenant path:

```txt
tenants/default/sites/main/media/{year}/{month}/{filename}
```

Future multi-tenant path:

```txt
tenants/{tenant_id}/sites/{site_id}/media/{year}/{month}/{filename}
```

Avoid:

```txt
uploads/{filename}
```

Every upload should include:

- file type validation;
- file size validation;
- safe filename generation;
- metadata record;
- permission check;
- audit log;
- storage scope;
- rollback/cleanup plan.

---

## 16. MVP Scope

### 16.1 Required MVP Modules

AWCMS-Micro v0.1 should include:

1. Core Settings;
2. Pages;
3. Blog/News;
4. Announcements;
5. Menus;
6. Media;
7. SEO;
8. Forms;
9. Documents;
10. Users/Roles;
11. Module Registry;
12. Audit Log;
13. Default Tenant Record;
14. Theme/Layout Manager.

### 16.2 Optional After MVP

After the base is stable:

- Academic Calendar;
- Staff Directory;
- Gallery;
- Secure Document Lookup;
- Kelulusan;
- Webhook Notifier;
- Mobile API;
- CRM integration;
- WhatsApp integration.

### 16.3 Avoid in MVP

Do not include in MVP:

- full ERP;
- billing;
- marketplace plugin publishing;
- complex workflow;
- full visual builder;
- AI writing automation;
- accounting;
- inventory;
- HR;
- procurement.

These can be developed later as separate AWCMS modules or applications.

---

## 17. Development Decision Priority

When choosing between multiple implementation options, use this order:

1. security and data protection;
2. tenant-readiness;
3. EmDash architectural compatibility;
4. AWCMS governance;
5. MVP simplicity;
6. maintainability;
7. future multi-tenant upgrade path;
8. future multi-application/ERP expansion.

If a feature is useful but threatens EmDash compatibility, delay it or implement it as a separate module.

---

## 18. GitHub Issue and Branch Workflow

All implementation should be atomic.

### 18.1 Standard Workflow

```txt
1. Read AGENTS.md and related docs.
2. Inspect current repository status.
3. Create or update GitHub Issue.
4. Create a dedicated branch.
5. Implement one small scope.
6. Run validation.
7. Commit.
8. Push branch.
9. Open or update PR.
10. Merge after validation.
11. Delete branch after merge.
12. Update docs and issue status.
```

### 18.2 Branch Naming

```txt
chore/init-awcms-micro-standard
docs/add-upstream-sync-policy
feat/add-standard-site-shell
feat/add-abac-engine
feat/add-abac-matrix-plugin
feat/add-mobile-api-plugin
test/add-compatibility-tests
```

### 18.3 Commit Naming

```txt
chore: initialize AWCMS-Micro standard structure
docs: add EmDash upstream sync policy
feat: add standard website shell
feat: add ABAC policy evaluator
test: add plugin compatibility smoke tests
```

---

## 19. Required Documentation Files

Every AWCMS-Micro implementation should include:

```txt
docs/architecture.md
docs/upstream-sync.md
docs/compatibility-matrix.md
docs/divergence-log.md
docs/modules.md
docs/security.md
docs/privacy.md
docs/deployment.md
docs/rollback.md
docs/testing.md
docs/mobile-api.md
docs/abac.md
docs/storage.md
docs/tenancy.md
```

Minimum documentation standard:

- purpose;
- scope;
- design decision;
- EmDash compatibility impact;
- security impact;
- testing requirements;
- rollback plan.

---

## 20. Required Validation Before Completion

Before work is considered complete, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

When relevant, also run:

```bash
pnpm test:e2e
```

Minimum Playwright flows:

1. admin login;
2. create page;
3. create blog post;
4. upload media;
5. create menu item;
6. publish page;
7. visit public page;
8. edit SEO metadata;
9. submit form;
10. confirm role-based access;
11. verify plugin loading;
12. verify soft delete behavior;
13. verify permission matrix behavior when implemented.

---

## 21. Initial GitHub Issues

Create these issues first:

### Issue 1 — Initialize AWCMS-Micro Standard Repository

Goal:

Create a clean repository structure for an EmDash-compatible AWCMS-Micro standard website.

Tasks:

- create docs folder;
- create sites/main folder;
- create packages/awcms folder;
- create packages/plugins folder;
- create tests folder;
- add initial documentation files.

Validation:

- structure exists;
- docs are readable;
- no client-specific files committed.

Rollback:

- revert initialization commit.

### Issue 2 — Add EmDash Upstream Sync Policy

Goal:

Document how AWCMS-Micro will track EmDash upstream.

Tasks:

- add upstream-sync.md;
- add compatibility-matrix.md;
- add divergence-log.md;
- add validation checklist.

Validation:

- every sync decision can be documented;
- divergence has a required format.

Rollback:

- revert docs commit.

### Issue 3 — Add Local EmDash-Compatible Development Baseline

Goal:

Create a local development baseline using Node.js, SQLite, and local storage.

Tasks:

- configure local site;
- configure local database;
- configure local media storage;
- avoid advanced plugins initially;
- document local run commands.

Validation:

- local server runs;
- admin route opens;
- database is created;
- uploads path works.

Rollback:

- revert local configuration branch.

### Issue 4 — Add Standard Website Theme Shell

Goal:

Create reusable public frontend shell.

Tasks:

- base layout;
- header;
- footer;
- homepage;
- responsive styles;
- SEO-ready head structure.

Validation:

- homepage loads;
- mobile responsive layout works;
- no hardcoded client branding.

Rollback:

- revert theme commit.

### Issue 5 — Add Standard Content and Module Plan

Goal:

Define MVP content and module structure.

Tasks:

- pages;
- posts;
- announcements;
- documents;
- forms;
- menus;
- site settings;
- audit log direction.

Validation:

- content model is documented;
- no conflict with EmDash schema assumptions.

Rollback:

- revert content model docs.

---

## 22. Practical Implementation Roadmap

### Phase 0 — Discovery

Read:

- EmDash AGENTS.md;
- EmDash CONTRIBUTING.md;
- EmDash README.md;
- official EmDash docs;
- SMAN 2 implementation docs;
- package.json;
- pnpm workspace configuration;
- demo configurations;
- plugin examples.

Output:

- discovery notes;
- reusable patterns;
- risky patterns;
- first GitHub Issues.

### Phase 1 — Clean Structure

Create the standard structure without advanced features.

Output:

- docs;
- sites/main;
- packages/awcms;
- packages/plugins;
- tests;
- scripts.

### Phase 2 — Local Baseline

Implement local EmDash-compatible development.

Output:

- local run command;
- SQLite config;
- local media storage;
- admin route working;
- public route working.

### Phase 3 — Standard Website Features

Add core modules and public theme.

Output:

- homepage;
- pages;
- news;
- announcements;
- menus;
- documents;
- forms.

### Phase 4 — Governance Layer

Add security and governance.

Output:

- audit log;
- default tenant record;
- permission naming;
- soft delete policy;
- storage path policy.

### Phase 5 — ABAC and Permission Matrix

Add ABAC as overlay.

Output:

- ABAC engine;
- policy evaluator;
- permission matrix GUI plugin;
- effective-access preview;
- audit events.

### Phase 6 — Cloudflare and Production

Prepare production deployment.

Output:

- Worker config;
- D1/R2/KV notes;
- environment files;
- deployment checklist;
- rollback plan.

---

## 23. Five Implementation Examples

### Example 1 — School Website

Modules:

- Pages;
- News;
- Announcements;
- Academic Calendar;
- Gallery;
- Documents;
- Forms;
- Staff Directory.

Special care:

- student data privacy;
- secure document lookup;
- parent/guardian communication;
- audit logs for private files.

### Example 2 — Company Profile Website

Modules:

- Pages;
- Services;
- Portfolio;
- Blog;
- Forms;
- SEO;
- Webhook/CRM integration.

Special care:

- lead data consent;
- spam protection;
- CRM integration audit.

### Example 3 — Foundation Website

Modules:

- Programs;
- News;
- Donation information;
- Reports;
- Documents;
- Volunteer forms.

Special care:

- donor privacy;
- public report accuracy;
- document publication control.

### Example 4 — Government/Public Portal

Modules:

- Public information pages;
- Announcements;
- Regulations;
- Documents;
- Service forms;
- Audit log.

Special care:

- information classification;
- document versioning;
- admin responsibility;
- legal compliance.

### Example 5 — Landing Page Factory

Modules:

- Theme presets;
- Pages;
- Forms;
- SEO;
- Analytics;
- Webhook integration.

Special care:

- reusable template discipline;
- per-site configuration;
- tenant/domain readiness.

---

## 24. Lessons from Comparable Systems

### 24.1 WordPress

Lesson:

Plugin ecosystem is powerful, but unrestricted plugin execution creates long-term security and maintenance risks.

AWCMS-Micro response:

- preserve sandbox/capability discipline;
- review plugin permissions;
- audit plugin behavior.

### 24.2 Odoo

Lesson:

Modular business applications can grow into a powerful ecosystem, but complexity can overwhelm the MVP.

AWCMS-Micro response:

- use Odoo as product-thinking inspiration only;
- do not include ERP in CMS MVP;
- build future ERP modules separately.

### 24.3 Drupal

Lesson:

Structured content and permission systems are strong, but complexity can increase learning cost.

AWCMS-Micro response:

- keep MVP simple;
- document content structures;
- use permission matrix only after core flows are stable.

### 24.4 Strapi/Directus

Lesson:

API-first CMS platforms are useful for multi-channel apps, but public frontend and admin governance need discipline.

AWCMS-Micro response:

- use dedicated mobile API layer;
- avoid exposing admin APIs directly;
- keep public frontend Astro-first.

### 24.5 Custom Laravel/Filament CMS

Lesson:

Custom admin systems are flexible but can become expensive to maintain.

AWCMS-Micro response:

- use EmDash admin/plugin system;
- avoid rebuilding admin from scratch;
- extend through plugins and manifests.

---

## 25. Final Rule for Part 1

AWCMS-Micro must be built with this principle:

```txt
Follow EmDash.
Do not fight EmDash.
Extend EmDash carefully.
Document every divergence.
Test every compatibility boundary.
```

If AWCMS-Micro follows this rule, it can remain compatible with:

- future EmDash updates;
- official EmDash templates;
- EmDash marketplace plugins;
- EmDash admin conventions;
- EmDash storage and media patterns;
- EmDash plugin architecture;
- future AWCMS multi-tenant and ERP expansion.

---

## 26. Next Part

Continue with **Part 2 — Repository Structure and Initial Implementation**.

Part 2 should provide:

- exact folder structure;
- file-by-file starter documentation;
- initial `package.json` strategy;
- local dev baseline;
- GitHub Issues;
- branch workflow;
- OpenCode/Antigravity implementation prompt;
- first validation checklist.
