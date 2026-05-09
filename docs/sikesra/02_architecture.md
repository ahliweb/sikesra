# 02 Architecture

## Architecture Summary

SIKESRA must be built as a modular EmDash/AWCMS-Micro plugin. It contributes admin pages, public page data, API routes, D1 migrations, R2 storage scopes, permissions, services, repositories, validators, security helpers, and tests without changing EmDash core unless an extension point is truly missing.

This architecture is applied through the repository-specific integration rules in `../core/SIKESRA_INTEGRATION_OVERLAY.md`. That overlay takes precedence over generic core examples when paths, commands, or deployment details differ.

## Route Boundaries

| Surface | Route | Rule |
|---|---|---|
| Public page | `/sikesra` | No login. Aggregate-safe data only. |
| Admin UI | `/_emdash/admin/plugins/sikesra/*` | Login and permission required. |
| Admin Block Kit API | `/_emdash/api/plugins/sikesra/admin` | Login required. Wrapper delegates to EmDash first, then returns `data.blocks`. |
| Admin API | `/_emdash/api/plugins/sikesra/v1/*` | Login, RBAC, ABAC, region scope, masking, audit. |
| Public data | `/_emdash/api/plugins/sikesra/public/*` | Activation-gated, public-safe aggregates only. |
| Root public site | `/` | EmDash host-owned, never served by SIKESRA business logic. |

## Current Repository Layout

The generic core docs describe package-style module paths such as `packages/plugins/<plugin-id>/`. In this repository, SIKESRA is already integrated as a self-contained deployment with local source paths:

```txt
src/
  index.ts                    EmDash native plugin factory and registration
  plugin-entry.ts             package export entrypoint
  routes/                     SIKESRA API/admin route handlers and registry
  services/                   business workflows
  repositories/               D1 SQL access
  security/                   permissions, masking, ABAC, request context
  api/                        response envelope and request ID utilities
  pages/index.astro           EmDash-owned root public page
scripts/
  worker-wrapper-template.mjs hybrid runtime route split and SIKESRA public/API handling
  postbuild.mjs               generated worker/admin bundle integration adapter
migrations/sikesra/           D1 migrations
seeds/sikesra/                seed data
docs/core/                    generic core docs + SIKESRA integration overlay
docs/sikesra/                 SIKESRA product/runtime docs
```

Do not create `packages/plugins/sikesra/` in this repository unless a future refactor explicitly moves the local runtime source there and updates `docs/core/SIKESRA_INTEGRATION_OVERLAY.md`.

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Presentation | EmDash-owned root page, SIKESRA public page, EmDash admin shell, Block Kit admin payloads, EmDash/Kumo-compatible generated UI. |
| API/Routes | Request ID, auth, input validation, route permission, response envelope. |
| Context | Trusted tenant, site, user, role, permission, region, request metadata. |
| Security | RBAC, ABAC, masking, sensitivity decisions, denied access handling. |
| Services | Business rules, validation, workflow transitions, audit orchestration. |
| Repositories | D1 SQL only. Apply tenant/site/deleted/region filters. |
| Storage | R2 key generation, upload, download, checksum, signed/proxy access. |
| Audit | Immutable critical action events and redacted audit retrieval. |

## Core Services

| Service | Main Responsibility |
|---|---|
| `SikesraEntityService` | Draft, autosave, list, detail, archive/restore, detail writes. |
| `SikesraCodeService` | Generate and correct `sikesra_id_20` with audit. |
| `SikesraRegionService` | Official and local region lookup/management. |
| `SikesraAttributeService` | Attribute definitions and entity attribute values. |
| `SikesraAbacService` | Policy evaluation and effective access preview. |
| `SikesraVerificationService` | Queues, transitions, decisions, notes, checklist. |
| `SikesraDocumentService` | Upload, metadata, download, verification, replacement. |
| `SikesraImportService` | Workbook import, mapping, staging, validation, promotion. |
| `SikesraDeduplicationService` | Candidate scoring and decision persistence. |
| `SikesraReportService` | Public/admin aggregates and report metadata. |
| `SikesraExportService` | CSV/XLSX export jobs and restricted export controls. |
| `SikesraAuditService` | Audit write, list, detail, redaction. |
| `SikesraSettingsService` | Public visibility, limits, thresholds, feature flags. |

## Request Handling Sequence

Every admin API handler must follow this sequence:

1. Generate or read `requestId`.
2. Build trusted request context from EmDash session.
3. Validate path, query, and body.
4. Enforce authentication.
5. Check route-level RBAC permission.
6. Load minimal resource metadata if object-level authorization is needed.
7. Evaluate ABAC, region scope, status, sensitivity, and action.
8. Execute service method.
9. Serialize through backend masking/safety layer.
10. Write audit event if required.
11. Return common response envelope.

## Request Context

```ts
type SikesraRequestContext = {
  requestId: string;
  tenantId: string;
  siteId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  subjectAttributes: Record<string, unknown>;
  regionScope: {
    provinceCode?: string;
    regencyCode?: string;
    districtCodes?: string[];
    villageCodes?: string[];
    localRegionIds?: string[];
  };
  ipAddress?: string;
  userAgent?: string;
  nowIso: string;
};
```

Public context must be reduced and must resolve tenant/site from trusted host/site configuration, not arbitrary query parameters.

## Plugin Manifest Requirements

`module.manifest.json` remains a governance artifact if/when added. Runtime registration currently uses `src/index.ts`, `src/plugin-entry.ts`, and `astro.config.mjs`. The governance manifest should declare:

1. Module ID `sikesra`.
2. Version and lifecycle metadata.
3. Admin page contributions.
4. Public route `/sikesra`.
5. API namespace `/_emdash/api/plugins/sikesra/v1/*`.
6. All permissions from `06_security_rbac_abac.md`.
7. R2 storage scopes.
8. D1 migration and seed ownership.
9. Dependencies on audit, ABAC, media/storage, auth/session if available.
10. Rollback behavior and non-destructive disable behavior.

## R2 Key Format

```txt
tenants/{tenant_id}/sites/{site_id}/modules/sikesra/{classification}/{year}/{month}/{safe_filename}
```

For import and export files, use scoped subfolders:

```txt
tenants/{tenant_id}/sites/{site_id}/modules/sikesra/imports/{year}/{month}/{safe_filename}
tenants/{tenant_id}/sites/{site_id}/modules/sikesra/exports/{year}/{month}/{safe_filename}
```

## Deployment Model

| Component | Role |
|---|---|
| Cloudflare Worker `sikesra` | Single deployed runtime for EmDash host and SIKESRA routes. |
| `dist/server/worker-wrapper.mjs` | Hybrid route dispatcher generated from `scripts/worker-wrapper-template.mjs`. |
| `DB` binding | EmDash core D1 binding and plugin state source. |
| `SIKESRA_DB` binding | SIKESRA application D1 binding for module data. |
| `MEDIA` / `SIKESRA_DOCUMENTS` bindings | EmDash media and SIKESRA private document/import/export R2 scopes. |
| EmDash Core | Admin/plugin/auth/session foundation. |
| SIKESRA Plugin | SIKESRA-specific logic, public page, APIs, D1 schema, and Block Kit admin payloads. |

## Architecture Open Decisions

| Decision | Default Recommendation |
|---|---|
| Exact plugin folder | Resolved for this repo: local `src/`; generic `packages/plugins/sikesra/` is not active here. |
| Shared audit vs module-local audit | Prefer shared audit if compatible; otherwise `awcms_sikesra_audit_logs`. |
| Shared media vs SIKESRA file table | Prefer shared media if compatible; otherwise `awcms_sikesra_file_objects`. |
| ABAC integration | Prefer core ABAC Matrix if available; otherwise module-local ABAC service first. |
| Public data delivery | Resolved for this repo: `/sikesra` page calls same-origin public endpoints under `/_emdash/api/plugins/sikesra/public/*`. |
