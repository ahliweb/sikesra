# SIKESRA Docs

This directory contains the maintained architecture, governance, security, plugin, admin, and process documentation for SIKESRA (awcms-mini-sikesra).

SIKESRA is an EmDash-first single-tenant Cloudflare-hosted Worker deployment of AWCMS Mini, serving `sikesrakobar.ahlikoding.com`.

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

## SIKESRA-Specific Process Docs

- `process/sikesra-cloudflare-worker-deploy-checklist.md` - SIKESRA deploy checklist
- `process/sikesra-runtime-security.md` - SIKESRA runtime and secret handling baseline
- `process/sikesra-uiux-github-issue-plan.md` - canonical issue mapping for SIKESRA UI/UX work

## Upstream Process Docs (adapted for SIKESRA)

- `process/ai-workflow-planning-templates.md` - reusable AI workflow templates for docs, planning, implementation, and review tasks
- `process/cloudflare-hosted-runtime.md` - full runtime expectations and all env var requirements; `DATABASE_TRANSPORT=hyperdrive` is the reviewed production default
- `process/cloudflare-hyperdrive-decision.md` - Hyperdrive preferred; private tunnel path through `pg-hyperdrive.ahlikoding.com`
- `process/cloudflare-pages-vs-workers-decision.md` - single Worker deployment; no Pages+Workers split
- `process/cloudflare-tunnel-private-db-connector-runbook.md` - tunnel operator runbook for the VPS-side `cloudflared` connector step
- `process/cloudflare-coolify-origin-hardening.md` - Cloudflare edge → Worker → Hyperdrive → PostgreSQL trust boundary
- `process/coolify-mcp-secret-handling.md` - supported local-only secret handling pattern for Coolify MCP access
- `process/github-issue-workflow.md` - issue-first workflow, atomic scope rules
- `process/migration-deployment-checklist.md` - pre/post-deploy checklist
- `process/postgresql-vps-hardening.md` - VPS PostgreSQL access posture
- `process/secret-hygiene-audit.md` - audit checklist and cleanup rules for scripts, config examples, and operator secret handling
- `process/runtime-smoke-test.md` - `pnpm healthcheck` with optional posture assertion env vars
- `process/hyperdrive-rollout-operator-handoff.md` - condensed operator command sheet for Hyperdrive rollout
- `process/emdash-ledger-repair-runbook.md` - operator-only inspection and repair flow for the EmDash `_emdash_migrations` ledger
- `process/emdash-alignment-and-security-plan-2026.md` - EmDash alignment and security recommendations backlog source

## Key SIKESRA Identifiers

- Hostname: `sikesrakobar.ahlikoding.com`
- Database: `sikesrakobar` / runtime role: `sikesrakobar_runtime`
- Worker: `sikesra-kobar`
- R2 bucket: `sikesra` (binding: `MEDIA_BUCKET`)
- Hyperdrive: `sikesra-kobar-postgres-runtime` (ID: `27eafcdafb5e4904bf083c4133a54161`)
- SESSION KV: `SESSION` (ID: `78cc94b763664d56b5ac9d34f1244304`)
- Issue tracker: `ahliweb/sikesra`
- Upstream reference (read-only): `ahliweb/awcms-mini`, local path `/home/data/dev_react/awcms-mini`

## Accuracy Rule

These docs should describe the real repository state, not just the intended plan. When implementation and planning diverge, update the docs to match the current code and call out rollout caveats explicitly.

## Validation Baseline

- `pnpm check` is the default aggregate validation path for routine local changes.
- `pnpm lint` and `pnpm format` currently use Prettier on the maintained docs/config surface, not the entire repository.
- Keep any issue-specific validation commands in addition to that baseline.
