# Database Migrations

## Purpose

This document defines the canonical migration runner workflow for SIKESRA (awcms-mini-sikesra).

## Current Migration Commands

- `pnpm db:migrate:status`
  - prints the current repository-owned migration registry status without mutating a live database

## Source of Truth

- runner script: `scripts/db-migrate.mjs`
- database access seam: `src/db/index.mjs`
- migration registry: `src/db/migrations/index.mjs`
- migration runner module: `src/db/migrations/runner.mjs`

## Current Bootstrap State

- the current repository-owned registry registers `001_create_religion_reference_tables`
- this first entry defines the persisted table contract and reviewed seed rows for religion references and aliases, but it does not yet execute SQL or Kysely schema changes
- live persistence, rollback, and EmDash-ledger compatibility work remain follow-on scope for `#49`

## Current EmDash Runtime Caveat

- this scaffold does not yet inspect or mutate the EmDash `_emdash_migrations` ledger
- any future EmDash-ledger compatibility tooling must land as a separate issue-scoped follow-on after the repository-owned migration surface is wired to a real PostgreSQL client

## Runtime Input

- `DATABASE_URL` is read only to produce a redacted connection summary for status output
- the runner uses `scripts/_local-env.mjs` to load `.env.local` first, then `.env`

## Usage

### Check Migration Status

```bash
pnpm db:migrate:status
```

## Rules

- keep migration files ordered and descriptive
- do not introduce ad hoc schema changes outside the repository-owned migration registry
- do not bypass PostgreSQL for first-party schema state once the real client and execution path land
- keep status output redacted: never print passwords, full connection strings, or tokens

## Validation

- `pnpm db:migrate:status`
- `pnpm check`
