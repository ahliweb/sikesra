# SIKESRA Religion Reference

## Current State

SIKESRA now has a reusable framework-neutral `AgamaSelect` view model in `src/plugins/sikesra-admin/religion-reference.mjs`.

The repository also now includes a minimal backend/reference-data seam in `src/backend/reference-data/religion-reference.mjs`, a repository-layer persistence seam in `src/backend/repositories/religion-reference-repository.mjs`, and a narrow backend service boundary in `src/backend/services/religion-reference-service.mjs`. The UI helper in `src/plugins/sikesra-admin/religion-reference.mjs` now consumes the service boundary for canonical values and normalization, but persistence is still not implemented yet.

The repository does not yet contain database migrations or a persisted backend reference table for religion master data. Until persistence is added, the UI model still exposes a controlled contract and reports repository-backend seam readiness, while the backend seam defines the canonical repository-local contract that `#49` should attach to.

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
4. `#49` should add persistence, service-layer authorization, and audit-covered runtime usage on top of that seam, repository boundary, and service boundary.

Tracked follow-up: `ahliweb/sikesra#49`.

## Validation

- `pnpm check`
- `node --check src/backend/repositories/religion-reference-repository.mjs`
- `node --check src/backend/services/religion-reference-service.mjs`
- `node --check src/backend/reference-data/religion-reference.mjs`
- `node --check src/plugins/sikesra-admin/religion-reference.mjs`
- `git diff --check`
