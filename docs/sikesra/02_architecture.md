# 02 Architecture

## Architecture Summary

SIKESRA must be built as a modular EmDash/AWCMS-Micro plugin. It contributes admin pages, public page data, API routes, D1 migrations, R2 storage scopes, permissions, services, repositories, validators, security helpers, and tests without changing EmDash core unless an extension point is truly missing.

## Route Boundaries

| Surface | Route | Rule |
|---|---|---|
| Public page | `/sikesra` | No login. Aggregate-safe data only. |
| Admin UI | `/_emdash/admin/plugins/sikesra/*` | Login and permission required. |
| Admin API | `/_emdash/api/plugins/sikesra/v1/*` | Login, RBAC, ABAC, region scope, masking, audit. |
| Public data | Astro loader or `/public/*` under plugin API | Must not expose admin/internal detail. |

## Recommended Module Layout

Use the actual repository convention discovered in Phase 0. If no convention exists, use this target layout:

```txt
packages/plugins/sikesra/
  module.manifest.json
  src/
    plugin.ts
    api/
      client.ts
      types.ts
      endpoints.ts
    routes/
      admin-api.ts
      public-api.ts
    admin/
      pages/
      components/
    public/
      SikesraPublicPage.astro
      components/
    services/
    repositories/
    validators/
    security/
    storage/
    migrations/
    seeds/
    tests/
```

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Presentation | Public Astro page, admin React pages, EmDash/Kumo components. |
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

`module.manifest.json` must declare:

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
| Cloudflare Pages/Workers | Runtime for public page, admin app, and plugin APIs. |
| Cloudflare D1 | Relational data, metadata, settings, staging, audit. |
| Cloudflare R2 | Documents, import workbooks, export files. |
| EmDash Core | Admin/plugin/auth/session foundation. |
| AWCMS-Micro Layer | Governance and module boundaries. |
| SIKESRA Plugin | All SIKESRA-specific logic and UI. |

## Architecture Open Decisions

| Decision | Default Recommendation |
|---|---|
| Exact plugin folder | Use repository convention found in Phase 0; otherwise `packages/plugins/sikesra/`. |
| Shared audit vs module-local audit | Prefer shared audit if compatible; otherwise `awcms_sikesra_audit_logs`. |
| Shared media vs SIKESRA file table | Prefer shared media if compatible; otherwise `awcms_sikesra_file_objects`. |
| ABAC integration | Prefer core ABAC Matrix if available; otherwise module-local ABAC service first. |
| Public data delivery | Prefer Astro loader backed by public-safe service; plugin public endpoint is acceptable if strictly safe. |
