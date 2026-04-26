# Database Access

## Purpose

This document defines the shared database access surface for services in SIKESRA (awcms-mini-sikesra).

## Source of Truth

- singleton access module: `src/db/index.mjs`
- postgres client factory: `src/db/client/postgres.mjs`
- transaction wrapper: `src/db/transactions.mjs`
- error classifier: `src/db/errors.mjs`

## Rules

- services should acquire database access through `src/db/index.mjs`
- services should use `withTransaction(...)` for multi-step writes
- nested transaction intent must be explicit through strategy selection
- error handling should classify database failures through `classifyDatabaseError(...)`
- repositories should filter `deleted_at is null` by default for soft-deletable entities
- repositories should expose explicit soft-delete, restore, or include-deleted paths instead of mixing deleted rows into normal reads

## Transaction Strategy

### `reuse`

- default nested strategy
- if a controlled transaction already exists, reuse it
- use this for normal service composition

### `savepoint`

- nested strategy for partial rollback boundaries inside an existing controlled transaction
- use only when a service truly needs savepoint semantics

## Recommended Service Pattern

```js
import { getDatabase, withTransaction } from "../db/index.mjs";

const db = getDatabase();

await withTransaction(db, async (trx) => {
  // multi-step write using trx
});
```

## Error Classification Kinds

- `authentication`
- `connection`
- `constraint`
- `migration`
- `not_found`
- `query`
- `transaction`
- `unknown`

## SIKESRA Database

- Database: `sikesrakobar`
- Runtime role: `sikesrakobar_runtime`
- Transport: Hyperdrive (`sikesra-kobar-postgres-runtime`, ID `27eafcdafb5e4904bf083c4133a54161`)
- VPS: `202.10.45.224` (SSL hostname: `id1.ahlikoding.com`)
- Private tunnel hostname: `pg-hyperdrive.ahlikoding.com`

## Validation

- `pnpm test:unit`
- `pnpm typecheck`
- `pnpm build`
