# SIKESRA Operations

This runbook tracks the repo-local operational path that has been restored so far, plus the workflows that still remain open.

## Restored Now

### Shell Verification

- Public shell page: `/sikesra`
- Admin plugin shell: `/_emdash/admin/plugins/sikesra/*`
- Public-safe API shell: `/_emdash/api/plugins/sikesra/public/*`
- Versioned placeholder API: `/_emdash/api/plugins/sikesra/v1/*`

### Database Replay

- Inventory backup objects: `pnpm sikesra:d1:inventory`
- Preview restore plan: `pnpm sikesra:d1:restore --database sikesra`
- Execute restore: `pnpm sikesra:d1:restore --database sikesra --execute`

See `docs/sikesra/D1_RESTORE.md` for the exact restore order.

### Deployment Overlay

- Binding contract: `infra/sikesra/wrangler.jsonc`
- Worker wrapper template: `infra/sikesra/worker-wrapper-template.mjs`
- Postbuild adapter: `pnpm sikesra:postbuild`
- Admin route smoke check: `pnpm sikesra:smoke-admin`

See `docs/sikesra/DEPLOYMENT.md` for details.

## Still Open

These workflows are not restored by the current patch and remain follow-up implementation work:

1. Classified document metadata and download flows
2. Import staging, validation, duplicate review, and promotion handlers
3. Export/report job generation and delivery
4. Audit-backed operational dashboards
5. End-to-end browser validation of the rebuilt admin operations surface

## Current Safe Operating Model

Until the remaining workflows land, operate SIKESRA with these constraints:

1. Treat the plugin shell, D1 restore helper, and deployment overlay as the supported baseline.
2. Do not patch EmDash core migrations, admin bundles, or route internals to recover business workflows.
3. Use the backup SQL artifacts in `update-backup/d1/` as the source of truth for schema and seed replay.
4. Keep any new document/import/export workflow code inside repo-local SIKESRA plugin or host overlay files.
5. Record unresolved operational gaps explicitly in GitHub issues instead of hiding them in wrapper or core changes.
