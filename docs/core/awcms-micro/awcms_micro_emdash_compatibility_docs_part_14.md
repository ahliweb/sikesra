# AWCMS-Micro Implementation Documentation

## Part 14 — EmDash Upstream Sync and Compatibility Maintenance Playbook

**Document status:** Draft v0.1  
**Purpose:** Define the upstream synchronization, compatibility maintenance, divergence control, testing, rollback, and GitHub workflow for keeping AWCMS-Micro aligned with the original EmDash repository and official EmDash standards over time.

---

## 1. Objective of Part 14

Part 14 defines the long-term maintenance playbook for AWCMS-Micro so it can continue tracking EmDash upstream safely.

This document covers:

1. upstream sync philosophy;
2. upstream remote strategy;
3. sync frequency;
4. pre-sync checklist;
5. merge/rebase policy;
6. branch workflow;
7. compatibility matrix update;
8. divergence log update;
9. plugin and template compatibility tests;
10. database and migration compatibility checks;
11. admin and API compatibility checks;
12. Cloudflare deployment compatibility checks;
13. rollback from bad upstream sync;
14. GitHub Issues and PR workflow;
15. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
EmDash upstream is the architectural reference.
AWCMS-Micro is the governed implementation.
Custom logic must remain isolated so upstream updates remain possible.
```

---

## 2. Upstream Sync Philosophy

AWCMS-Micro must not become a fragile fork.

A fragile fork happens when:

- EmDash core files are modified directly without documentation;
- custom AWCMS business logic is mixed into upstream internals;
- plugin conventions are changed silently;
- admin routes are hardcoded instead of manifest-driven;
- storage or schema behavior diverges without tests;
- marketplace/template compatibility is ignored;
- divergence is not logged.

Correct strategy:

```txt
Track EmDash upstream regularly.
Understand upstream changes.
Adopt safe changes.
Adapt AWCMS-Micro modules through adapters.
Delay risky changes when needed.
Reject incompatible changes only with documentation.
```

---

## 3. Canonical Upstream References

### 3.1 Primary Upstream Repository

```txt
https://github.com/emdash-cms/emdash
```

### 3.2 Official Documentation

```txt
https://docs.emdashcms.com/
https://docs.emdashcms.com/llms.txt          (AI-optimized document index)
https://docs.emdashcms.com/docs-mcp/         (EmDash Docs MCP server)
```

The `/llms.txt` file provides machine-readable summaries of all upstream pages. The Docs MCP server provides real-time documentation access for AI coding assistants.

### 3.3 EmDash Contributor Guide

```txt
https://github.com/emdash-cms/emdash/blob/main/AGENTS.md
```

The AGENTS.md defines canonical toolchain (oxfmt, oxlint, vitest, tsdown), import paths, plugin API patterns, and testing conventions.

### 3.4 Reference-Only AWCMS-Micro Implementation

```txt
https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
```

The SMAN 2 repository may be used for learning patterns, but it is not upstream authority.

### 3.5 Authority Order

When sources conflict:

```txt
1. Original EmDash repository
2. Official EmDash documentation
3. EmDash /llms.txt and Docs MCP
4. EmDash AGENTS.md
5. AWCMS-Micro AGENTS.md and governance docs
6. AWCMS-Micro compatibility matrix
7. AWCMS-Micro reference implementation
8. Local implementation preference
```

---

## 4. Repository Remote Strategy

### 4.1 Recommended Remotes

```bash
git remote -v
```

Expected:

```txt
origin    git@github.com:<your-org>/<your-awcms-micro-repo>.git
upstream  https://github.com/emdash-cms/emdash.git
reference https://github.com/ahliweb/awcms-micro-sman2pangkalanbun.git optional read-only
```

### 4.2 Add Upstream Remote

```bash
git remote add upstream https://github.com/emdash-cms/emdash.git
```

### 4.3 Add Reference Remote Carefully

Optional:

```bash
git remote add reference https://github.com/ahliweb/awcms-micro-sman2pangkalanbun.git
```

Rule:

```txt
Do not push to reference remote.
Treat it as read-only reference.
```

### 4.4 Remote Naming Rule

```txt
origin = your implementation repository
upstream = original EmDash repository
reference = reference implementation only
```

Do not confuse these.

---

## 5. Sync Frequency

Recommended schedule:

| Repository Stage              | Sync Frequency                            |
| ----------------------------- | ----------------------------------------- |
| Early development             | weekly or before major feature work       |
| Active production site        | monthly or before release window          |
| Security-sensitive deployment | immediately after upstream security fix   |
| Stable low-change site        | monthly/quarterly with staging validation |
| Marketplace/plugin-heavy site | before installing/updating plugins        |

### 5.1 Sync Trigger Events

Run upstream sync review when:

```txt
EmDash releases new version
security fix is announced
plugin API changes
admin behavior changes
media/storage flow changes
schema/migration changes
template system changes
before major AWCMS-Micro release
before marketplace plugin installation
before production deployment
```

---

## 6. Sync Decision Framework

Every upstream change should be classified as:

```txt
Adopt
Adapt
Delay
Reject
```

### 6.1 Adopt

Use when:

- change is compatible;
- tests pass;
- improves stability/security;
- no AWCMS governance conflict.

### 6.2 Adapt

Use when:

- upstream change is useful;
- AWCMS-Micro needs adapter changes;
- module/plugin interface needs update;
- no core fork is required.

### 6.3 Delay

Use when:

- change is large;
- tests are not ready;
- plugin compatibility is uncertain;
- production risk is high.

### 6.4 Reject

Use only when:

- change conflicts with AWCMS security/governance;
- breaks critical tenant-readiness;
- breaks required compliance controls;
- cannot be safely adapted.

Reject must be documented in divergence log.

---

## 7. Pre-Sync Checklist

Before fetching or merging upstream:

```txt
[ ] Current work committed or stashed
[ ] Local branch clean
[ ] GitHub Issue created
[ ] Dedicated sync branch planned
[ ] Current origin main is up to date
[ ] Current deployment version recorded if production-related
[ ] Database migration state known
[ ] Backup considered for production sync
[ ] Compatibility matrix reviewed
[ ] Divergence log reviewed
[ ] EmDash release notes/docs reviewed if available
```

Commands:

```bash
git status
git checkout main
git pull origin main
git fetch upstream
```

---

## 8. Sync Branch Strategy

Use dedicated branches.

### 8.1 Branch Naming

```txt
sync/emdash-upstream-YYYYMMDD
sync/emdash-upstream-vX-Y-Z
sync/emdash-security-fix-YYYYMMDD
```

Example:

```bash
git checkout -b sync/emdash-upstream-20260506
```

### 8.2 Branch Rule

```txt
Never sync upstream directly on main.
Never sync upstream directly on production hotfix branch unless emergency-approved.
```

---

## 9. Merge vs Rebase Policy

### 9.1 Recommended Default: Merge

For implementation repositories, prefer merge to preserve history:

```bash
git merge upstream/main
```

Why:

- easier to audit;
- safer for collaborative repositories;
- preserves upstream sync point;
- avoids rewriting shared history.

### 9.2 Rebase Use Cases

Use rebase only when:

- repository is still private/early;
- branch is not shared;
- team agrees;
- no production history risk.

### 9.3 Squash Policy

Squash PRs are acceptable for AWCMS feature work.

Avoid squashing upstream sync history if it removes useful traceability.

### 9.4 Force Push Rule

```txt
Do not force push shared branches.
Do not force push main.
```

---

## 10. Upstream Sync Procedure

### 10.1 Standard Procedure

```bash
git checkout main
git pull origin main
git fetch upstream
git checkout -b sync/emdash-upstream-YYYYMMDD
git merge upstream/main
```

Then:

```txt
resolve conflicts
run validation
update compatibility matrix
update divergence log
commit conflict/adaptation changes
open PR
review
merge
delete branch
```

### 10.2 If Conflicts Occur

For each conflict:

```txt
identify upstream intent
identify AWCMS custom change
prefer upstream when safe
move custom logic into adapter/module/plugin/theme/docs/tests
avoid embedding custom logic into upstream core
update divergence log if custom divergence remains
```

### 10.3 Conflict Documentation

For every meaningful conflict, record:

```txt
file path
upstream change
AWCMS change
resolution
risk
validation performed
```

---

## 11. Compatibility Matrix Maintenance

File:

```txt
docs/compatibility-matrix.md
```

### 11.1 Required Matrix Columns

```txt
Area
Upstream Component
AWCMS-Micro Component
Compatibility Status
Last Checked
Risk Level
Test Coverage
Notes
```

### 11.2 Compatibility Areas

Track:

```txt
repository structure
package manager/build scripts
Astro integration
admin routes
plugin API
marketplace plugin assumptions
content collections
database schema/migrations
media/upload flow
storage adapters
admin UI extension points
template compatibility
mobile API boundary
Cloudflare deployment
security/auth/permissions
```

### 11.3 Status Values

```txt
compatible
compatible-with-adapter
needs-review
blocked
diverged
not-applicable
```

### 11.4 Update Rule

```txt
Every upstream sync PR must update the compatibility matrix or explicitly state why no update is needed.
```

---

## 12. Divergence Log Maintenance

File:

```txt
docs/divergence-log.md
```

### 12.1 Divergence Log Columns

```txt
Date
Area
File/Module
Upstream Behavior
AWCMS-Micro Behavior
Reason
Risk
Rollback Plan
Review Date
```

### 12.2 What Must Be Logged

Log divergence when AWCMS-Micro:

- changes EmDash core behavior;
- overrides admin route behavior;
- changes plugin loading behavior;
- changes storage/upload flow;
- changes content schema assumptions;
- changes authentication/authorization behavior;
- adds adapter that compensates for upstream behavior;
- rejects upstream change.

### 12.3 What Does Not Need Divergence Log

Usually not needed for:

- separate AWCMS module;
- separate theme;
- separate public template;
- documentation-only addition;
- tests that do not alter behavior.

### 12.4 Divergence Rule

```txt
Undocumented divergence is technical debt.
Documented divergence is a managed design decision.
```

---

## 13. Upstream Change Impact Review

Every sync must review these impact areas.

### 13.1 Database Impact

Check:

```txt
new migrations
changed schema assumptions
soft delete behavior
collection table changes
index changes
SQLite/D1/PostgreSQL compatibility
```

### 13.2 Plugin Impact

Check:

```txt
plugin API changes (definePlugin() signature)
hook name changes (e.g., beforeSave, afterSave, onSetup)
capability declarations
marketplace assumptions
admin page registration
route namespace changes (/_emdash/api/plugins/*)
plugin lifecycle changes
Native vs Sandboxed plugin mode changes
Dynamic Worker Loader changes
```

### 13.3 Admin Impact

Check:

```txt
admin route changes
menu/navigation changes
form/editor changes
media manager changes
auth/session changes
UI package changes
```

### 13.4 Storage/Media Impact

Check:

```txt
upload-url flow
signed URL flow
media object metadata
file validation
storage adapter API
R2/S3 compatibility
```

### 13.5 Public Frontend Impact

Check:

```txt
Astro version/integration
content rendering
template assumptions
routing behavior
SEO behavior
build output
```

### 13.6 Security Impact

Check:

```txt
authentication changes
authorization changes
CSRF/trusted request behavior
upload security
dependency vulnerabilities
secret handling
```

### 13.7 Cloudflare Impact

Check:

```txt
Worker compatibility
Node compatibility flags
D1 compatibility
R2 bindings
KV usage
Wrangler config changes
build adapter changes
```

---

## 14. Validation Commands

Run after upstream sync:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If available:

```bash
pnpm test:e2e
pnpm test:compat
pnpm test:security
pnpm test:playwright
```

Cloudflare/staging validation:

```bash
npx wrangler deploy --env staging
```

Only after local validation passes.

---

## 15. Compatibility Test Suite

### 15.1 Required Compatibility Tests

```txt
EmDash admin opens
EmDash content collections load
page creation works
post creation works
media upload request works
media confirm flow works
plugin admin pages load
AWCMS module manifests validate
public frontend builds
public pages render
private content remains hidden
mobile API contract remains stable
Cloudflare staging deploy works
```

### 15.2 Plugin Compatibility Tests

Test:

```txt
native plugin loads
module manifest validates
permissions register
storage scopes validate
admin page registers
API route responds
plugin disable hides route/menu
```

### 15.3 Template Compatibility Tests

Test:

```txt
standard template builds
school template builds
seed data is safe
SEO tags render
sitemap excludes private content
Astro routes work
```

### 15.4 Security Compatibility Tests

Test:

```txt
admin authentication still works
unauthorized admin route denied
private document requires signed URL
draft/deleted content hidden
upload blocklist still works
ABAC deny case still works
```

---

## 16. Database and Migration Sync Playbook

### 16.1 If Upstream Adds Migrations

Steps:

```txt
read migration file
identify affected tables
check D1/SQLite/PostgreSQL compatibility
run on local database
run on staging database
verify AWCMS custom tables unaffected
update compatibility matrix
```

### 16.2 If Upstream Changes Existing Schema

Steps:

```txt
identify breaking changes
check AWCMS adapters/modules
update service layer if needed
add migration adaptation only outside core if possible
run tests
```

### 16.3 If Migration Conflicts with AWCMS Custom Tables

Resolution order:

```txt
protect data
understand upstream intent
adapt AWCMS custom tables
avoid changing upstream migration directly unless necessary
create corrective AWCMS migration if needed
document divergence
```

### 16.4 Production Migration Rule

```txt
Never run upstream-related production migration without staging validation and rollback plan.
```

---

## 17. Plugin and Marketplace Compatibility Playbook

### 17.1 Before Installing or Updating Plugin

Check:

```txt
plugin supported EmDash version
requested capabilities
storage scopes
network access
admin pages
migration impact
security risk
rollback plan
```

### 17.2 Capability Change Rule

```txt
If plugin update requests new capabilities, require explicit approval.
```

### 17.3 Sandbox Plugin Rule

```txt
Sandbox plugins may be safer, but still require capability review and staging test.
```

### 17.4 Plugin Breakage Rollback

```txt
disable plugin
revert plugin version
clear related cache
preserve data
restore backup if data corrupted
write audit event
```

---

## 18. Template Compatibility Playbook

### 18.1 Before Applying New EmDash Template

Check:

```txt
Astro structure
content collection assumptions
required plugins
media usage
admin dependencies
route conflicts
SEO behavior
private content handling
Cloudflare build compatibility
```

### 18.2 Template Adaptation Rule

```txt
Adapt templates through theme/layout/settings/seed files.
Do not change EmDash core to fit a template.
```

### 18.3 Template Rollback

```txt
switch to previous theme/template
revert seed changes if safe
restore database backup if seed was destructive
purge public cache if content leak occurred
```

---

## 19. Cloudflare Compatibility Playbook

### 19.1 Before Upstream Sync Deployment to Cloudflare

Check:

```txt
build output path
Worker entrypoint
compatibility_date
compatibility_flags
Node.js compatibility requirements
D1 binding names
R2 binding names
KV binding names
environment variables
secrets
routes
```

### 19.2 Staging First Rule

```txt
Every upstream sync must deploy to staging before production unless it is documentation-only.
```

### 19.3 Production Deployment Gate

```txt
[ ] staging deployment passed
[ ] smoke tests passed
[ ] no private content leak
[ ] admin route works
[ ] mobile API bootstrap works
[ ] rollback deployment known
```

---

## 20. Rollback from Bad Upstream Sync

### 20.1 Code Rollback

```bash
git revert <merge_commit>
```

or:

```bash
git checkout main
git reset --hard <previous_good_commit>
```

Use reset only when safe and team-approved.

### 20.2 Deployment Rollback

```txt
rollback Cloudflare Worker deployment
restore previous static deployment
switch route to previous deployment if available
```

### 20.3 Database Rollback

Options:

```txt
D1 point-in-time restore
restore backup
corrective forward migration
module disable
feature flag disable
```

### 20.4 Plugin Rollback

```txt
disable plugin
revert plugin version
remove new capability approval
preserve data
```

### 20.5 Emergency Compatibility Patch

Use only when:

```txt
production is broken
rollback is not immediately possible
patch is small and reversible
a GitHub Issue is created
post-incident cleanup is scheduled
```

---

## 21. Upstream Sync GitHub Issue Template

```md
## Goal

Sync AWCMS-Micro with latest EmDash upstream safely.

## Upstream Reference

- Repository: https://github.com/emdash-cms/emdash
- Branch/tag/commit:
- Official docs reviewed:

## Scope

- [ ] Fetch upstream
- [ ] Merge/rebase on sync branch
- [ ] Resolve conflicts
- [ ] Review database impact
- [ ] Review plugin impact
- [ ] Review admin impact
- [ ] Review media/storage impact
- [ ] Review public frontend impact
- [ ] Review security impact
- [ ] Review Cloudflare impact

## Validation

- [ ] pnpm install
- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm test:e2e if available
- [ ] staging deploy if code/runtime changed

## Documentation Updates

- [ ] compatibility matrix updated
- [ ] divergence log updated if needed
- [ ] release notes updated
- [ ] rollback notes updated

## Risks

List known risks.

## Rollback Plan

Explain code, database, plugin, and deployment rollback.
```

---

## 22. Upstream Sync PR Template

```md
## Summary

This PR syncs AWCMS-Micro with EmDash upstream.

## Upstream Commit/Tag

- Upstream source:
- Commit/tag:

## Change Classification

- [ ] Adopt
- [ ] Adapt
- [ ] Delay
- [ ] Reject

## Impact Areas

- [ ] Admin
- [ ] Plugin API
- [ ] Templates
- [ ] Database/migrations
- [ ] Media/storage
- [ ] Public frontend
- [ ] Mobile API
- [ ] Security/auth
- [ ] Cloudflare deployment

## Conflict Resolutions

List conflict files and resolutions.

## Validation Results

- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] pnpm test
- [ ] pnpm build
- [ ] e2e/staging smoke test

## Documentation

- [ ] compatibility matrix updated
- [ ] divergence log updated if needed

## Rollback Plan

Explain rollback steps.
```

---

## 23. Release Notes for Upstream Sync

Every sync release note should include:

```txt
EmDash upstream commit/tag
summary of upstream changes
AWCMS-Micro adaptations
compatibility impact
migration impact
plugin/template impact
security impact
validation results
known limitations
rollback notes
```

---

## 24. Upstream Sync Cadence Checklist

### Weekly/Monthly Review

```txt
[ ] check EmDash repository activity
[ ] check official docs changes
[ ] check dependency updates
[ ] check security advisories
[ ] check plugin compatibility notes
[ ] decide whether sync is needed
```

### Before Major AWCMS-Micro Release

```txt
[ ] sync or consciously delay upstream
[ ] update compatibility matrix
[ ] run full validation
[ ] test plugins/templates
[ ] deploy to staging
[ ] document risk
```

### After Production Deployment

```txt
[ ] monitor logs
[ ] verify admin
[ ] verify public pages
[ ] verify media upload/download
[ ] verify private documents
[ ] verify mobile API bootstrap
[ ] record release note
```

---

## 25. Practical Sync Scenarios

### Scenario 1 — Upstream Admin UI Update

Risk:

```txt
custom admin pages or menu registration may break
```

Action:

```txt
inspect admin extension points
run admin Playwright tests
verify module menus
update admin adapter if needed
```

### Scenario 2 — Upstream Plugin API Change

Risk:

```txt
AWCMS modules fail to load
marketplace plugin compatibility changes
```

Action:

```txt
update module manifest validator
test native plugins
test plugin disable/enable
update docs/modules.md
```

### Scenario 3 — Upstream Media Upload Flow Change

Risk:

```txt
R2 signed upload flow breaks
private document download flow affected
```

Action:

```txt
review upload-url and confirm flow
test media upload
test Kelulusan PDF storage/download
update storage adapter
```

### Scenario 4 — Upstream Database Migration Change

Risk:

```txt
D1/SQLite compatibility or custom table assumptions break
```

Action:

```txt
run migrations locally
run staging migration
backup before production
update compatibility matrix
```

### Scenario 5 — Upstream Astro/Build Change

Risk:

```txt
Cloudflare Worker build output breaks
```

Action:

```txt
run pnpm build
run wrangler deploy to staging
check Worker logs
update deployment docs
```

---

## 26. GitHub Issues for Part 14

### Issue 1 — Add Upstream Remote and Sync Policy

```md
## Goal

Document and configure the upstream sync policy for original EmDash.

## Tasks

- [ ] Document upstream remote strategy
- [ ] Define origin/upstream/reference remote names
- [ ] Define sync frequency
- [ ] Define sync branch naming
- [ ] Define merge/rebase policy

## Acceptance Criteria

- [ ] docs/upstream-sync.md updated
- [ ] remote strategy is clear
- [ ] force-push rules are documented

## Rollback Plan

Revert documentation changes.
```

### Issue 2 — Add Compatibility Matrix Maintenance Process

```md
## Goal

Define how compatibility matrix must be maintained during upstream sync.

## Tasks

- [ ] Define compatibility areas
- [ ] Define status values
- [ ] Define required columns
- [ ] Define update rule for sync PRs

## Acceptance Criteria

- [ ] docs/compatibility-matrix.md updated
- [ ] sync PR must update matrix or explain no update

## Rollback Plan

Revert matrix process changes.
```

### Issue 3 — Add Divergence Log Maintenance Process

```md
## Goal

Define what must be recorded in divergence log.

## Tasks

- [ ] Define divergence log columns
- [ ] Define what must be logged
- [ ] Define what does not need logging
- [ ] Add undocumented divergence warning

## Acceptance Criteria

- [ ] docs/divergence-log.md updated
- [ ] divergence criteria are clear

## Rollback Plan

Revert divergence log process changes.
```

### Issue 4 — Add Upstream Sync Validation Checklist

```md
## Goal

Create validation checklist for upstream sync.

## Tasks

- [ ] Add database impact checklist
- [ ] Add plugin impact checklist
- [ ] Add admin impact checklist
- [ ] Add storage/media impact checklist
- [ ] Add security impact checklist
- [ ] Add Cloudflare impact checklist

## Acceptance Criteria

- [ ] docs/upstream-sync.md includes validation checklist
- [ ] tests and staging requirements are documented

## Rollback Plan

Revert checklist changes.
```

### Issue 5 — Add Upstream Sync Issue and PR Templates

```md
## Goal

Create GitHub templates for upstream sync issues and PRs.

## Tasks

- [ ] Add upstream sync issue template
- [ ] Add upstream sync PR template section
- [ ] Include compatibility and rollback sections
- [ ] Include validation checklist

## Acceptance Criteria

- [ ] templates exist or are documented
- [ ] sync workflow is repeatable

## Rollback Plan

Remove template changes.
```

### Issue 6 — Add Bad Sync Rollback Playbook

```md
## Goal

Document rollback procedures for bad upstream sync.

## Tasks

- [ ] Define code rollback
- [ ] Define deployment rollback
- [ ] Define database rollback
- [ ] Define plugin rollback
- [ ] Define emergency patch criteria

## Acceptance Criteria

- [ ] docs/rollback.md updated
- [ ] sync rollback is actionable

## Rollback Plan

Revert rollback documentation changes.
```

---

## 27. OpenCode / Antigravity Implementation Prompt for Part 14

```txt
You are an expert Git, GitHub, TypeScript, Astro, EmDash, AWCMS-Micro, plugin compatibility, database migration, Cloudflare deployment, security, and release engineering implementation agent.

TASK:
Implement Part 14 of the AWCMS-Micro documentation: EmDash Upstream Sync and Compatibility Maintenance Playbook.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–13

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/compatibility-matrix.md, docs/divergence-log.md, docs/modules.md, docs/security.md, docs/storage.md, docs/deployment.md, docs/testing.md, and docs/rollback.md.
3. Treat EmDash upstream as the architectural authority.
4. Treat the SMAN 2 repository as reference-only.
5. Do not modify EmDash core unless no safe extension path exists and divergence is documented.
6. Use GitHub Issues for non-trivial work.
7. Create a dedicated branch before implementation.
8. Make atomic changes.
9. Run validation before completion.
10. Do not commit secrets, local databases, uploaded files, production config, or private data.
11. Do not force push shared branches.

GOAL:
Create the upstream sync and compatibility maintenance playbook so AWCMS-Micro can safely track original EmDash over time.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Read existing docs Parts 1–13.
- Inspect current upstream-sync docs.
- Inspect compatibility matrix and divergence log.
- Summarize missing maintenance controls.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Add Upstream Remote and Sync Policy
2. Add Compatibility Matrix Maintenance Process
3. Add Divergence Log Maintenance Process
4. Add Upstream Sync Validation Checklist
5. Add Upstream Sync Issue and PR Templates
6. Add Bad Sync Rollback Playbook

PHASE 2 — BRANCH
Create branch:
docs/add-emdash-upstream-sync-playbook

PHASE 3 — DOCUMENTATION
Create or update:
- docs/upstream-sync.md
- docs/compatibility-matrix.md
- docs/divergence-log.md
- docs/testing.md
- docs/rollback.md
- docs/release-checklist.md

PHASE 4 — REMOTE STRATEGY
Document:
- origin/upstream/reference remote meaning
- how to add upstream
- read-only reference remote warning
- remote naming rules

PHASE 5 — SYNC POLICY
Document:
- sync frequency
- trigger events
- adopt/adapt/delay/reject framework
- branch naming
- merge vs rebase policy
- force-push prohibition

PHASE 6 — CHECKLISTS
Document:
- pre-sync checklist
- database impact checklist
- plugin impact checklist
- admin impact checklist
- media/storage impact checklist
- public frontend impact checklist
- security impact checklist
- Cloudflare impact checklist

PHASE 7 — MATRIX AND DIVERGENCE PROCESS
Update:
- compatibility matrix columns and status values
- divergence log columns and logging rules
- sync PR update requirements

PHASE 8 — TESTING AND VALIDATION
Document:
- validation commands
- compatibility tests
- plugin tests
- template tests
- security tests
- staging deployment requirement

PHASE 9 — ISSUE/PR TEMPLATES
Add or document:
- upstream sync issue template
- upstream sync PR template
- release notes requirements

PHASE 10 — ROLLBACK PLAYBOOK
Document:
- code rollback
- deployment rollback
- database rollback
- plugin rollback
- emergency patch criteria

PHASE 11 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 12 — COMMIT
Commit:
docs: add EmDash upstream sync playbook

PHASE 13 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. upstream sync impact
5. EmDash compatibility impact
6. security impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- force pushing
- deleting branches or tags unexpectedly
- modifying EmDash core
- changing production Cloudflare resources
- running production migrations
- committing secrets/private data
- overwriting divergence log history
```

---

## 28. Definition of Done for Part 14

Part 14 is complete when:

```txt
[ ] upstream sync philosophy is documented
[ ] canonical upstream references are defined
[ ] remote strategy is defined
[ ] sync frequency is defined
[ ] sync decision framework exists
[ ] pre-sync checklist exists
[ ] branch strategy is defined
[ ] merge/rebase policy is defined
[ ] sync procedure is documented
[ ] compatibility matrix maintenance process is defined
[ ] divergence log maintenance process is defined
[ ] upstream change impact review is defined
[ ] validation commands are listed
[ ] compatibility test suite is defined
[ ] database/migration sync playbook exists
[ ] plugin/marketplace compatibility playbook exists
[ ] template compatibility playbook exists
[ ] Cloudflare compatibility playbook exists
[ ] bad sync rollback playbook exists
[ ] upstream sync issue template exists
[ ] upstream sync PR template exists
[ ] release notes requirements exist
[ ] practical sync scenarios are documented
[ ] GitHub Issues are prepared
[ ] OpenCode/Antigravity prompt exists
```

---

## 29. Recommended Next Part

Continue with:

```txt
Part 15 — AWCMS-Micro Implementation Master Index and Final Roadmap
```

Part 15 should include:

- summary of Parts 1–14;
- consolidated roadmap;
- repository execution order;
- documentation index;
- MVP checklist;
- post-MVP checklist;
- AI-agent prompt index;
- GitHub Issue index;
- final implementation guidance.
