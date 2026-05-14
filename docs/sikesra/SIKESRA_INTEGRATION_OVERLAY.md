# SIKESRA Integration Overlay

This repository restores the SIKESRA plugin as a workspace plugin at `packages/plugins/sikesra`.

## Integration Contract

- Register `sikesraPlugin()` through normal EmDash plugin configuration (`demos/plugins-demo/astro.config.mjs`).
- Admin pages mount under `/_emdash/admin/plugins/sikesra/*` through the supported plugin shell.
- Plugin routes mount under `/_emdash/api/plugins/sikesra/*` through the supported plugin route registry.
- Public site output at `/sikesra` remains host-app owned and calls the plugin's public-safe endpoints.
- D1 schema and seed replay use `scripts/sikesra-d1-overlay.mjs` plus preserved SQL in `update-backup/d1/`, not EmDash core migration edits.
- Cloudflare deployment bindings and wrapper behavior use `infra/sikesra/wrangler.jsonc`, `infra/sikesra/worker-wrapper-template.mjs`, and `scripts/sikesra-postbuild.mjs` rather than core package patches.
- All SIKESRA business logic stays outside EmDash core packages -- zero changes to `packages/core/` or `packages/admin/`.

## Implementation Status (as of 2026-05-14)

### Fully Implemented

| Area | Details |
|------|---------|
| Plugin descriptor | `sikesraPlugin()` with admin pages (`/`, `/operations`), widget (`overview`), storage config |
| Route handlers | 28 named routes defined in `sandbox-entry.ts` |
| Document workflow | Upload URL gen, upload complete, list, download w/ classification checks, verify, replace -- all with audit |
| Import workflow | CSV parse, batch create, row staging, column mapping + validation, duplicate detection, promote to entities, rollback |
| Export workflow | 3 report types (entity_summary, verification_status, audit_evidence), job lifecycle, CSV generation, permission filtering |
| Security: Permissions | 36 permissions under `awcms:sikesra:*` namespace (`src/security/permissions.ts`) |
| Security: ABAC engine | Full policy evaluation with 11 operators, deny precedence, region scoping (`src/security/abac.ts`) |
| Security: Masking | NIK, phone, name, email, address, disability, guardian, document metadata, audit before/after (`src/security/masking.ts`) |
| Security: Route guards | Permission checks + region scope enforcement (`src/security/route-guard.ts`) |
| Security: Audit | 28 audit action types, D1 write helper, high-risk action tracking (`src/security/audit.ts`) |
| Storage config | 6 namespaces (documents, exportJobs, importBatches, importRows, promotedEntities, auditEntries) |
| D1 schema backup | 34 SIKESRA tables (`awcms_sikesra_*` prefix) with full backup artifacts in `update-backup/d1/` |
| Infrastructure | Worker wrapper template, wrangler config, postbuild script |
| Demo integration | Plugin registered in `demos/plugins-demo/astro.config.mjs`, public page at `/sikesra` |
| Scripts | `sikesra-d1-overlay.mjs` (inventory/restore), `sikesra-smoke-admin-route.mjs`, `sikesra-postbuild.mjs` |
| Tests | 5 test files covering plugin descriptor, document lifecycle, import, export, and security |

### Placeholder / Needs Data Layer Connection

| Area | Current State | Next Step |
|------|---------------|-----------|
| Public data endpoints | `public/metadata`, `public/filters`, `public/summary` return hardcoded empty/placeholder data | Connect to D1 queries for real aggregate-safe data |
| Admin UI content | `buildAdminBlocks()` and `buildAdminWidget()` return static "restoration in progress" text | Build data-driven admin pages with live KPIs |
| `v1/status` | Returns `{ status: "rebuild-pending" }` | Update to reflect actual system health |
| Request context | `buildPluginRequestContext()` hardcodes `userId: "plugin-user"`, `roles: ["admin"]` | Integrate with real EmDash auth/session |

### Not Started

| Area | Description |
|------|-------------|
| React admin components | Zero `.tsx` files -- all admin UI is block-based via EmDash plugin system |
| Entity CRUD interfaces | No management UI for entities, people, attributes, regions |
| Import/Export admin UI | No upload forms, no job management UI, no duplicate review UI |
| Settings admin page | Settings permission exists but no UI |
| Dashboard/charts | No visualizations, all KPIs return 0 |
| Verification UI | No verification workflow interface |
| Document management UI | No document browsing/management interface |

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

Full backup in `update-backup/d1/`. Restore via `pnpm node scripts/sikesra-d1-overlay.mjs restore`.

## Deployment

Production deployed at `https://emdash-plugins-demo.ahliweb.workers.dev` with D1, R2, KV bindings.
