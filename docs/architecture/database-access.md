# Database Access

## Purpose

This document defines the shared database access surface for services in SIKESRA (awcms-mini-sikesra).

## Source of Truth

- singleton access module: `src/db/index.mjs`

## Rules

- services should acquire future database access through `src/db/index.mjs`
- until the runtime PostgreSQL client lands, the current scaffold should expose only seam metadata and redacted connection summary helpers
- repositories should stay framework-neutral and avoid embedding credentials or raw connection strings in logs or operator-facing output

## Current Scaffold Pattern

```js
import { sikesraDatabaseAccess } from "../db/index.mjs";

const summary = sikesraDatabaseAccess.getConnectionSummary();
```

The runtime PostgreSQL client, transactions, and error classification layers are not implemented in this repository yet. They should land as later issue-scoped follow-on work once the persisted religion-reference path in `#49` is ready to use them.

## SIKESRA Database

- Database: `sikesrakobar`
- Runtime role: `sikesrakobar_runtime`
- Transport: Hyperdrive (`sikesra-kobar-postgres-runtime`, ID `27eafcdafb5e4904bf083c4133a54161`)
- VPS: `202.10.45.224` (SSL hostname: `id1.ahlikoding.com`)
- Private tunnel hostname: `pg-hyperdrive.ahlikoding.com`

## Validation

- `pnpm test:unit`
- `pnpm db:migrate:status`
