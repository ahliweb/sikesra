# AWCMS-Micro Implementation Documentation

## Part 9 — MVP Implementation Sprint Plan and GitHub Issue Backlog

**Document status:** Draft v0.1  
**Purpose:** Convert the AWCMS-Micro implementation documentation from Parts 1–8 into a practical MVP execution plan using atomic GitHub Issues, sprint sequencing, branch workflow, validation gates, and OpenCode/Antigravity-ready implementation prompts.

---

## 1. Objective of Part 9

Part 9 turns the architectural documentation into an executable product and engineering roadmap.

This document covers:

1. MVP definition;
2. sprint strategy;
3. dependency map;
4. GitHub Issue backlog;
5. issue templates;
6. branch and PR workflow;
7. acceptance criteria;
8. release milestones;
9. validation gates;
10. sprint-by-sprint implementation plan;
11. OpenCode/Antigravity prompts;
12. risk and rollback plan;
13. definition of done.

The main principle:

```txt
Build AWCMS-Micro in small, reversible, testable, EmDash-compatible increments.
```

---

## 2. MVP Definition

### 2.1 MVP Goal

The MVP goal is to create a usable AWCMS-Micro standard website system that:

- follows EmDash architecture;
- supports a standard public website;
- has a working admin foundation;
- supports content, media, menus, SEO, forms, and documents;
- includes tenant-ready AWCMS custom layers;
- includes audit logging direction;
- can deploy locally and later to Cloudflare;
- remains ready for plugins, ABAC, mobile API, and future multi-tenancy.

### 2.2 MVP Formula

```txt
AWCMS-Micro MVP
= EmDash-compatible base
+ standard website shell
+ core website modules
+ tenant-ready custom modules
+ secure storage rules
+ documentation
+ tests
+ Cloudflare deployment baseline
```

### 2.3 MVP Must Include

Required MVP modules/features:

```txt
1. Repository foundation
2. EmDash upstream compatibility docs
3. Local development baseline
4. Standard public theme shell
5. Site settings
6. Pages
7. Blog/News
8. Announcements
9. Menus
10. Media
11. SEO
12. Forms
13. Documents
14. Audit Log baseline
15. Module Registry baseline
16. Default Tenant and Site record
17. Secure upload/storage policy
18. Cloudflare deployment baseline
19. Test and validation pipeline
```

### 2.4 MVP Should Not Include

Do not include in MVP:

```txt
full ERP
billing
marketplace publishing
complex workflow
full visual builder
AI content automation
accounting
inventory
HR
procurement
advanced multi-tenant shared database
complex mobile authentication
```

---

## 3. MVP Release Milestones

Recommended milestones:

```txt
M0 — Discovery and Foundation
M1 — Local EmDash-Compatible Website Baseline
M2 — Standard Public Website Modules
M3 — Documents, Forms, Media, and SEO
M4 — Governance Baseline: Tenant, Audit, Module Registry
M5 — Security, Testing, and Cloudflare Staging Readiness
M6 — MVP Release Candidate
M7 — Production Deployment Baseline
```

### 3.1 Milestone Summary

| Milestone | Goal                                       | Output                                        |
| --------- | ------------------------------------------ | --------------------------------------------- |
| M0        | Understand references and create structure | docs, issues, repo skeleton                   |
| M1        | Run local site                             | homepage, admin baseline, local dev           |
| M2        | Add content modules                        | pages, news, menus, announcements             |
| M3        | Add interaction modules                    | media, forms, documents, SEO                  |
| M4        | Add governance                             | default tenant, audit, module registry        |
| M5        | Add validation/security                    | tests, release gates, Cloudflare staging docs |
| M6        | Stabilize MVP                              | bug fixes, smoke tests, release candidate     |
| M7        | Deploy baseline                            | staging/prod runbook and deployment           |

---

## 4. Sprint Model

### 4.1 Recommended Sprint Length

Use short implementation sprints:

```txt
1 sprint = 3–5 working days
```

For solo or AI-assisted development:

```txt
1 sprint = one focused feature group
```

### 4.2 Sprint Rules

Each sprint must have:

- clear goal;
- linked GitHub Issues;
- dedicated branches;
- small PRs;
- validation commands;
- updated docs;
- rollback plan;
- no secrets committed;
- no EmDash core changes unless justified.

### 4.3 Atomic Development Rule

```txt
One issue should produce one clear outcome.
One branch should solve one issue or one tightly related group of issues.
One PR should be reviewable in a short time.
```

---

## 5. Dependency Map

### 5.1 High-Level Dependencies

```txt
Repository Foundation
  ↓
EmDash Compatibility Docs
  ↓
Local Development Baseline
  ↓
Public Theme Shell
  ↓
Core Content Modules
  ↓
Media / Forms / Documents / SEO
  ↓
Tenant / Audit / Module Registry
  ↓
Security / Testing / Cloudflare Baseline
  ↓
MVP Release Candidate
```

### 5.2 Feature Dependencies

| Feature               | Depends On                                    |
| --------------------- | --------------------------------------------- |
| Pages                 | EmDash content baseline                       |
| Blog/News             | EmDash content baseline                       |
| Menus                 | Site settings/content baseline                |
| SEO                   | Pages/posts/settings                          |
| Media                 | Storage baseline                              |
| Documents             | Media + storage + audit                       |
| Forms                 | Validation + audit + privacy docs             |
| Audit Log             | Tenant context + event schema                 |
| Module Registry       | Plugin/module manifest standard               |
| ABAC Matrix           | Permission registry + audit + module registry |
| Mobile API            | Content services + documents/forms optional   |
| Cloudflare Deployment | build + env + storage/database config         |

---

## 6. GitHub Labels

Recommended labels:

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
area:cloudflare
area:security
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

## 7. GitHub Milestones

Create these milestones:

```txt
M0 — Discovery and Foundation
M1 — Local Website Baseline
M2 — Standard Website Core
M3 — Interaction Modules
M4 — Governance Baseline
M5 — Security and Staging Readiness
M6 — MVP Release Candidate
M7 — Production Deployment Baseline
```

---

## 8. GitHub Issue Template

Use this issue template:

```md
## Goal

Describe the outcome of this issue.

## Context

Explain why this is needed and how it relates to EmDash compatibility and AWCMS-Micro governance.

## Scope

List what is included.

## Out of Scope

List what must not be done in this issue.

## Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Validation

Commands or checks:

- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm test:e2e, if relevant

## Security / Compliance Notes

Mention security, privacy, tenant, storage, or audit impact.

## EmDash Compatibility Impact

Explain whether this touches EmDash core, plugin API, admin, storage, or templates.

## Rollback Plan

Explain how to revert or disable the change safely.
```

---

## 9. Branch and PR Workflow

### 9.1 Standard Flow

```bash
git status
git checkout main
git pull origin main
git checkout -b <branch-name>
# implement atomic change
git add .
git commit -m "<type>: <summary>"
git push -u origin <branch-name>
```

After PR merge:

```bash
git checkout main
git pull origin main
git branch -d <branch-name>
git push origin --delete <branch-name>
```

### 9.2 Branch Naming

```txt
chore/init-repository-foundation
docs/add-emdash-compatibility-policy
feat/add-local-dev-baseline
feat/add-public-theme-shell
feat/add-pages-news-menus
feat/add-documents-module-baseline
feat/add-forms-module-baseline
feat/add-audit-log-baseline
feat/add-module-registry-baseline
feat/add-cloudflare-staging-baseline
test/add-mvp-smoke-tests
```

### 9.3 PR Requirements

Every PR must include:

- linked issue;
- summary;
- files changed;
- validation results;
- screenshots if UI changes;
- security impact;
- EmDash compatibility impact;
- rollback plan.

---

## 10. Sprint 0 — Discovery and Foundation

### 10.1 Sprint Goal

Understand EmDash, inspect the reference repo, create the initial planning and governance baseline.

### 10.2 Issues

#### Issue 0.1 — Inspect EmDash and SMAN 2 Reference Repository

```md
## Goal

Inspect the original EmDash repository and SMAN 2 AWCMS-Micro reference implementation.

## Tasks

- [ ] Read EmDash AGENTS.md
- [ ] Read EmDash README.md
- [ ] Read official EmDash docs
- [ ] Inspect SMAN 2 repo structure
- [ ] Identify reusable patterns
- [ ] Identify non-reusable client-specific parts
- [ ] Document findings

## Acceptance Criteria

- [ ] Discovery notes exist
- [ ] Reusable patterns are listed
- [ ] Compatibility risks are listed

## Validation

- [ ] No code changes unless documentation only

## Rollback Plan

Revert discovery documentation commit.
```

#### Issue 0.2 — Create Initial GitHub Labels and Milestones

```md
## Goal

Prepare GitHub project organization for atomic MVP development.

## Tasks

- [ ] Create labels
- [ ] Create milestones M0–M7
- [ ] Create issue template

## Acceptance Criteria

- [ ] Labels exist
- [ ] Milestones exist
- [ ] Issue template exists

## Rollback Plan

Remove or rename labels/milestones if needed.
```

#### Issue 0.3 — Create Repository Foundation

```md
## Goal

Create the clean AWCMS-Micro standard repository structure.

## Tasks

- [ ] Add AGENTS.md
- [ ] Add README.md
- [ ] Add package.json
- [ ] Add pnpm-workspace.yaml
- [ ] Add docs folder
- [ ] Add sites/main folder
- [ ] Add packages/awcms folder
- [ ] Add packages/plugins folder
- [ ] Add tests folder
- [ ] Add scripts folder

## Acceptance Criteria

- [ ] Repository structure exists
- [ ] No secrets committed
- [ ] No client-specific data committed

## Validation

- [ ] git status reviewed
- [ ] initial commit created

## Rollback Plan

Revert foundation commit.
```

### 10.3 Sprint 0 Definition of Done

```txt
[ ] reference repositories inspected
[ ] GitHub labels exist
[ ] milestones exist
[ ] issue template exists
[ ] repository foundation exists
[ ] AGENTS.md exists
[ ] no secrets/private data committed
```

---

## 11. Sprint 1 — EmDash Compatibility and Documentation Baseline

### 11.1 Sprint Goal

Create the documentation foundation that prevents AWCMS-Micro from becoming a fragile fork.

### 11.2 Issues

#### Issue 1.1 — Add EmDash Upstream Sync Policy

```md
## Goal

Document how AWCMS-Micro tracks the original EmDash repository.

## Tasks

- [ ] Add docs/upstream-sync.md
- [ ] Add sync checklist
- [ ] Add adopt/adapt/delay/reject decision process
- [ ] Add validation commands

## Acceptance Criteria

- [ ] Upstream sync process is documented
- [ ] Validation commands are listed

## Validation

- [ ] docs reviewed

## Rollback Plan

Revert docs commit.
```

#### Issue 1.2 — Add Compatibility Matrix

```md
## Goal

Track compatibility with EmDash core, admin, plugins, templates, storage, and schema.

## Tasks

- [ ] Add docs/compatibility-matrix.md
- [ ] Add compatibility areas
- [ ] Add status/risk/test columns

## Acceptance Criteria

- [ ] Matrix exists
- [ ] EmDash compatibility areas are listed

## Rollback Plan

Revert matrix commit.
```

#### Issue 1.3 — Add Divergence Log

```md
## Goal

Create a required log for any divergence from EmDash upstream.

## Tasks

- [ ] Add docs/divergence-log.md
- [ ] Add standard table format
- [ ] Add initial no-divergence entry

## Acceptance Criteria

- [ ] Divergence log exists
- [ ] No undocumented divergence exists

## Rollback Plan

Revert docs commit.
```

#### Issue 1.4 — Add Architecture and Governance Documentation

```md
## Goal

Define AWCMS-Micro architecture and governance baseline.

## Tasks

- [ ] Add docs/architecture.md
- [ ] Add docs/modules.md
- [ ] Add docs/rollback.md
- [ ] Add docs/testing.md

## Acceptance Criteria

- [ ] Docs explain EmDash vs AWCMS-Micro boundaries
- [ ] MVP scope is clear
- [ ] Rollback principle exists

## Rollback Plan

Revert documentation commit.
```

### 11.3 Sprint 1 Definition of Done

```txt
[ ] upstream sync policy exists
[ ] compatibility matrix exists
[ ] divergence log exists
[ ] architecture docs exist
[ ] rollback docs exist
[ ] testing docs exist
```

---

## 12. Sprint 2 — Local Development Baseline

### 12.1 Sprint Goal

Create a local development baseline that can run a standard AWCMS-Micro website without advanced modules.

### 12.2 Issues

#### Issue 2.1 — Add Local Site Package

```md
## Goal

Create the `sites/main` package for local development.

## Tasks

- [ ] Run `npm create emdash@latest` or scaffold manually
- [ ] Add sites/main/package.json with Astro 6+ and EmDash dependencies
- [ ] Add dev/build/preview scripts
- [ ] Add local README

## Acceptance Criteria

- [ ] `sites/main` package exists
- [ ] package scripts are defined

## Validation

- [ ] pnpm install
- [ ] pnpm --filter @awcms-micro/site-main build, if available

## Rollback Plan

Revert site package commit.
```

#### Issue 2.2 — Add Local Astro Configuration

```md
## Goal

Add Astro configuration for local AWCMS-Micro website development.

## Tasks

- [ ] Add astro.config.mjs with `import emdash from "emdash/astro"`
- [ ] Add Node adapter (`@astrojs/node`) for local dev
- [ ] Add React integration (`@astrojs/react`)
- [ ] Configure `emdash({ database: sqlite(), storage: local() })` for local dev
- [ ] Add `src/live.config.ts` for Live Collections
- [ ] Document local config assumptions

## Acceptance Criteria

- [ ] Astro config exists
- [ ] Config does not guess unsupported EmDash imports
- [ ] Config follows upstream docs

## Validation

- [ ] pnpm build or documented pending state

## Rollback Plan

Revert config commit.
```

#### Issue 2.3 — Add Local Environment Examples

```md
## Goal

Add safe local environment examples.

## Tasks

- [ ] Add .env.example
- [ ] Add local database placeholder
- [ ] Add local storage placeholder
- [ ] Add default tenant variables
- [ ] Ensure .env and .dev.vars are ignored

## Acceptance Criteria

- [ ] No real secrets committed
- [ ] Local env requirements are documented

## Rollback Plan

Revert env example changes.
```

#### Issue 2.4 — Add Validation Script

```md
## Goal

Add repeatable validation script.

## Tasks

- [ ] Add scripts/validate.sh
- [ ] Add package.json validate script
- [ ] Run available checks safely

## Acceptance Criteria

- [ ] `pnpm validate` exists or equivalent is documented
- [ ] Missing scripts are handled clearly

## Rollback Plan

Revert script changes.
```

### 12.3 Sprint 2 Definition of Done

```txt
[ ] sites/main package exists
[ ] local Astro config exists
[ ] env examples exist
[ ] validation script exists
[ ] local build/dev path is documented
```

---

## 13. Sprint 3 — Public Website Shell and Theme Foundation

### 13.1 Sprint Goal

Create the first public website shell: homepage, layout, header, footer, global CSS, and theme manifest.

### 13.2 Issues

#### Issue 3.1 — Add Base Public Layout

```md
## Goal

Create the base Astro layout for the public website.

## Tasks

- [ ] Add BaseLayout.astro
- [ ] Add HTML structure
- [ ] Add meta title/description support
- [ ] Add Header/Footer slots or imports

## Acceptance Criteria

- [ ] Layout renders
- [ ] SEO baseline exists
- [ ] Semantic HTML is used

## Validation

- [ ] build passes

## Rollback Plan

Revert layout commit.
```

#### Issue 3.2 — Add Header and Footer Components

```md
## Goal

Create reusable public header and footer components.

## Tasks

- [ ] Add Header.astro
- [ ] Add Footer.astro
- [ ] Add navigation placeholder
- [ ] Add footer credit placeholder

## Acceptance Criteria

- [ ] Header renders
- [ ] Footer renders
- [ ] Navigation is accessible

## Rollback Plan

Revert component commit.
```

#### Issue 3.3 — Add Homepage Shell

```md
## Goal

Create the first standard homepage shell.

## Tasks

- [ ] Add hero section
- [ ] Add about section placeholder
- [ ] Add news preview placeholder
- [ ] Add documents preview placeholder
- [ ] Add contact CTA

## Acceptance Criteria

- [ ] Homepage loads
- [ ] Mobile-first layout works
- [ ] No client-specific branding hardcoded

## Validation

- [ ] build passes
- [ ] screenshot/manual check

## Rollback Plan

Revert homepage commit.
```

#### Issue 3.4 — Add Standard Theme Manifest

```md
## Goal

Create theme-standard manifest and settings baseline.

## Tasks

- [ ] Add packages/awcms/theme-standard/theme.manifest.json
- [ ] Add theme settings sample
- [ ] Add README

## Acceptance Criteria

- [ ] Theme manifest exists
- [ ] Theme does not require EmDash core changes

## Rollback Plan

Revert theme package changes.
```

### 13.3 Sprint 3 Definition of Done

```txt
[ ] BaseLayout exists
[ ] Header exists
[ ] Footer exists
[ ] homepage shell exists
[ ] global CSS exists
[ ] theme manifest exists
[ ] mobile responsive baseline works
```

---

## 14. Sprint 4 — Core Website Content Modules

### 14.1 Sprint Goal

Add the minimum standard website content model and rendering strategy.

### 14.2 Issues

#### Issue 4.1 — Add Site Settings Strategy

```md
## Goal

Define and implement site settings seed/config strategy.

## Tasks

- [ ] Add site-settings.json
- [ ] Define site identity
- [ ] Define contact/social settings
- [ ] Define SEO defaults
- [ ] Define default tenant/site context

## Acceptance Criteria

- [ ] Settings seed is safe and reusable
- [ ] No private data exists

## Rollback Plan

Revert seed file.
```

#### Issue 4.2 — Add Pages Content Strategy

```md
## Goal

Define pages module behavior for standard websites.

## Tasks

- [ ] Add pages seed
- [ ] Define page fields
- [ ] Define published-only rendering rule
- [ ] Add route strategy

## Acceptance Criteria

- [ ] Pages are documented
- [ ] Public pages exclude drafts/private/deleted content

## Rollback Plan

Revert page strategy changes.
```

#### Issue 4.3 — Add Blog/News Strategy

```md
## Goal

Define blog/news behavior.

## Tasks

- [ ] Add posts seed
- [ ] Define post fields
- [ ] Define listing route
- [ ] Define detail route
- [ ] Define SEO behavior

## Acceptance Criteria

- [ ] News listing and detail strategy exist
- [ ] Published-only rule exists

## Rollback Plan

Revert posts changes.
```

#### Issue 4.4 — Add Menus Strategy

```md
## Goal

Define standard menu structure.

## Tasks

- [ ] Add menus.json
- [ ] Define main menu
- [ ] Define footer menu
- [ ] Document future admin-managed menus

## Acceptance Criteria

- [ ] Menu seed exists
- [ ] Header/footer can use menu data later

## Rollback Plan

Revert menu seed.
```

#### Issue 4.5 — Add Announcements Strategy

```md
## Goal

Define announcements module behavior.

## Tasks

- [ ] Define announcement fields
- [ ] Define public listing behavior
- [ ] Define expiration behavior
- [ ] Define admin management expectation

## Acceptance Criteria

- [ ] Announcements are documented
- [ ] Expired/deleted announcements are hidden

## Rollback Plan

Revert docs/seed changes.
```

### 14.3 Sprint 4 Definition of Done

```txt
[ ] site settings strategy exists
[ ] pages strategy exists
[ ] blog/news strategy exists
[ ] menus strategy exists
[ ] announcements strategy exists
[ ] public content safety rules are documented
```

---

## 15. Sprint 5 — Media, Documents, Forms, and SEO

### 15.1 Sprint Goal

Add the website features most needed by real client websites: media, documents, forms, and SEO.

### 15.2 Issues

#### Issue 5.1 — Add Media Storage Policy and Metadata Baseline

```md
## Goal

Define media object metadata and storage path policy.

## Tasks

- [ ] Add media_objects model docs or migration placeholder
- [ ] Define tenant/site/module object key
- [ ] Define safe filename policy
- [ ] Define public/private visibility
- [ ] Define audit events

## Acceptance Criteria

- [ ] No bare uploads/{filename} pattern
- [ ] Media path includes tenant/site context

## Rollback Plan

Disable media upload or revert media changes.
```

#### Issue 5.2 — Add Documents Module Baseline

```md
## Goal

Create the baseline documents module plan or skeleton.

## Tasks

- [ ] Add packages/plugins/documents skeleton
- [ ] Add module.manifest.json
- [ ] Define permissions
- [ ] Define storage scopes
- [ ] Define public/private document behavior

## Acceptance Criteria

- [ ] Documents module manifest exists
- [ ] Public documents are separate from private documents
- [ ] Private documents require signed URL strategy

## Rollback Plan

Disable documents module.
```

#### Issue 5.3 — Add Forms Module Baseline

```md
## Goal

Create the baseline forms module plan or skeleton.

## Tasks

- [ ] Add packages/plugins/forms skeleton
- [ ] Add module.manifest.json
- [ ] Define form submission behavior
- [ ] Define consent requirements
- [ ] Define spam protection placeholder

## Acceptance Criteria

- [ ] Forms module manifest exists
- [ ] Consent and privacy requirements documented

## Rollback Plan

Disable forms module.
```

#### Issue 5.4 — Add SEO Baseline

```md
## Goal

Define SEO fields, fallback rules, sitemap, and robots strategy.

## Tasks

- [ ] Add docs/seo.md
- [ ] Define SEO fields
- [ ] Define fallback order
- [ ] Define sitemap rules
- [ ] Define private content exclusion

## Acceptance Criteria

- [ ] SEO strategy exists
- [ ] Sitemap excludes private/draft/deleted content

## Rollback Plan

Revert SEO changes.
```

### 15.3 Sprint 5 Definition of Done

```txt
[ ] media storage policy exists
[ ] documents module baseline exists
[ ] forms module baseline exists
[ ] SEO baseline exists
[ ] private content protection rules exist
```

---

## 16. Sprint 6 — Governance Baseline: Tenant, Audit, Module Registry

### 16.1 Sprint Goal

Add the governance layer that prepares AWCMS-Micro for secure, tenant-ready expansion.

### 16.2 Issues

#### Issue 6.1 — Add Default Tenant and Site Baseline

```md
## Goal

Create default tenant and site model.

## Tasks

- [ ] Define default tenant ID/code/name
- [ ] Define default site ID/code/name
- [ ] Add seed/config strategy
- [ ] Add tenant context helper design

## Acceptance Criteria

- [ ] Default tenant documented
- [ ] Default site documented
- [ ] Tenant context strategy exists

## Rollback Plan

Revert tenant baseline changes.
```

#### Issue 6.2 — Add Audit Log Module Baseline

```md
## Goal

Create audit log module skeleton and event taxonomy.

## Tasks

- [ ] Add packages/plugins/audit-log skeleton
- [ ] Add module.manifest.json
- [ ] Define audit_events schema
- [ ] Define required event names
- [ ] Define admin audit page plan

## Acceptance Criteria

- [ ] Audit event taxonomy exists
- [ ] Sensitive actions are listed

## Rollback Plan

Disable audit module only if no production dependency yet.
```

#### Issue 6.3 — Add Module Registry Baseline

```md
## Goal

Create module registry baseline.

## Tasks

- [ ] Add packages/awcms/module-registry structure
- [ ] Define module manifest schema
- [ ] Define module lifecycle states
- [ ] Define install/enable/disable flow

## Acceptance Criteria

- [ ] Module registry docs exist
- [ ] Manifest standard exists
- [ ] Lifecycle states exist

## Rollback Plan

Disable registry UI/feature and keep module configs static.
```

#### Issue 6.4 — Add Permission Registry Baseline

```md
## Goal

Create permission registry baseline for later ABAC.

## Tasks

- [ ] Add packages/awcms/permissions structure
- [ ] Define permission namespace
- [ ] Define MVP permissions
- [ ] Define high-risk permission list

## Acceptance Criteria

- [ ] Permissions are namespaced
- [ ] No random route-level permission strings

## Rollback Plan

Revert permission registry baseline.
```

### 16.3 Sprint 6 Definition of Done

```txt
[ ] default tenant/site baseline exists
[ ] audit log baseline exists
[ ] module registry baseline exists
[ ] permission registry baseline exists
[ ] governance docs are updated
```

---

## 17. Sprint 7 — Security, Testing, and Cloudflare Staging Readiness

### 17.1 Sprint Goal

Prepare the MVP for safe staging deployment and repeatable validation.

### 17.2 Issues

#### Issue 7.1 — Add Security Baseline Documentation

```md
## Goal

Add secure-by-default baseline documentation.

## Tasks

- [ ] Add threat model
- [ ] Add security controls by layer
- [ ] Add secure upload policy
- [ ] Add secret management rule
- [ ] Add audit requirements

## Acceptance Criteria

- [ ] docs/security.md exists
- [ ] high-risk controls are documented

## Rollback Plan

Revert docs changes.
```

#### Issue 7.2 — Add Privacy and Compliance Baseline

```md
## Goal

Add privacy and Indonesian compliance baseline.

## Tasks

- [ ] Add docs/privacy.md
- [ ] Add docs/compliance.md
- [ ] Add form consent requirements
- [ ] Add retention requirements
- [ ] Add school/public-sector considerations

## Acceptance Criteria

- [ ] Privacy baseline exists
- [ ] Consent and retention are documented

## Rollback Plan

Revert docs changes.
```

#### Issue 7.3 — Add Playwright Smoke Test Plan

```md
## Goal

Create initial e2e test plan.

## Tasks

- [ ] Add tests/e2e/README.md
- [ ] Define homepage test using Playwright
- [ ] Define admin route test (use dev-bypass endpoint: `/_emdash/api/auth/dev-bypass`)
- [ ] Define public content test
- [ ] Define form test
- [ ] Define private content leak test
- [ ] Document that vitest is used for unit/integration tests, Playwright for e2e

## Acceptance Criteria

- [ ] E2E test plan exists
- [ ] Critical MVP flows are listed

## Rollback Plan

Revert test plan.
```

#### Issue 7.4 — Add Cloudflare Staging Baseline

```md
## Goal

Prepare safe Cloudflare staging deployment docs/config examples.

## Tasks

- [ ] Add wrangler.example.jsonc
- [ ] Add staging/production separation
- [ ] Add D1/R2/KV placeholder bindings
- [ ] Add secret handling docs
- [ ] Add deployment checklist

## Acceptance Criteria

- [ ] No real secrets or IDs committed
- [ ] Staging/production separation documented

## Rollback Plan

Remove example config.
```

### 17.3 Sprint 7 Definition of Done

```txt
[ ] security baseline exists
[ ] privacy/compliance baseline exists
[ ] e2e smoke test plan exists
[ ] Cloudflare staging baseline exists
[ ] release gate checklist exists
```

---

## 18. Sprint 8 — MVP Release Candidate

### 18.1 Sprint Goal

Stabilize the MVP, fix bugs, run full validation, and prepare release candidate documentation.

### 18.2 Issues

#### Issue 8.1 — Run MVP Compatibility Audit

```md
## Goal

Check MVP compatibility with original EmDash rules and architecture.

## Tasks

- [ ] Review EmDash upstream impact
- [ ] Review plugin compatibility
- [ ] Review template compatibility
- [ ] Review admin route compatibility
- [ ] Review storage compatibility
- [ ] Update compatibility matrix

## Acceptance Criteria

- [ ] Compatibility matrix updated
- [ ] Divergence log updated if needed

## Rollback Plan

Document incompatible features and disable them.
```

#### Issue 8.2 — Run Full Validation

```md
## Goal

Run all MVP validation commands.

## Tasks

- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm test:e2e if configured

## Acceptance Criteria

- [ ] All required validations pass or exceptions are documented

## Rollback Plan

Fix failing issues or delay release.
```

#### Issue 8.3 — Prepare MVP Release Notes

```md
## Goal

Document MVP release scope.

## Tasks

- [ ] Summarize completed features
- [ ] Summarize known limitations
- [ ] Summarize validation results
- [ ] Summarize rollback plan
- [ ] Tag release candidate if appropriate

## Acceptance Criteria

- [ ] Release notes exist
- [ ] Known limitations are transparent

## Rollback Plan

Do not publish release candidate until notes are correct.
```

### 18.3 Sprint 8 Definition of Done

```txt
[ ] compatibility audit complete
[ ] validation complete
[ ] release notes complete
[ ] known limitations documented
[ ] release candidate branch/tag prepared
```

---

## 19. Sprint 9 — Production Deployment Baseline

### 19.1 Sprint Goal

Prepare production deployment baseline after MVP is stable in staging.

### 19.2 Issues

#### Issue 9.1 — Add Production Deployment Checklist

```md
## Goal

Create production deployment checklist.

## Tasks

- [ ] Add production environment checklist
- [ ] Add secret checklist
- [ ] Add DNS checklist
- [ ] Add D1/R2/KV checklist
- [ ] Add rollback checklist

## Acceptance Criteria

- [ ] Production checklist exists
- [ ] Manual approval requirement exists

## Rollback Plan

Revert checklist changes.
```

#### Issue 9.2 — Add Post-Deployment Smoke Tests

```md
## Goal

Create post-deployment smoke test checklist.

## Tasks

- [ ] Homepage test
- [ ] Admin test
- [ ] Public content test
- [ ] Document route test
- [ ] Mobile bootstrap endpoint test
- [ ] Worker log check

## Acceptance Criteria

- [ ] Smoke test checklist exists
- [ ] Production validation steps are clear

## Rollback Plan

Rollback deployment if smoke tests fail.
```

#### Issue 9.3 — Add Operations Runbook

```md
## Goal

Add daily/weekly/monthly operations checklist.

## Tasks

- [ ] Add daily checks
- [ ] Add weekly checks
- [ ] Add monthly checks
- [ ] Add quarterly restore drill
- [ ] Add incident severity model

## Acceptance Criteria

- [ ] Operations runbook exists
- [ ] Incident response steps exist

## Rollback Plan

Revert docs changes.
```

### 19.3 Sprint 9 Definition of Done

```txt
[ ] production checklist exists
[ ] smoke test checklist exists
[ ] operations runbook exists
[ ] incident response exists
[ ] maintenance checklist exists
```

---

## 20. MVP Backlog Summary Table

| ID  | Title                               | Milestone | Priority | Area          |
| --- | ----------------------------------- | --------- | -------- | ------------- |
| 0.1 | Inspect EmDash and SMAN 2 Reference | M0        | P0       | docs          |
| 0.2 | Create Labels and Milestones        | M0        | P0       | project       |
| 0.3 | Create Repository Foundation        | M0        | P0       | repo          |
| 1.1 | Add Upstream Sync Policy            | M1        | P0       | emdash-compat |
| 1.2 | Add Compatibility Matrix            | M1        | P0       | emdash-compat |
| 1.3 | Add Divergence Log                  | M1        | P0       | emdash-compat |
| 1.4 | Add Architecture Docs               | M1        | P0       | docs          |
| 2.1 | Add Local Site Package              | M2        | P0       | frontend      |
| 2.2 | Add Astro Config                    | M2        | P0       | frontend      |
| 2.3 | Add Env Examples                    | M2        | P0       | config        |
| 2.4 | Add Validation Script               | M2        | P0       | test          |
| 3.1 | Add Base Layout                     | M3        | P0       | frontend      |
| 3.2 | Add Header/Footer                   | M3        | P0       | frontend      |
| 3.3 | Add Homepage Shell                  | M3        | P0       | frontend      |
| 3.4 | Add Theme Manifest                  | M3        | P1       | theme         |
| 4.1 | Add Site Settings Strategy          | M4        | P0       | content       |
| 4.2 | Add Pages Strategy                  | M4        | P0       | content       |
| 4.3 | Add Blog/News Strategy              | M4        | P0       | content       |
| 4.4 | Add Menus Strategy                  | M4        | P0       | content       |
| 4.5 | Add Announcements Strategy          | M4        | P1       | content       |
| 5.1 | Add Media Storage Policy            | M5        | P0       | storage       |
| 5.2 | Add Documents Module Baseline       | M5        | P0       | documents     |
| 5.3 | Add Forms Module Baseline           | M5        | P0       | forms         |
| 5.4 | Add SEO Baseline                    | M5        | P0       | seo           |
| 6.1 | Add Default Tenant/Site             | M6        | P0       | tenancy       |
| 6.2 | Add Audit Log Baseline              | M6        | P0       | audit         |
| 6.3 | Add Module Registry Baseline        | M6        | P0       | modules       |
| 6.4 | Add Permission Registry Baseline    | M6        | P1       | access        |
| 7.1 | Add Security Baseline               | M7        | P0       | security      |
| 7.2 | Add Privacy/Compliance Baseline     | M7        | P0       | compliance    |
| 7.3 | Add E2E Smoke Test Plan             | M7        | P0       | test          |
| 7.4 | Add Cloudflare Staging Baseline     | M7        | P0       | deployment    |
| 8.1 | Run Compatibility Audit             | M8        | P0       | compat        |
| 8.2 | Run Full Validation                 | M8        | P0       | release       |
| 8.3 | Prepare MVP Release Notes           | M8        | P0       | release       |
| 9.1 | Add Production Checklist            | M9        | P1       | deployment    |
| 9.2 | Add Post-Deployment Smoke Tests     | M9        | P1       | test          |
| 9.3 | Add Operations Runbook              | M9        | P1       | ops           |

---

## 21. Release Gates

### 21.1 Gate 1 — Repository Foundation Gate

Required:

```txt
AGENTS.md exists
README.md exists
.gitignore protects secrets
.env.example exists
repository structure exists
initial docs exist
```

### 21.2 Gate 2 — Local Development Gate

Required:

```txt
pnpm install works
local site can run or pending reason documented
homepage exists
build path is known
validation script exists
```

### 21.3 Gate 3 — Core Website Gate

Required:

```txt
homepage
header/footer
pages strategy
news strategy
menus strategy
SEO baseline
public content safety rules
```

### 21.4 Gate 4 — Interaction Modules Gate

Required:

```txt
media policy
documents baseline
forms baseline
secure upload rules
privacy/consent rules
```

### 21.5 Gate 5 — Governance Gate

Required:

```txt
default tenant/site
audit baseline
module registry baseline
permission registry baseline
soft delete strategy
```

### 21.6 Gate 6 — Security and Deployment Gate

Required:

```txt
security docs
privacy/compliance docs
testing docs
Cloudflare staging docs
backup/restore docs
release checklist
```

### 21.7 Gate 7 — MVP Release Candidate Gate

Required:

```txt
compatibility matrix updated
divergence log updated
validation commands run
known limitations documented
release notes prepared
rollback plan exists
```

---

## 22. MVP Acceptance Criteria

The MVP is acceptable when:

```txt
[ ] It follows original EmDash architecture and docs.
[ ] It has no undocumented EmDash core divergence.
[ ] It has a clean repository structure.
[ ] It has a working or clearly documented local development path.
[ ] It has a public website shell.
[ ] It has content strategy for pages/news/menus/announcements.
[ ] It has media, documents, forms, and SEO baseline.
[ ] It has default tenant/site strategy.
[ ] It has module registry and audit baseline.
[ ] It has security and privacy documentation.
[ ] It has Cloudflare staging/deployment documentation.
[ ] It has validation scripts or documented equivalent commands.
[ ] It has GitHub Issues and milestones.
[ ] It has a rollback plan.
```

---

## 23. Risk Register for MVP

| Risk                                           |   Impact | Likelihood | Mitigation                                 |
| ---------------------------------------------- | -------: | ---------: | ------------------------------------------ |
| EmDash upstream changes break integration      |     High |     Medium | compatibility matrix, upstream sync policy |
| AWCMS custom logic becomes fragile fork        |     High |     Medium | isolate in plugins/modules/docs/tests      |
| Secret accidentally committed                  | Critical | Low/Medium | .gitignore, secret scanning, review        |
| Private documents exposed                      | Critical |     Medium | signed URLs, ABAC, audit, tests            |
| Overengineering MVP                            |   Medium |       High | strict MVP scope                           |
| Cloudflare config accidentally uses production |     High |     Medium | staging/prod separation, manual approval   |
| Lack of tests slows updates                    |     High |     Medium | smoke tests, validation scripts            |
| Permission system becomes confusing            |     High |     Medium | permission registry, matrix GUI later      |
| Bad migration corrupts data                    |     High | Low/Medium | backup, staging migration, rollback docs   |
| Plugin breaks marketplace compatibility        |     High |     Medium | plugin compatibility tests                 |

---

## 24. OpenCode / Antigravity Master Prompt for Part 9

Use this prompt to implement the MVP sprint/backlog foundation.

```txt
You are an expert AI-native software architect, TypeScript/Astro developer, EmDash-compatible CMS engineer, AWCMS-Micro product strategist, security engineer, Cloudflare deployment engineer, and GitHub project manager.

TASK:
Implement Part 9 of the AWCMS-Micro documentation: MVP Implementation Sprint Plan and GitHub Issue Backlog.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–8

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/compatibility-matrix.md, docs/divergence-log.md, docs/modules.md, docs/security.md, docs/deployment.md, and docs/testing.md.
3. Treat EmDash upstream as the architectural authority.
4. Treat the SMAN 2 repo as reference only.
5. Do not modify EmDash core unless there is no safe extension path.
6. Use GitHub Issues for non-trivial work.
7. Create labels and milestones if missing.
8. Create a branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Do not commit secrets, local DB files, uploaded files, or production config.
12. Merge only after validation and delete the branch after merge.

GOAL:
Create the MVP sprint plan, GitHub Issue backlog, labels, milestones, release gates, and implementation roadmap for AWCMS-Micro.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Read existing docs.
- Inspect package scripts.
- Inspect current GitHub Issues if GitHub MCP is available.
- Summarize gaps against Parts 1–8.

PHASE 1 — BRANCH
Create branch:
docs/add-mvp-sprint-plan-backlog

PHASE 2 — GITHUB LABELS
Create labels if missing:
- type:docs
- type:feature
- type:bug
- type:refactor
- type:test
- type:security
- type:deployment
- type:chore
- area:emdash-compat
- area:frontend
- area:admin
- area:database
- area:storage
- area:plugin
- area:module-registry
- area:abac
- area:mobile-api
- area:cloudflare
- area:security
- area:docs
- priority:p0
- priority:p1
- priority:p2
- priority:p3
- status:blocked
- status:ready
- status:in-progress
- status:needs-review
- status:done

PHASE 3 — GITHUB MILESTONES
Create milestones if missing:
- M0 — Discovery and Foundation
- M1 — Local Website Baseline
- M2 — Standard Website Core
- M3 — Interaction Modules
- M4 — Governance Baseline
- M5 — Security and Staging Readiness
- M6 — MVP Release Candidate
- M7 — Production Deployment Baseline

PHASE 4 — ISSUE TEMPLATE
Add GitHub issue template under:
.github/ISSUE_TEMPLATE/awcms-micro-atomic-task.md

Include:
- goal
- context
- scope
- out of scope
- tasks
- acceptance criteria
- validation
- security/compliance notes
- EmDash compatibility impact
- rollback plan

PHASE 5 — CREATE MVP ISSUES
Create or update atomic GitHub Issues for the MVP backlog:
- Inspect EmDash and SMAN 2 Reference Repository
- Create Repository Foundation
- Add EmDash Upstream Sync Policy
- Add Compatibility Matrix
- Add Divergence Log
- Add Local Site Package
- Add Local Astro Configuration
- Add Environment Examples
- Add Validation Script
- Add Base Public Layout
- Add Header and Footer Components
- Add Homepage Shell
- Add Standard Theme Manifest
- Add Site Settings Strategy
- Add Pages Content Strategy
- Add Blog/News Strategy
- Add Menus Strategy
- Add Announcements Strategy
- Add Media Storage Policy
- Add Documents Module Baseline
- Add Forms Module Baseline
- Add SEO Baseline
- Add Default Tenant and Site Baseline
- Add Audit Log Module Baseline
- Add Module Registry Baseline
- Add Permission Registry Baseline
- Add Security Baseline
- Add Privacy and Compliance Baseline
- Add Playwright Smoke Test Plan
- Add Cloudflare Staging Baseline
- Run MVP Compatibility Audit
- Run Full Validation
- Prepare MVP Release Notes

PHASE 6 — DOCUMENTATION
Create or update:
- docs/mvp-sprint-plan.md
- docs/github-backlog.md
- docs/release-gates.md
- docs/risk-register.md
- docs/testing.md
- docs/rollback.md

PHASE 7 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 8 — COMMIT
Commit:
docs: add MVP sprint plan and GitHub backlog

PHASE 9 — FINAL REPORT
Report:
1. labels created/updated
2. milestones created/updated
3. issues created/updated
4. branch name
5. files changed
6. validation results
7. EmDash compatibility impact
8. risks
9. rollback plan
10. next recommended implementation issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- force pushing
- deleting issues/milestones
- modifying EmDash core
- changing production Cloudflare resources
- committing secrets
- running destructive migrations
```

---

## 25. Definition of Done for Part 9

Part 9 is complete when:

```txt
[ ] MVP definition is documented
[ ] milestones are defined
[ ] sprint model is documented
[ ] dependency map exists
[ ] GitHub labels are defined
[ ] GitHub milestones are defined
[ ] issue template exists
[ ] sprint 0–9 issues are documented
[ ] backlog summary table exists
[ ] release gates are defined
[ ] MVP acceptance criteria exist
[ ] MVP risk register exists
[ ] OpenCode/Antigravity prompt exists
[ ] rollback plan exists
```

---

## 26. Recommended Next Part

Continue with:

```txt
Part 10 — AWCMS-Micro Standard Website Template Specification
```

Part 10 should include:

- standard website template structure;
- school/company/foundation/government/landing page variants;
- starter content model;
- reusable sections;
- theme presets;
- homepage patterns;
- SEO presets;
- seed data;
- accessibility checklist;
- implementation prompt.
