# SIKESRA Repository Layout

## Purpose

This document describes the current repository layout for SIKESRA (awcms-mini-sikesra) and the ownership boundaries that keep it aligned with EmDash-first architecture.

This layout is constrained by:

- `docs/architecture/constraints.md`
- `AGENTS.md`

## Layout Principles

- EmDash remains the host architecture.
- The repository should not introduce a second application shell.
- Runtime, database, services, security, pages, and plugin code should stay separated by responsibility.
- Governance overlays should be additive and should not blur into EmDash core responsibilities.
- Documentation should live alongside implementation but remain clearly separated from runtime code.

## Top-Level Layout

```text
.
|-- docs/
|   |-- admin/
|   |-- architecture/
|   |-- governance/
|   |-- plugins/
|   |-- process/
|   `-- security/
|-- scripts/
|-- src/
|   |-- auth/
|   |-- config/
|   |-- db/
|   |-- integrations/
|   |-- pages/
|   |-- plugins/
|   |-- security/
|   |-- services/
|   `-- live.config.ts
|-- tests/
|   `-- unit/
|-- AGENTS.md
|-- .env.example
`-- package.json
```

## Directory Ownership

### `docs/`

- Purpose: architecture, process, operational, and feature documentation.
- Subdirectories:
  - `docs/architecture/`: constraints, layout, runtime, and database guidance
  - `docs/process/`: issue workflow, rollout, and deployment guidance; includes SIKESRA-specific process docs
  - `docs/security/`: auth, recovery, lockouts, audit, and security operations
  - `docs/governance/`: roles, jobs, regions, and authorization guidance
  - `docs/plugins/`: plugin contract and extension guidance
  - `docs/admin/`: admin operating procedures and screen guides
- Must not contain:
  - canonical executable configuration
  - generated runtime data

### `scripts/`

- Purpose: repository automation and operator/developer scripts.
- Allowed content:
  - migration helper wrappers
  - seed or import orchestration
  - healthcheck and maintenance helpers
- Must not become:
  - the primary application runtime
  - a location for hidden business logic required by the app to function

### `src/`

- Purpose: all first-party application implementation code.
- Ownership rule: runtime code should live under `src/` unless it is clearly documentation or repository automation.

## `src/` Layout

### `src/config/`

- Purpose: runtime configuration parsing and environment mapping.

### `src/integrations/`

- Purpose: integration glue between Astro, EmDash, and Mini-specific runtime hooks.

### `src/db/`

- Purpose: database access foundation.

```text
src/db/
|-- client/
|-- importers/
|-- migrations/
|-- repositories/
|-- errors.mjs
|-- index.mjs
`-- transactions.mjs
```

### `src/auth/`

- Purpose: auth and session implementation on top of EmDash's auth boundary.

### `src/pages/`

- Purpose: Astro route entrypoints and public/runtime-facing endpoints.

### `src/security/`

- Purpose: reusable security-focused helpers and contracts shared across auth and service code.

### `src/services/`

- Purpose: domain orchestration and business operations.

```text
src/services/
|-- administrative-regions/
|-- audit/
|-- authorization/
|-- jobs/
|-- permissions/
|-- rbac/
|-- regions/
|-- roles/
|-- security/
|-- sessions/
`-- users/
```

### `src/plugins/`

- Purpose: first-party internal plugins and plugin integration support.

## `tests/` Layout

```text
tests/
`-- unit/
```

## Forbidden Layout Patterns

- a second standalone admin application tree
- mixed database and UI code in the same module
- policy logic scattered directly across pages and handlers
- plugin-specific direct database writes that bypass shared services without an explicit reason
- multi-tenant foldering patterns such as `tenants/` or `workspace/`
- generic `misc/`, `helpers/`, or `shared/` directories that accumulate unrelated business logic

## Read-Only Reference Repos

- `ahliweb/awcms-mini` (local: `/home/data/dev_react/awcms-mini`): upstream reference — read-only; do not commit changes
- All implementation changes go only in `awcms-mini-sikesra`; all other repos are read-only reference.

## Decision Rule

If a proposed file placement conflicts with this document, prefer the simplest location that:

- preserves EmDash-first architecture,
- keeps database, service, security, and UI concerns separate,
- avoids introducing a second platform core,
- stays compatible with the issue-driven workflow.

If the conflict is still unresolved, stop and open a new issue in `ahliweb/sikesra` before continuing.
