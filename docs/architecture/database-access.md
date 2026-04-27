# Database Access

## Purpose

This document defines the shared database access surface for services in SIKESRA (awcms-mini-sikesra).

## Source of Truth

- singleton access module: `src/db/index.mjs`
- `psql` execution seam: `src/db/client/psql.mjs`

## Rules

- services and migration tooling should acquire future database access through `src/db/index.mjs`
- the current repository seam now exposes redacted connection summary helpers plus a non-interactive `psql` migration client
- repositories should stay framework-neutral and avoid embedding credentials or raw connection strings in logs or operator-facing output

## Current Scaffold Pattern

```js
import { sikesraDatabaseAccess } from "../db/index.mjs";

const summary = sikesraDatabaseAccess.getConnectionSummary();
const client = sikesraDatabaseAccess.createMigrationClient();
```

The repository currently uses a minimal `psql` execution client for migrations. Richer runtime PostgreSQL adapters, transactions, and error classification layers should land as later issue-scoped follow-on work once the persisted religion-reference path in `#49` is ready to use them.

## SIKESRA Database

- Database: `sikesrakobar`
- Runtime role: `sikesrakobar_runtime`
- Transport: Hyperdrive (`sikesra-kobar-postgres-runtime`, ID `27eafcdafb5e4904bf083c4133a54161`)
- VPS: `202.10.45.224` (SSL hostname: `id1.ahlikoding.com`)
- Private tunnel hostname: `pg-hyperdrive.ahlikoding.com`

## Validation

- `pnpm test:unit`
- `pnpm db:migrate`
- `pnpm db:migrate:status`
