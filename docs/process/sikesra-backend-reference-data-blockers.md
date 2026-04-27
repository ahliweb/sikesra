# SIKESRA Backend Reference-Data Blockers

## Purpose

This note records the current repository-local blocker for backend-controlled SIKESRA reference/master data work.

It follows the issue-driven workflow in `docs/process/ai-workflow-planning-templates.md`: document the real repository state, keep the next step atomic, and avoid reopening broader work that the repository cannot honestly host yet.

## Current Repository State

- The writable SIKESRA implementation in this repository currently lives under `src/plugins/sikesra-admin/`.
- The repository contains model-layer/admin-plugin code, focused docs, and unit tests.
- The repository does **not** currently contain a writable backend persistence seam such as:
  - `src/db`
  - database migrations
  - repositories
  - backend services
  - API handlers for reference-data persistence
- The reviewed Cloudflare Worker runtime and EmDash host integration are already live and are not the current blocker for backend reference-data work.

## Active Issues

- `#49` tracks backend-controlled religion master/reference data.
- `#52` now tracks the prerequisite minimal backend reference-data seam needed before `#49` can be implemented from this repository.

## Why `#49` Is Still Blocked

`#49` is the correct functional backend issue, but it cannot be completed from this repository until a writable persistence/service seam exists here.

Without that seam, creating more detailed backend issues would be speculative and would violate the current issue-planning guidance to keep work atomic and repository-state-first.

## Required Dependency Order

1. Complete `#52` to introduce the smallest repository-local backend/reference-data seam.
2. Use that seam to implement `#49` for controlled religion reference data.
3. Only create further backend follow-ons if the new seam proves they are necessary and implementable from this repository.

## Security And Runtime Guardrails

- Keep Cloudflare Worker runtime secrets in Cloudflare Worker secrets.
- Keep Coolify-managed runtime secrets in locked runtime variables with build exposure disabled by default.
- Keep local/operator secrets in ignored env files only.
- Follow OWASP-style least privilege, audited service-layer authorization, and data minimization for any future backend reference-data implementation.
- Keep the backend seam aligned with the reviewed EmDash-first, Cloudflare-hosted Worker runtime and PostgreSQL-on-Coolify baseline.

## Validation

- `pnpm lint` for this docs-only change
