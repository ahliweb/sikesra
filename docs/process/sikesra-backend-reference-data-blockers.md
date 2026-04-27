# SIKESRA Backend Reference-Data Blockers

## Purpose

This note records the current repository-local blocker for backend-controlled SIKESRA reference/master data work.

It follows the issue-driven workflow in `docs/process/ai-workflow-planning-templates.md`: document the real repository state, keep the next step atomic, and avoid reopening broader work that the repository cannot honestly host yet.

## Current Repository State

- The repository now contains the first repository-owned backend seams for this work:
  - `src/backend/reference-data/`
  - `src/backend/repositories/`
  - `src/backend/services/`
  - `src/db/`
- The current `src/db` surface is still a scaffold only; it does not yet provide a live PostgreSQL client, applied migrations, or API handlers for reference-data persistence.
- The reviewed Cloudflare Worker runtime and EmDash host integration are already live and are not the current blocker for backend reference-data work.

## Active Issues

- `#49` tracks backend-controlled religion master/reference data.
- `#49` tracks backend-controlled religion master/reference data.
- `#55` now tracks the minimal database and migration scaffold needed before real persisted religion-reference storage can land honestly in this repository.

## Why `#49` Is Still Blocked

`#49` is the correct functional backend issue, but it still cannot be completed until the new repository-owned DB scaffold is upgraded into real persisted storage, lifecycle, authorization, and audit-backed runtime behavior.

Without that persisted step, broad backend closure would still be speculative and would violate the current issue-planning guidance to keep work atomic and repository-state-first.

## Required Dependency Order

1. Complete `#55` to introduce the smallest repository-local DB and migration scaffold.
2. Use that scaffold plus `#52`, `#53`, and `#54` to implement persisted religion-reference storage for `#49`.
3. Only create further backend follow-ons if the new scaffold proves they are necessary and implementable from this repository.

## Security And Runtime Guardrails

- Keep Cloudflare Worker runtime secrets in Cloudflare Worker secrets.
- Keep Coolify-managed runtime secrets in locked runtime variables with build exposure disabled by default.
- Keep local/operator secrets in ignored env files only.
- Follow OWASP-style least privilege, audited service-layer authorization, and data minimization for any future backend reference-data implementation.
- Keep the backend seam aligned with the reviewed EmDash-first, Cloudflare-hosted Worker runtime and PostgreSQL-on-Coolify baseline.
- Treat Coolify, Cloudflare, and PostgreSQL passwords/tokens as management-plane data only; repository status tooling may report presence booleans but must not print raw secret values.

## Validation

- `pnpm db:migrate:status`
- `pnpm lint`
