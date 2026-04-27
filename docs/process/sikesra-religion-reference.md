# SIKESRA Religion Reference

## Current State

SIKESRA now has a reusable framework-neutral `AgamaSelect` view model in `src/plugins/sikesra-admin/religion-reference.mjs`.

The repository also now includes a minimal backend/reference-data seam in `src/backend/reference-data/religion-reference.mjs`, a repository-layer persistence seam in `src/backend/repositories/religion-reference-repository.mjs`, a real repository-owned migration contract in `src/db/migrations/index.mjs`, and a narrow backend service boundary in `src/backend/services/religion-reference-service.mjs`. The UI helper in `src/plugins/sikesra-admin/religion-reference.mjs` now consumes the service boundary for canonical values and normalization. The backend repository/service now also expose async runtime-read helpers that prefer live PostgreSQL-backed rows when the reviewed tables are available, while preserving the reviewed seed fallback when runtime persistence is unavailable.

The repository now contains a repository-owned migration contract for persisted religion reference tables and seed rows, executes reviewed PostgreSQL migrations through `psql`, can read runtime-backed religion reference rows through the async repository/service helpers when those tables are present, and now exposes a read-only `/api/v1/references/religions` backend handoff route for controlled option reads. The plugin/model metadata now also advertises that reviewed route contract explicitly so future consumers can switch over without rediscovering the endpoint shape. The `AgamaSelect` model now also reports its current load strategy explicitly as `sync_seed_fallback` with an `async_route_ready` handoff state, and the module-form plus registry-filter consumer seams mirror a stable `optionsSource` contract for renderers. This lets EmDash/UI consumers detect the current repository-safe fallback mode and reviewed route handoff without drilling into ad hoc nested metadata. The current synchronous plugin/UI contract still uses the reviewed seed-backed service methods until a dedicated consumer update lands.

The service boundary now also enforces reviewed authorization and audit rules for runtime management behavior:

- inactive religion reference reads require `sikesra.reference.manage`
- successful inactive reads expose audit action metadata `sikesra.reference.inactive_read`
- lifecycle activation/deactivation is now handled through the backend service seam, also gated by `sikesra.reference.manage`
- lifecycle changes emit scrubbed audit entries through `sikesra.reference.lifecycle_update`
- religion-sensitive report/export access now uses a backend authorization seam that defaults to aggregate-only scope unless `sikesra.reports.sensitive_export` is present
- religion-sensitive export/report audit payloads remain scrubbed and use `sikesra.reports.export`

Active read-only option access remains available for the current runtime handoff, while inactive lifecycle visibility and lifecycle changes are explicitly treated as managed reference-data concerns. The route returns a `403` error when `includeInactive=true` is requested without the required permission.

For backend report/export handling, the repository now also has an explicit service-layer authorization seam for religion-sensitive outputs. That seam requires `sikesra.reports.export`, downgrades requests to aggregate-only scope when `sikesra.reports.sensitive_export` is absent, and exposes scrubbed audit metadata for higher-level export/report handlers.

Workbook-specific follow-on planning for Tokoh Agama / Guru Agama / Pelayan Keagamaan import evidence is now tracked separately in `docs/process/sikesra-tokoh-agama-excel-field-sync-2026.md`, while the reviewed staging contract lives in `docs/process/sikesra-tokoh-agama-import-staging-plan.md` under GitHub issue `#76`. That workbook evidence should refine religion inference and import alias planning without expanding this document into a full import-staging design.

## Rules

- Do not use arbitrary free text for religion fields by default.
- Display Indonesian operator-facing labels such as `Agama Anak`, `Agama Lansia`, and `Agama Pendamping/Penanggung Jawab`.
- Do not expose internal database names such as `religion_reference_id` or `religion_code` in operator UI copy.
- Treat individual-level religion values as personal data.
- Require explicit permission and audit logging for individual-level export or full-detail display.
- Use aggregate-only religion data in dashboards and default reports unless a user is explicitly authorized.

## Controlled Values

The current UI contract uses these values:

- `islam` -> `Islam`
- `kristen` -> `Kristen`
- `katolik` -> `Katolik`
- `hindu` -> `Hindu`
- `buddha` -> `Buddha`
- `konghucu` -> `Konghucu`
- `kepercayaan` -> `Kepercayaan Terhadap Tuhan YME`

## Import Normalization

Import mapping normalizes common spelling variants before matching controlled values.

- `Katholik`, `Catholic`, and `Katolic` map to `Katolik`.
- `Budha` and `Buddhist` map to `Buddha`.
- `Konghuchu`, `Khonghucu`, `Kong Hu Cu`, and `Confucian` map to `Konghucu`.
- `Kristen Protestan`, `Protestan`, and `Protestant` map to `Kristen`.

Unknown values must remain unmapped and require operator review. They must not silently create new reference values.

## Backend Follow-Up

Create the persisted backend reference-data implementation before module forms persist religion data. The backend should provide controlled active/inactive lifecycle, stable internal IDs, import aliases, region-independent reference behavior, and audit coverage for changes.

Repository dependency order:

1. `#52` introduces the minimal backend reference-data seam now present in `src/backend/reference-data/religion-reference.mjs`.
2. `#53` adds the narrow service-layer read boundary on top of that seam.
3. `#54` adds the repository-layer persistence attachment seam under the service boundary.
4. `#55` adds the minimal `src/db` and migration scaffold.
5. `#56` replaces the scaffold placeholder with a real religion-reference table and seed migration contract.
6. `#69` adds the runtime-read preference with safe seed fallback.
7. `#70` adds the read-only backend handoff route for controlled religion reference reads.
8. `#71` exposes the reviewed route metadata from the plugin/model seam for future consumers.
9. `#72` exposes explicit select-model load strategy metadata so consumers can distinguish current sync fallback from the reviewed async route handoff.
10. `#73` exposes a stable `optionsSource` contract from the Agama consumer seam for renderer handoff.
11. `#74` exposes the same reviewed `optionsSource` contract from the registry religion filter seam.
12. `#49` is now satisfied by the repository-owned reference-data seam, runtime read handoff, consumer handoff metadata, managed lifecycle service boundary, and explicit report/export authorization helpers for individual-level religion handling.

Tracked follow-up: `ahliweb/sikesra#49`.

## Validation

- `pnpm check`
- `pnpm db:migrate:status`
- `node --check src/backend/repositories/religion-reference-repository.mjs`
- `node --check src/backend/services/religion-reference-service.mjs`
- `node --check src/backend/reference-data/religion-reference.mjs`
- `node --check src/plugins/sikesra-admin/religion-reference.mjs`
- `git diff --check`
