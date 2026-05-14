# Upstream Update And Restore Runbook

This repository worktree was force-aligned to the EmDash release tag `@emdash-cms/plugin-embeds@0.1.13` by replacing the local tree with the upstream snapshot while preserving `.git`, `.env`, and `update-backup/`.

## Update Source

- Upstream repository: `https://github.com/emdash-cms/emdash`
- Release tag: `@emdash-cms/plugin-embeds@0.1.13`
- Update method: `git archive <tag> | tar -xf -` into a temp directory, then `rsync --delete` into the repo
- Preserved local state: `.git`, `.env`, `update-backup/`

## Backup Inventory

All backup artifacts are in `update-backup/`.

- `d1/sikesra_full_20260514T014316Z.sql`: schema + data export for all non-virtual tables
- `d1/sikesra_schema_20260514T014316Z.sql`: schema-only export for all non-virtual tables
- `d1/sikesra_data_20260514T014316Z.sql`: data-only export for all non-virtual tables
- `d1/schema_objects_20260514T014316Z.sql`: full raw `sqlite_master` object capture
- `d1/schema_objects_20260514T014316Z_extras.sql`: virtual tables, views, and triggers excluded from the Wrangler export
- `d1/schema_objects_20260514T014316Z_fts_rebuild.sql`: FTS rebuild commands required after restore
- `d1/schema_objects_20260514T014316Z_tables.txt`: exact table list included in the filtered export
- `scripts/`: snapshot of the pre-update repository `scripts/` directory
- `package.json`: pre-update package manifest snapshot
- `repo-preupdate-overlay.tar.gz`: pre-update repository overlay snapshot excluding `.git`, `node_modules`, `dist`, `coverage`, and `update-backup`
- `pre-update-head.txt`: pre-update git `HEAD`
- `pre-update-status.txt`: pre-update working tree status

## Why The Backup Is Split

Cloudflare Wrangler could not export the database as a single file because the live D1 database contains `fts5` virtual tables. The backup therefore uses:

1. A filtered Wrangler export for regular tables.
2. A separate schema capture for virtual tables, views, and triggers.
3. A separate FTS rebuild SQL file.

This is expected and restorable.

## Restore The Database

Use the full backup if you want one import for regular tables, then apply the extras.

```bash
npx wrangler d1 execute sikesra --remote --file update-backup/d1/sikesra_full_20260514T014316Z.sql
npx wrangler d1 execute sikesra --remote --file update-backup/d1/schema_objects_20260514T014316Z_extras.sql
npx wrangler d1 execute sikesra --remote --file update-backup/d1/schema_objects_20260514T014316Z_fts_rebuild.sql
```

Use the schema/data split if you need to inspect or edit the restore steps:

```bash
npx wrangler d1 execute sikesra --remote --file update-backup/d1/sikesra_schema_20260514T014316Z.sql
npx wrangler d1 execute sikesra --remote --file update-backup/d1/sikesra_data_20260514T014316Z.sql
npx wrangler d1 execute sikesra --remote --file update-backup/d1/schema_objects_20260514T014316Z_extras.sql
npx wrangler d1 execute sikesra --remote --file update-backup/d1/schema_objects_20260514T014316Z_fts_rebuild.sql
```

Restore order matters:

1. Import the regular schema or full export.
2. Import the regular data if you used the split files.
3. Apply `schema_objects_*_extras.sql`.
4. Apply `schema_objects_*_fts_rebuild.sql`.

## Restore The Pre-Update Overlay

The repo-specific SIKESRA overlay is preserved in `update-backup/repo-preupdate-overlay.tar.gz`.

To inspect it without changing the current repo:

```bash
mkdir -p /tmp/opencode/sikesra-overlay-inspect
tar -xzf update-backup/repo-preupdate-overlay.tar.gz -C /tmp/opencode/sikesra-overlay-inspect
```

To compare the overlay against the updated upstream tree:

```bash
diff -ru /tmp/opencode/sikesra-overlay-inspect /home/data/dev_react/awcms-micro-sikesra
```

Do not bulk-copy the old overlay back onto the new upstream tree. Re-apply only non-core behavior through isolated plugin/module work.

## Re-Align Safely With EmDash

Use this rule for all follow-up work:

1. Keep EmDash core files identical to upstream unless a specific adapter is truly required.
2. Reintroduce SIKESRA behavior only outside EmDash core boundaries.
3. Prefer plugin/module packages, config, demos, docs, and deployment adapters over core edits.
4. Recreate data access from the SQL backups instead of relying on deleted source files.
5. Track every non-core restoration task as a focused GitHub issue.

## Recommended Follow-Up Flow

1. Keep this repo at the upstream release baseline.
2. Use `update-backup/` as the recovery source of truth.
3. Rebuild the SIKESRA overlay incrementally through issues.
4. After each overlay patch, verify that upstream EmDash files remain untouched unless the patch is explicitly an adapter.
