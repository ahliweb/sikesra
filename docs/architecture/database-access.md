# Database Access

## Purpose

This document defines the shared database access surface for services in SIKESRA (awcms-mini-sikesra).

## Source of Truth

- Runtime DB client: `src/db/index.mjs` (current scaffold; to be replaced by the Hono backend DB layer under `apps/api/src/db/client.ts`)
- Migration CLI: `scripts/db-migrate.mjs`
- Migration files: `src/db/migrations/`

## Target Architecture

PostgreSQL runs as a Docker service (`awcms-mini-postgres`) on the Coolify-managed VPS.

The Hono backend API connects to it through the internal Docker network using `DATABASE_URL`:

```
postgresql://app_user:<password>@postgres:5432/sikesrakobar
```

`postgres` is the Docker service hostname assigned by Coolify. No public PostgreSQL exposure is used in the target architecture.

See `docs/architecture/no-hyperdrive-adr.md` for why Cloudflare Hyperdrive is not used.

## Access Rules

- Only the Hono backend API may access PostgreSQL at runtime.
- Cloudflare Pages must never connect to PostgreSQL directly.
- Frontend clients must call the Hono API for all data operations.
- Migration tooling (operator context) accesses PostgreSQL through `DATABASE_MIGRATION_URL` when the migration environment is separate from the runtime environment. This URL points to the same Docker service, either via internal network (from the VPS) or via a reviewed operator access path.
- No public PostgreSQL ingress should be opened unless explicitly reviewed and time-limited.

## Current Scaffold Pattern

The current scaffold (`src/db/index.mjs`) provides a migration-time `psql` execution client used by `scripts/db-migrate.mjs`. This will be superseded by the Hono backend DB layer.

```js
import { sikesraDatabaseAccess } from "../db/index.mjs";

const summary = sikesraDatabaseAccess.getConnectionSummary();
const client = sikesraDatabaseAccess.createMigrationClient();
```

Use this pattern for migration scripts only. Runtime application code should use the Hono backend database client once it is scaffolded under `apps/api/src/db/client.ts`.

## SIKESRA Database Identifiers

| Field             | Value                               |
|-------------------|-------------------------------------|
| Database          | `sikesrakobar`                      |
| Runtime role      | least-privilege application user    |
| Internal hostname | `postgres` (Docker internal network)|
| Migration table   | `public.sikesra_migrations`         |

## Legacy Note: Hyperdrive

Previous versions of this document listed Cloudflare Hyperdrive as the production database transport. Hyperdrive is no longer used. See `docs/architecture/no-hyperdrive-adr.md` for the full decision record and migration notes.

## Validation

- `pnpm test:unit`
- `pnpm db:migrate:probe`
- `pnpm db:migrate`
- `pnpm db:migrate:status`
