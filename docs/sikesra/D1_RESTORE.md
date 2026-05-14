# SIKESRA D1 Restore

The backup SQL in `update-backup/d1/` is the source of truth for restoring the SIKESRA schema and bootstrap data without modifying EmDash core migrations.

## Inventory

List the captured SIKESRA tables and object counts:

```bash
pnpm sikesra:d1:inventory
```

For machine-readable output:

```bash
node scripts/sikesra-d1-overlay.mjs inventory --json
```

## Dry Run Restore Plan

Preview the exact Wrangler commands without executing them:

```bash
pnpm sikesra:d1:restore --database sikesra
```

Use the split files instead of the combined export:

```bash
pnpm sikesra:d1:restore --database sikesra --split
```

## Apply The Restore

Run the replay against the remote D1 database:

```bash
pnpm sikesra:d1:restore --database sikesra --execute
```

Or against local Wrangler state:

```bash
pnpm sikesra:d1:restore --database sikesra --local --execute
```

## Restore Order

Full mode:

1. Import `sikesra_full_20260514T014316Z.sql`
2. Apply `schema_objects_20260514T014316Z_extras.sql`
3. Apply `schema_objects_20260514T014316Z_fts_rebuild.sql`

Split mode:

1. Import `sikesra_schema_20260514T014316Z.sql`
2. Import `sikesra_data_20260514T014316Z.sql`
3. Apply `schema_objects_20260514T014316Z_extras.sql`
4. Apply `schema_objects_20260514T014316Z_fts_rebuild.sql`

This keeps SIKESRA replayable as repo-local overlay work while leaving EmDash core migration history untouched.
