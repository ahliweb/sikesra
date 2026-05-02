# Upstream EmDash Setup Bootstrap Plan

## Purpose

This is the local SIKESRA reference for upstream issue `ahliweb/awcms-mini#282` and the mirrored planning issue `ahliweb/sikesra#105`.

The plan stays in this repository so SIKESRA can keep independent smoke scripts, runbooks, and docs while treating the upstream EmDash repo as the implementation source of truth.

## Current Reading

- `/_emdash/api/setup/status` should respond `200`
- `needsSetup: true` is expected on a fresh site before the first admin is created
- a generic setup migration failure banner is a bug, not normal first-run state

## Upstream Fix Shape

1. Make the upstream setup-status handler database-lazy on fresh Mini deployments.
2. Ensure the setup shell renders while the reviewed bootstrap path completes.
3. Keep the shared `_emdash_migrations` compatibility bootstrap aligned with the reviewed first-run path.
4. Cover the fresh-site case with upstream tests.
5. Verify the upstream fix against the reviewed smoke path before closing the issue.

## Local SIKESRA Seams

- `scripts/smoke-cloudflare-admin.mjs`
- `scripts/smoke-deployed-runtime-health.mjs`
- `scripts/verify-live-runtime.mjs`
- `docs/process/runtime-smoke-test.md`
- `docs/process/emdash-ledger-repair-runbook.md`
- `docs/process/migration-deployment-checklist.md`

## Local Rules

- Do not copy upstream source files into this workspace.
- Keep the upstream repository read-only for implementation review.
- Use this document only as a planning and verification bridge.

## Exit Criteria

- Upstream issue `#282` has code and tests merged.
- SIKESRA smoke/runbook docs continue to treat `needsSetup: true` as expected first-run bootstrap state.
- The local drift-gate and smoke scripts still match the reviewed route seams.
