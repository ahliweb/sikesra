# SIKESRA Religion Reference

## Current State

SIKESRA now has a reusable framework-neutral `AgamaSelect` view model in `src/plugins/sikesra-admin/religion-reference.mjs`.

The repository does not yet contain database migrations or a backend reference table for religion master data. Until that backend seam exists, the UI model exposes a controlled local contract and marks the source as `planned_backend_reference`.

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

Create the backend reference-data implementation before module forms persist religion data. The backend should provide controlled active/inactive lifecycle, stable internal IDs, import aliases, region-independent reference behavior, and audit coverage for changes.

Tracked follow-up: `ahliweb/sikesra#49`.

## Validation

- `pnpm check`
- `node --check src/plugins/sikesra-admin/religion-reference.mjs`
- `git diff --check`
