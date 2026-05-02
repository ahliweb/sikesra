# SIKESRA Source Workspace

## Purpose

This document records the writable source strategy for SIKESRA Kobar implementation work.

## Decision

Use a minimal SIKESRA extension surface in this repository instead of importing the full upstream AWCMS Mini app tree.

The current writable implementation surface is:

- `src/plugins/sikesra-admin/` for EmDash-first SIKESRA admin/plugin source
- `tests/unit/` for dependency-light regression tests
- `package.json` for repository-local validation commands

`ahliweb/awcms-mini` remains read-only upstream reference. Do not copy upstream `.env`, `.env.local`, `.dev.vars`, `dist/`, `.wrangler/`, `node_modules/`, database dumps, generated secret files, or local operator artifacts into this repository.

## Rationale

The open SIKESRA UI/UX issues require writable admin/plugin files. A full upstream import would increase review scope and the risk of copying unrelated runtime state. A small plugin surface keeps the next issues atomic while preserving the Cloudflare edge, Hono backend, R2, and Coolify-managed PostgreSQL runtime baseline.

## Current Plugin Surface

`src/plugins/sikesra-admin/index.mjs` exports:

- `createSikesraAdminPluginDefinition()` as the runtime plugin definition helper with the native EmDash fields (`capabilities`, `allowedHosts`, `storage`, `hooks`, `routes`, `admin`)
- `sikesraAdminPlugin()` as the EmDash-compatible plugin descriptor
- `SIKESRA_ADMIN_PERMISSIONS` as the first SIKESRA permission catalog seed
- `SIKESRA_ADMIN_PAGES` as the admin navigation seed for issue-driven UI work

`src/plugins/sikesra-admin/host-registration.mjs` exports the reviewed host registration seam for the live AWCMS Mini/EmDash build. The intended EmDash integration change is to append `sikesraAdminPlugin()` to the existing `emdash({ plugins: [...] })` option in `astro.config.mjs` while preserving the existing `awcmsUsersAdminPlugin()` registration.

For the `#86` grouped sidebar work, the same file now also exports `createSikesraAdminHostShellState(...)`, which turns the plugin descriptor plus the host's `currentPath` and granted permissions into the grouped shell navigation state consumed by a host sidebar renderer.

The source of truth for the live build remains the reviewed Cloudflare-and-Hono deployment flow. Do not edit the upstream `ahliweb/awcms-mini` worktree in place from this repository; use the host registration seam in a reviewed build/integration step.

The descriptor follows the upstream AWCMS Mini plugin pattern of exposing `id`, `version`, `entrypoint`, `options`, `adminEntry`, `adminPages`, and `adminWidgets`, without the older placeholder-only route shim.

## Security Rules

- UI visibility is not a security boundary; service-layer authorization remains required.
- Menu metadata may declare `permissionCode`, but backend routes and services must enforce permissions separately.
- SIKESRA data involving NIK/KIA, No KK, children, elderly people, disability, religion, contact, health, or documents remains sensitive.
- Use masked, aggregate, or permission-gated displays by default for sensitive data.
- Keep credentials and connection strings in `.env.local`, Coolify locked secrets, or operator-managed secret stores only.

## Validation

Run these checks for source changes in this repository:

```bash
pnpm check
```

The current check runs:

- `node scripts/check-secret-hygiene.mjs`
- `node --test tests/unit/*.test.mjs`

If future changes add Astro, React, or TypeScript compilation in this repo, update `package.json` and this document in the same issue-scoped change.

## Cross-References

- `AGENTS.md`
- `docs/process/ai-workflow-planning-templates.md`
- `docs/plugins/contract-overview.md`
- `docs/process/sikesra-runtime-security.md`
