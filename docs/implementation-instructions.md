# Implementation Instructions

## Goal

Keep EmDash upstream-compatible while isolating SIKESRA behavior to approved downstream plugin, template, docs, test, seed, and deployment boundaries. Use `emdash-latest/` only as the local EmDash comparison baseline.

## Required Working Rules

- Do not patch EmDash core for SIKESRA behavior unless there is no plugin extension point.
- If a core divergence is unavoidable, record it in `docs/divergence-log.md` with reason, impact, rollback, and verification notes.
- Keep canonical plugin work in `awcmsmicro-dev/packages/plugins/awcms-sikesra/`.
- Keep canonical template work in `awcmsmicro-dev/templates/awcms-sikesraTemplate/` and `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/`.
- Keep public-safe downstream documentation under `awcmsmicro-dev/docs/awcms-micro/sikesra/` and deeper implementation references under `docs/sikesra/`.
- Run `pnpm awcmsmicro:validate-boundaries` before and after SIKESRA-scoped changes.

## Sync Workflow

1. Rebuild `awcmsmicro-dev/` with `scripts/sync-from-awcms-micro.sh`.
2. Run `scripts/validate-after-sync.sh`.
3. Record any downstream-only divergence in `docs/divergence-log.md`.
4. Update `docs/upstream-sync-status.md` with the latest sync outcome.
