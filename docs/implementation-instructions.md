# Implementation Instructions

## Goal

Keep EmDash upstream-compatible while isolating SIKESRA behavior to plugin-owned code, docs, scripts, tests, seeds, migrations, and deployment wiring.

## Required Working Rules

- Do not patch EmDash core for SIKESRA behavior unless there is no plugin extension point.
- If a core divergence is unavoidable, record it in `docs/divergence-log.md` with reason, risk, rollback, and tests.
- Keep plugin business logic in `packages/plugins/sikesra/` until the canonical scaffold at `packages/plugins/awcms-micro-sikesra/` replaces it as the runtime source.
- Keep public-safe documentation under `docs/awcms-micro/sikesra/` and detailed implementation references under `docs/sikesra/`.
- Run `pnpm awcmsmicro:validate-boundaries` before and after SIKESRA-scoped changes.

## Sync Workflow

1. Refresh `emdash-latest/` in the eventual parent repository with `scripts/update-emdash-latest.sh`.
2. Rebuild the implementation tree with `scripts/update-awcmsmicro-dev.sh`.
3. Run `scripts/validate-after-sync.sh`.
4. Record any divergence or failure in `docs/upstream-sync-status.md` and `docs/divergence-log.md`.

## Current Repo Adaptation

Because this repository is still the active workspace root, the sync scripts support both modes:

- parent-repo mode when `awcmsmicro-dev/` exists as a child directory
- in-place mode when the current repo root itself is acting as `awcmsmicro-dev`
