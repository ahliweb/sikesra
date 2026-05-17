# SIKESRA Integration Overlay

This repository restores the SIKESRA plugin as a workspace plugin at `packages/plugins/sikesra`.

## Integration Contract

- Register `sikesraPlugin()` through normal EmDash plugin configuration (`demos/plugins-demo/astro.config.mjs`).
- Admin pages mount under `/_emdash/admin/plugins/sikesra/*` through the supported plugin shell.
- Plugin routes mount under `/_emdash/api/plugins/sikesra/*` through the supported plugin route registry.
- Public site output at `/sikesra` remains host-app owned and calls the plugin's public-safe endpoints.
- D1 schema and seed replay use plugin-owned artifacts in `packages/plugins/sikesra/migrations/` and `packages/plugins/sikesra/seeds/`, sourced from the preserved SQL in `update-backup/d1/`, not EmDash core migration edits.
- Cloudflare deployment bindings and wrapper behavior use `infra/sikesra/wrangler.jsonc`, `infra/sikesra/worker-wrapper-template.mjs`, and `scripts/sikesra-postbuild.mjs` rather than core package patches.
- All SIKESRA business logic stays outside EmDash core packages -- zero changes to `packages/core/` or `packages/admin/`.

## Implementation Status (as of 2026-05-18)

### Fully Implemented

| Area                   | Details                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Plugin descriptor      | `sikesraPlugin()` with admin pages (`/`, `/entities`, `/verification`, `/audit`, `/settings`, `/operations`), widget (`overview`), storage config |
| Route handlers         | 30 named routes defined in `sandbox-entry.ts`                                                                              |
| Region services        | Official and local region list services with tenant/site filtering and region-scope enforcement                            |
| Entity registry APIs   | D1-backed entity list/detail services with masking, access flags, and region-safe exclusion                                |
| Draft/detail data layer | Draft create/update/autosave now persist module detail data to the real 8 detail tables, and completeness checks required module keys |
| Archive/restore backend | `v1/entities/archive` and `v1/entities/restore` now enforce permission, confirmation, reason, audit, and restore-state derivation |
| Admin entity workflow  | Block-based create/edit/validate/generate/submit/archive/restore flow is available through the `/entities` admin surface   |
| Duplicate preview      | Entity detail and validation views surface duplicate candidate warnings from `awcms_sikesra_duplicate_candidates`           |
| Document step          | Entity workflow includes D1-backed document metadata registration and document listing on the `/entities` surface           |
| Wizard review polish   | Entity workflow includes progress navigation and a review/submit summary surface                                             |
| Document workflow      | Upload URL gen, upload complete, list, download w/ classification checks, verify, replace -- all with audit                |
| Import workflow        | CSV parse, batch create, row staging, column mapping + validation, duplicate detection, promote to entities, rollback      |
| Export workflow        | 3 report types (entity_summary, verification_status, audit_evidence), job lifecycle, CSV generation, permission filtering  |
| Security: Permissions  | 36 permissions under `awcms:sikesra:*` namespace (`src/security/permissions.ts`)                                           |
| Security: ABAC engine  | Full policy evaluation with 11 operators, deny precedence, region scoping (`src/security/abac.ts`)                         |
| Security: Masking      | NIK, phone, name, email, address, disability, guardian, document metadata, audit before/after (`src/security/masking.ts`)  |
| Security: Route guards | Permission checks + region scope enforcement (`src/security/route-guard.ts`)                                               |
| Security: Audit        | 28 audit action types, D1 write helper, high-risk action tracking (`src/security/audit.ts`)                                |
| Storage config         | 6 namespaces (documents, exportJobs, importBatches, importRows, promotedEntities, auditEntries)                            |
| D1 schema artifacts    | 12 plugin-owned SQL migration files plus baseline seeds, sourced from the 34-table preserved backup in `update-backup/d1/` |
| Infrastructure         | Worker wrapper template, wrangler config, postbuild script                                                                 |
| Demo integration       | Plugin registered in the active Cloudflare host app and worker deployment, public page at `/sikesra`                       |
| Scripts                | `sikesra-d1-overlay.mjs` (inventory/restore), `sikesra-smoke-admin-route.mjs`, `sikesra-postbuild.mjs`                     |
| Tests                  | 10 test files covering plugin descriptor, draft detail CRUD, admin entity workflow, document lifecycle, import, export, security, and admin route regressions |

### Placeholder / Needs Data Layer Connection

| Area                  | Current State                                                                                                                                                                                                                                | Next Step                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Public data endpoints | `public/metadata`, `public/filters`, and `public/summary` query ambient D1 data through `emdash/runtime` when the host runtime is available, and fall back to the safe placeholder envelope when the schema is missing or not configured | Extend the aggregate query layer as entity, region, and settings features land |
| Admin UI content      | Dashboard, registry, verification queue, audit, settings, and operations pages now render live Block Kit surfaces, including dedicated documents/imports/reports subpages                                                                | Build dedicated documents/imports/reports admin pages                           |
| `v1/status`           | Returns `{ status: "rebuild-pending" }`                                                                                                                                                                                                      | Update to reflect actual system health                                         |
| Request context       | Trusted plugin request context is injected from the host plugin API route, but region/tenant/site mapping still uses the current default AWCMS baseline when richer context is unavailable                                                  | Bridge to richer host tenancy and scoped-role data when available              |
| Live schema drift     | Admin pages now include compatibility aliases for the deployed D1 schema (`completeness_percent`, missing `submitted_at`)                                                                                                                     | Normalize schema expectations and remove compatibility shim once migrations converge |

### Not Started

| Area                   | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| React admin components | Zero `.tsx` files -- all admin UI is block-based via EmDash plugin system |
| Entity wizard polish   | Block-based wizard now includes active step navigation and a review/submit summary for the core 8-module flow |
| Import/Export admin UI | No dedicated upload/job management/duplicate review pages yet             |
| Dashboard/charts       | No charts/visualizations beyond KPI and queue blocks                      |
| Document management UI | No dedicated document management page yet                                 |

### Backend Available For UI

- `v1/entities` now returns real registry data with filtering, masking, and region-safe exclusion.
- `v1/entities/get` now returns entity detail, summary, verification metadata, and backend access flags.
- `v1/regions/official` and `v1/regions/local` now return real region data with tenant/site filtering and scope enforcement.
- The live plugin manager API now includes `sikesra` alongside other configured plugins.

## Follow-up Issues


## D1 Schema

34 tables with `awcms_sikesra_*` prefix, covering:

- Core: `entities`, `entity_people`, `entity_attributes`, `person_profiles`
- Taxonomy: `object_types`, `object_subtypes`, `official_regions`, `local_regions`
- Schema: `attribute_definitions`, `user_attribute_scopes`
- Codes: `code_sequences`, `code_history`
- Verification: `verification_events`
- Documents: `supporting_documents`, `file_objects`
- Import: `import_batches`, `import_staging_rows`, `import_mapping_templates`
- Duplicates: `duplicate_candidates`, `duplicate_decisions`
- Export: `export_jobs`
- Audit: `audit_logs`
- ABAC: `abac_policies`, `abac_policy_conditions`
- Settings: `settings`
- Subtype details: `benefit_service_history`, `anak_yatim_details`, `lansia_terlantar_details`, `disabilitas_details`, `guru_agama_details`, `lembaga_keagamaan_details`, `lks_details`, `rumah_ibadah_details`, `pendidikan_keagamaan_details`

Full backup remains in `update-backup/d1/`. Restore via `pnpm node scripts/sikesra-d1-overlay.mjs restore`. Canonical plugin-owned migration artifacts now live in `packages/plugins/sikesra/migrations/`, with baseline seeds in `packages/plugins/sikesra/seeds/`.

## Deployment

Production deployed at `https://emdash-plugins-demo.ahliweb.workers.dev` with D1, R2, KV bindings.
