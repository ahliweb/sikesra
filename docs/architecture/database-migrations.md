# Database Migrations

## Purpose

This document defines the canonical migration runner workflow for SIKESRA (awcms-mini-sikesra).

## Current Migration Commands

- `pnpm db:migrate`
  - applies pending migrations to the configured PostgreSQL database
- `pnpm db:migrate:down`
  - rolls back the most recently applied migration
- `pnpm db:migrate:status`
  - prints applied and pending migration names
- `pnpm db:migrate:emdash:status`
  - inspects the EmDash `_emdash_migrations` ledger and reports whether the current Mini compatibility prefix is compatible, repairable, or unsafe
- `pnpm db:migrate:emdash:verify`
  - exits non-zero unless the EmDash `_emdash_migrations` ledger is already `compatible`
- `pnpm db:migrate:emdash:repair`
  - rewrites `_emdash_migrations` only when the current rows are a repairable permutation of the expected Mini compatibility prefix

## Source of Truth

- runner script: `scripts/db-migrate.mjs`
- db client: `src/db/client/postgres.mjs`
- migration runner module: `src/db/migrations/runner.mjs`
- migration files: `src/db/migrations/*.mjs`
- EmDash compatibility ledger helper: `src/db/migrations/emdash-compatibility.mjs`

## Current Bootstrap State

- the initial migration is `001_baseline`
- `001_baseline` is an intentional no-op bootstrap migration
- `002_users` introduces the canonical user identity table
- `003_user_profiles` introduces the one-to-one non-auth user profile table
- `004_sessions` introduces active and historical authenticated session tracking
- `005_login_security_events` introduces append-only login and auth attempt history
- `006_soft_delete_identity_records` adds soft delete markers for mutable identity records
- `007_emdash_auth_compatibility` adds minimum compatibility columns needed by EmDash auth middleware
- `008_emdash_runtime_bootstrap` adds EmDash runtime support tables needed by the shared admin/setup path
- `009_user_invite_tokens` adds repo-owned invite activation token storage for invited-user activation
- `010_roles` adds the RBAC role catalog with `staff_level`, protection metadata, unique role slug, and soft-delete markers
- `011_permissions` adds the RBAC permission catalog with unique permission codes, protected markers, and code-format enforcement
- `012_role_permissions` adds the RBAC role-to-permission mapping with composite uniqueness and grant metadata
- `013_user_roles` adds effective-dated user role assignments with primary-role support and partial unique indexes for active-role enforcement
- `032_edge_api_permissions` adds canonical self-service edge API permission entries and role grants
- `031_soft_delete_operator_attribution_catalogs` adds `deleted_by_user_id` and `delete_reason` to operator-managed logical-region and job-catalog tables
- `034_emdash_compatibility_support_tables` backfills the missing upstream EmDash runtime support tables and seeds the canonical `001` through `009` `_emdash_migrations` prefix when the EmDash ledger is still empty

## Current EmDash Runtime Caveat

- Run `pnpm db:migrate:emdash:status` before any ledger repair; never repair when status is `unsafe`.
- Treat any direct mutation of `_emdash_migrations` as issue-scoped operator work with explicit rollback notes.
- The repo-owned migration CLI exposes explicit `emdash-status` and `emdash-repair` commands for issue-scoped operator use.
- When a migration command cannot reach the database, the CLI prints a non-secret error `kind`, `reason`, and message so operators can distinguish timeout, DNS, TLS, authentication, and Hyperdrive-binding blockers.

## Runtime Input

- `DATABASE_URL` is required to target the PostgreSQL database
- the runner uses `scripts/_local-env.mjs` to load `.env.local` first, then `.env`

## Usage

### Apply Pending Migrations

```bash
pnpm db:migrate
```

### Roll Back One Migration

```bash
pnpm db:migrate:down
```

### Check Migration Status

```bash
pnpm db:migrate:status
```

### Inspect EmDash Ledger Compatibility

```bash
pnpm db:migrate:emdash:status
```

### Verify EmDash Ledger Compatibility

```bash
pnpm db:migrate:emdash:verify
```

### Repair EmDash Ledger Ordering

```bash
pnpm db:migrate:emdash:repair
```

## Rules

- use Kysely migrations as the canonical schema change mechanism
- keep migration files ordered and descriptive
- use `Kysely<any>` in migration files when table migrations start landing
- do not introduce ad hoc schema changes outside migrations
- do not bypass PostgreSQL for first-party schema state

## Validation

- `pnpm db:migrate`
- `pnpm db:migrate:status`
- `pnpm db:migrate:down`
- `pnpm db:migrate:status`
