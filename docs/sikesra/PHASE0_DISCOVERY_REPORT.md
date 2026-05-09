# SIKESRA Phase 0 Discovery Report

Status: historical Phase 0 discovery record. Current runtime conventions are superseded by `docs/core/SIKESRA_INTEGRATION_OVERLAY.md` and `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.

Date: 2026-05-09

## Scope Covered

This report executes `SIKESRA-001` for the current repository and EmDash canonical references.

Sources:

1. `AGENTS.md`
2. `docs/sikesra/08_implementation_backlog.md`
3. `docs/sikesra/11_ai_implementation_handoff.md`
4. EmDash canonical docs index: `https://docs.emdashcms.com/llms.txt`
5. EmDash plugin/API/config/auth/deployment references used in `docs/sikesra/IMPLEMENTATION_DECISIONS.md`

## Repository Reality Check (Current Repo)

Current update:

This repository is now the self-contained SIKESRA deployment target (`ahliweb/sikesra`). It contains the EmDash/Astro host scaffold, SIKESRA runtime source in local `src/`, migrations, seeds, tests, the hybrid worker wrapper, postbuild adapters, and deployment documentation. Do not use the older conclusions in this section as current implementation guidance.

Current authority:

1. Runtime/deploy repository: this repository, `ahliweb/sikesra`.
2. SIKESRA runtime source path: `src/`, not `packages/plugins/sikesra/`.
3. Hybrid worker template: `scripts/worker-wrapper-template.mjs`.
4. Postbuild adapter: `scripts/postbuild.mjs`.
5. Validation commands: `npm run typecheck`, `npm test`, `npm run build`.
6. Route ownership: `/` is EmDash host-owned; `/sikesra` is SIKESRA public output.

Historical snapshot follows.

Observed structure in this repo:

1. Documentation-centric repository (`docs/core`, `docs/sikesra`).
2. No host EmDash site scaffold in-tree (no `astro.config.mjs`, no `src/live.config.ts`, no plugin workspace, no migrations folder).
3. No existing module registration code to inspect.
4. No existing test scripts/package manager lockfile to confirm final test commands.

Conclusion:

This repository currently acts as a SIKESRA planning and module-definition workspace, not the final EmDash host runtime repository.

## Confirmed EmDash Conventions (Canonical)

From upstream EmDash docs:

1. Native plugins use descriptor factory + runtime `createPlugin()` with `definePlugin(...)`.
2. Plugin API route mount pattern is `/_emdash/api/plugins/<plugin-id>/<route-name>`.
3. EmDash integration is configured in `astro.config.mjs`.
4. Cloudflare D1 and R2 are supported through binding-based configuration.
5. Authentication is passkey-first, with optional OAuth providers and optional Cloudflare Access mode.

## Discovery Matrix: Resolved vs Pending

| Discovery Item | Status | Result |
|---|---|---|
| Plugin/module registration convention | Partially resolved | EmDash canonical convention confirmed; host repo file path still pending. |
| Admin page contribution convention | Partially resolved | Native plugin admin pages/widgets supported; host repo wiring pending. |
| API route convention | Partially resolved | EmDash route mount pattern confirmed; versioned `sikesra/v1/*` mapping in host repo pending. |
| Public route convention | Partially resolved | Project rule `/sikesra` confirmed; host route file path pending. |
| D1 migration convention | Pending host repo | EmDash D1 behavior known; concrete migration folder/command pending. |
| Seed convention | Pending host repo | EmDash seed behavior known; SIKESRA seed path/command pending. |
| Test convention and commands | Pending host repo | Must be extracted from host repo scripts and CI config. |
| Auth/session helper | Partially resolved | EmDash auth model confirmed; concrete helper import path pending. |
| Permission registry helper | Pending host repo | `awcms:sikesra:*` namespace fixed; registration integration point pending. |
| Audit/ABAC/media helpers | Partially resolved | Fallback strategy confirmed; shared helper wiring pending. |

## Missing Extension Points

The remaining missing points are integration-specific (host repo) and are documented in:

- `docs/sikesra/IMPLEMENTATION_DECISIONS.md`

No EmDash core change is approved from this discovery run.

## Acceptance Criteria Check for SIKESRA-001

1. Exact target paths/helpers are documented: **Partially complete** (canonical conventions documented; host repo paths still pending).
2. Missing extension points are listed: **Complete**.
3. No business implementation added: **Complete**.
4. No EmDash core change made: **Complete**.

## Next Atomic Action

Run host-repository discovery against `ahliweb/awcms-micro` to finalize concrete file paths, commands, and helper names required to fully complete `SIKESRA-001`.

## Host Repository Audit Result (SIKESRA-001A)

Target repository audited: `ahliweb/awcms-micro` (local path: `/home/data/dev_react/awcms-micro`).

Observed contents:

1. `.git/`
2. `LICENSE`
3. `concept/` (empty)

No runtime host files were found:

1. No `astro.config.mjs`.
2. No `package.json`.
3. No plugin workspace/package folders.
4. No migration or seed directories.
5. No route handlers.
6. No test scripts.

Impact:

`SIKESRA-001A` cannot resolve host-repo-specific path/helper items because the host runtime scaffold is not present in `ahliweb/awcms-micro` yet.

## Host Repository Re-Audit Result (Post-Scaffold)

Historical note: the `ahliweb/awcms-micro` repository is now reference-only for this project. Do not deploy SIKESRA from that repository, and do not add SIKESRA business logic there. Current SIKESRA deployment and documentation live in this repository.

Repository audited: `ahliweb/awcms-micro` after scaffold update (commit `4237045` on `main`).

Confirmed files now present:

1. `astro.config.mjs`
2. `package.json`
3. `src/live.config.ts`
4. `wrangler.jsonc`
5. `docs/CONVENTIONS.md`
6. `packages/plugins/` and `packages/awcms/`
7. `migrations/` and `seeds/`

Resolved from historical host repo audit:

1. Plugin path convention in the generic/reference scaffold: `packages/plugins/<plugin-id>/`.
2. Host integration point for plugin registration: `astro.config.mjs` via EmDash `plugins: []`.
3. Migration path convention: `migrations/`.
4. Seed path convention: `seeds/`.
5. Baseline test/build/typecheck command names in host `package.json`.

Remaining non-blocking gaps:

1. Concrete permission registry helper file is not implemented yet (path family exists under `packages/awcms/`).
2. Shared ABAC/audit adapter implementation is not present yet; module-local fallback remains approved.

Final acceptance update for `SIKESRA-001`:

1. Exact target paths/helpers documented: **Complete for path-level discovery**.
2. Missing extension points listed: **Complete**.
3. No business implementation added: **Complete**.
4. No EmDash core change made: **Complete**.

## Current Superseding Result

For future implementation tickets, use these current paths and commands instead of the historical host-repo audit:

| Area | Current Result |
|---|---|
| Runtime repository | `ahliweb/sikesra` |
| Local plugin/runtime source | `src/` |
| Plugin entry | `src/plugin-entry.ts` |
| Plugin descriptor/factory | `src/index.ts` |
| Route registry | `src/routes/registry.ts` |
| Admin Block Kit route registration | `src/routes/admin-routes.ts` |
| Deployed env-aware admin rendering | `scripts/worker-wrapper-template.mjs` |
| Postbuild/sidebar adapter | `scripts/postbuild.mjs` |
| D1 migrations | `migrations/` |
| Seeds | `seeds/` |
| Tests | `src/__tests__/architecture.test.ts` |
| Validation commands | `npm run typecheck`, `npm test`, `npm run build` |

No EmDash core source modification is approved by this discovery report.
