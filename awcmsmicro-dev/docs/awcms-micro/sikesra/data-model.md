# Data Model (ARCHIVED — see `README.md` in this directory)

> Superseded by `docs/prd/04.DATABASE_SCHEMA.md`. References `awcms_sikesra_*` SQL tables and `docs/sikesra/03_data_model.md`, neither of which exist in the current plugin (which uses `PluginStorageConfig` collections, not SQL tables) — kept only as historical record.

## Main Ownership

SIKESRA tables use the `awcms_sikesra_*` namespace and remain plugin-owned.

## Main Domains

- settings and master data
- official regions and local regions
- entities and module detail records
- attributes and relationships
- ABAC policy artifacts
- verification history
- documents
- imports, deduplication, exports, and audit trails

See `docs/sikesra/03_data_model.md` for the full model detail and migration sequence.
