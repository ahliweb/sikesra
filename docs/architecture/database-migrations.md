# Database Migrations

## Purpose

This document defines the canonical migration runner workflow for SIKESRA (awcms-mini-sikesra).

## Current Migration Commands

- `pnpm db:migrate`
  - applies pending repository-owned SIKESRA migrations as one atomic transaction batch through non-interactive `psql`
- `pnpm db:migrate:probe`
  - checks PostgreSQL reachability for the repository migration path and returns a redacted structured result
- `pnpm db:migrate:status`
  - prints the current repository-owned migration registry status and the live SIKESRA migration ledger when reachable

## Source of Truth

- runner script: `scripts/db-migrate.mjs`
- database access seam: `src/db/index.mjs`
- psql execution seam: `src/db/client/psql.mjs`
- migration registry: `src/db/migrations/index.mjs`
- migration runner module: `src/db/migrations/runner.mjs`
- migration SQL renderer: `src/db/migrations/sql.mjs`

## Current Bootstrap State

- the current repository-owned registry registers `001_create_religion_reference_tables`
- this first entry defines the persisted table contract and reviewed seed rows for religion references and aliases
- `pnpm db:migrate` now wraps the pending repository-owned SQL batch in one transaction, recording applied entries in `public.sikesra_migrations` only when the full batch succeeds
- live persistence, rollback, and EmDash-ledger compatibility work remain follow-on scope for `#49`

## Current EmDash Runtime Caveat

- this scaffold does not yet inspect or mutate the EmDash `_emdash_migrations` ledger
- any future EmDash-ledger compatibility tooling must land as a separate issue-scoped follow-on after the repository-owned migration surface is wired to a real PostgreSQL client
- a fresh-site `/_emdash/api/setup/status` response that reports `needsSetup: true` is normal first-run bootstrap state and should not be treated as a ledger repair signal

## Runtime Input

- `DATABASE_URL` is required for live repository-owned migration execution
- `DATABASE_MIGRATION_URL` overrides `DATABASE_URL` for migration commands when operators need a reviewed private PostgreSQL path that differs from the general app runtime path
- the runner uses `scripts/_local-env.mjs` to load `.env.local` first, then `.env`
- when PostgreSQL is unreachable, the runner exits non-zero with a redacted `kind` and `reason` instead of a raw stack trace
- the reachability probe distinguishes reviewed classes such as timeout, authentication failure, DNS failure, TLS failure, and generic connection failure where `psql` stderr makes that possible

## Usage

### Apply Pending Repository Migrations

```bash
pnpm db:migrate
```

### Check Migration Status

```bash
pnpm db:migrate:status
```

### Probe PostgreSQL Reachability

```bash
pnpm db:migrate:probe
```

## Rules

- keep migration files ordered and descriptive
- do not introduce ad hoc schema changes outside the repository-owned migration registry
- use non-interactive `psql` execution with env-managed credentials only for the current repository-owned migration path
- keep the migration batch atomic: if any statement fails, the whole pending set rolls back and no partial schema change is left behind from that run
- prefer `DATABASE_MIGRATION_URL` for operator migration workflows when the Coolify-managed private DB route differs from the app runtime connection path
- keep status output redacted: never print passwords, full connection strings, or tokens
- fail fast on unreachable PostgreSQL and return operator-safe error classifications instead of leaking raw driver/process details
- use the reachability probe before rollout when Coolify-managed server access is unavailable from the current tool session

## Validation

- `pnpm db:migrate`
- `pnpm db:migrate:probe`
- `pnpm db:migrate:status`
- `pnpm check`
