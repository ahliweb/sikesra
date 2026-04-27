# SIKESRA Docs

This directory contains the maintained architecture, governance, security, plugin, admin, and process documentation for SIKESRA (awcms-mini-sikesra).

SIKESRA is an EmDash-first single-tenant deployment of AWCMS Mini where Cloudflare serves the public frontend and edge layer while the Hono backend API runs on a Coolify-managed VPS.

## Read In This Order

1. `../REQUIREMENTS.md`
2. `../AGENTS.md`
3. `../README.md`
4. `../DOCS_INDEX.md`
5. the focused document for your task

## Folder Map

- `architecture/` - architecture constraints and repository/runtime guidance
- `governance/` - auth, roles, jobs, and regions guidance
- `security/` - security operations, recovery, and rate-limit strategy
- `plugins/` - plugin governance contract docs
- `admin/` - admin operating guidance
- `process/` - workflow, runtime validation, and deployment docs

## Admin Docs

- `admin/sikesra-uiux-implementation.md` - implemented SIKESRA admin UI/UX model surface, route map, reusable components, workflow states, masking policy, and text wireframes

## SIKESRA-Specific Process Docs

- `process/sikesra-religion-reference.md` - controlled Agama reference and normalization guidance
- `process/sikesra-runtime-security.md` - SIKESRA runtime and secret handling baseline
- `process/sikesra-uiux-github-issue-plan.md` - canonical issue mapping for SIKESRA UI/UX work

## Upstream Process Docs (adapted for SIKESRA)

- `process/ai-workflow-planning-templates.md` - reusable AI workflow templates for docs, planning, implementation, and review tasks
- `process/cloudflare-hosted-runtime.md` - Cloudflare edge, frontend, and Hono runtime expectations for the active no-Hyperdrive architecture
- `architecture/no-hyperdrive-adr.md` - canonical decision record for removing Hyperdrive from the active architecture
- `process/cloudflare-pages-vs-workers-decision.md` - historical architecture comparison context
- `process/cloudflare-coolify-origin-hardening.md` - Cloudflare edge and Coolify API/database trust boundary
- `process/coolify-mcp-secret-handling.md` - supported local-only secret handling pattern for Coolify MCP access
- `process/github-issue-workflow.md` - issue-first workflow, atomic scope rules
- `process/migration-deployment-checklist.md` - pre/post-deploy checklist
- `process/postgresql-vps-hardening.md` - VPS PostgreSQL access posture
- `process/secret-hygiene-audit.md` - audit checklist and cleanup rules for scripts, config examples, and operator secret handling
- `process/runtime-smoke-test.md` - `pnpm healthcheck` with optional posture assertion env vars
- `process/emdash-ledger-repair-runbook.md` - operator-only inspection and repair flow for the EmDash `_emdash_migrations` ledger
- `process/emdash-alignment-and-security-plan-2026.md` - EmDash alignment and security recommendations backlog source

## Key SIKESRA Identifiers

- Hostname: `sikesrakobar.ahlikoding.com`
- Database: `sikesrakobar` / runtime role: `sikesrakobar_runtime`
- Hono API service: `awcms-mini-api`
- R2 bucket: `sikesra` (binding: `MEDIA_BUCKET`)
- Issue tracker: `ahliweb/sikesra`
- Upstream reference (read-only): `ahliweb/awcms-mini`, local path `/home/data/dev_react/awcms-mini`

## Accuracy Rule

These docs should describe the real repository state, not just the intended plan. When implementation and planning diverge, update the docs to match the current code and call out rollout caveats explicitly.

## Validation Baseline

- `pnpm check` is the default aggregate validation path for routine local changes.
- `pnpm lint` and `pnpm format` currently use Prettier on the maintained docs/config surface, not the entire repository.
- Keep any issue-specific validation commands in addition to that baseline.
