# 06 Security, RBAC, and ABAC

## Security Goals

SIKESRA handles sensitive welfare data. The minimum security posture is:

1. Authentication for all admin routes and APIs.
2. RBAC base permission on every admin API.
3. ABAC for object-level operations.
4. Tenant/site/region scope enforcement in repository queries.
5. Server-side masking before serialization.
6. Aggregate-only public data with small-cell suppression.
7. Private R2 access through signed/proxy routes only.
8. Staged import with validation and duplicate review.
9. Restricted export controls with reason and audit.
10. Audit trail for all high-risk actions.

## Permission Namespace

All permissions must use:

```txt
awcms:sikesra:<resource>:<action>
```

## Permission Catalog

| Resource | Permissions |
|---|---|
| Dashboard | `dashboard:read` |
| Entity | `entity:read`, `entity:create`, `entity:update`, `entity:delete`, `entity:restore` |
| Code | `code:generate`, `code:correct` |
| Verification | `verification:submit`, `verification:verify` |
| Document | `document:upload`, `document:private_download`, `document:verify`, `document:replace` |
| Import | `import:create`, `import:read`, `import:promote` |
| Export | `export:create`, `export:restricted`, `export:audit` |
| Region | `region:read`, `region:manage` |
| Attribute | `attribute:read`, `attribute:write` |
| Policy | `policy:read`, `policy:write`, `policy:preview` |
| Audit | `audit:read`, `audit:export` |
| Settings | `settings:read`, `settings:update` |
| Sensitive | `sensitive:reveal`, `sensitive:highly_restricted_read` |

Implementation must register full names, for example `awcms:sikesra:dashboard:read`.

## Role Catalog

| Role | Default Scope | Notes |
|---|---|---|
| `super_admin` | Site/system | Highest technical and governance access. Critical actions still require audit and reason where configured. |
| `admin_kabupaten` | Regency | Broad operational access, highly restricted access only if explicitly granted. |
| `admin_kecamatan` | District | Scoped to assigned kecamatan. |
| `admin_desa_kelurahan` | Village | Scoped create/update/submit access. |
| `petugas_input` | Assigned region/module | Data entry only. |
| `verifikator_desa` | Village | Village-level verification. |
| `verifikator_kecamatan` | District | Kecamatan-level verification. |
| `verifikator_kabupaten` | Regency/OPD | Final or technical verification. |
| `pimpinan_viewer` | Assigned leadership scope | Aggregate-first; detail disabled by default. |
| `auditor` | Audit scope | Audit/export evidence with redaction. |
| `opd_teknis` | OPD/module/region | Technical validation. |
| `operator_lembaga` | Owned institution | Optional post-MVP owned-record access only. |
| `public` | Public | Aggregate-safe public page only. |

## API Permission Matrix

| Endpoint | Required Permission | Additional Check |
|---|---|---|
| `GET /dashboard` | `dashboard:read` | Region scope and sensitivity filtering. |
| `GET /entities` | `entity:read` | Region scope and masking. |
| `POST /entities` | `entity:create` | Creation scope. |
| `GET /entities/{id}` | `entity:read` | Object-level ABAC. |
| `PATCH /entities/{id}` | `entity:update` | Status, ownership, region, sensitivity. |
| `POST /entities/{id}/generate-code` | `code:generate` | Valid draft/staging state and ABAC. |
| `POST /entities/{id}/correct-code` | `code:correct` | High-trust role, reason, audit. |
| `POST /entities/{id}/submit` | `verification:submit` | Completeness, duplicate, workflow state. |
| `GET /verification/queue` | `verification:verify` | Verification level and region scope. |
| `POST /entities/{id}/verify` | `verification:verify` | Level, status transition, region/OPD scope. |
| `POST /documents/upload-url` | `document:upload` | Entity scope and classification. |
| `POST /documents/{id}/download` | `document:private_download` | Classification, reason for highly restricted. |
| `POST /imports` | `import:create` | Module/region scope. |
| `GET /imports/{id}/rows` | `import:read` | Batch scope and sensitive row masking. |
| `POST /imports/{id}/promote` | `import:promote` | Valid rows and duplicate decisions. |
| `POST /exports` | `export:create` | Field sensitivity and reason if restricted. |
| `GET /audit` | `audit:read` | Audit scope and redaction. |
| `PATCH /settings` | `settings:update` | Reason and audit. |

## ABAC Inputs

```ts
type SikesraAbacInput = {
  subject: Record<string, unknown>;
  resource: Record<string, unknown>;
  action: string;
  environment: Record<string, unknown>;
};
```

Subject attributes include roles, permissions, tenant, site, province, regency, district, village, local region, OPD scope, religion scope, verification level, export clearance, MFA/session assurance, and account status.

Resource attributes include resource type, entity ID, SIKESRA ID, object type/subtype, entity kind, official village, district, local region, religion, neglected status, desil, sensitivity, data status, verification status, source input, owner, and document classification.

Environment attributes include route class, request time, IP, user agent, request ID, reason requirement, small-cell threshold, and session assurance.

## ABAC Rules

1. Explicit deny overrides allow.
2. Region scope is always backend-computed.
3. Public route is denied entity detail access.
4. Highly restricted export is denied unless explicit clearance exists.
5. Verification decisions require matching level, status, module, and region/OPD scope.
6. Archived records cannot be updated except restore/correction workflows.
7. Local region changes cannot alter `sikesra_id_20`.

## Sensitive Data Matrix

| Data | Classification | Default Behavior |
|---|---|---|
| NIK/KIA | Highly restricted | Mask or omit. |
| NIK/KIA hash | Highly restricted | Never expose through normal API/UI/export. |
| Child name | Highly restricted | Mask unless explicitly authorized. |
| Guardian/wali details | Highly restricted | Mask by default. |
| Disability/ODGJ details | Highly restricted | Mask or aggregate. |
| Individual desil/extreme poverty | Restricted/highly restricted | Mask unless official access and permission exist. |
| Exact address | Restricted/highly restricted | Show village/district only unless authorized. |
| Phone/contact | Restricted | Partial mask. |
| R2 storage key | Operational secret | Never expose to normal frontend/API/export. |
| Public aggregates | Public safe | Show only if threshold passes. |

## Masking Examples

| Field | Example |
|---|---|
| NIK/KIA | `************1234` |
| Phone | `08******1234` |
| Protected person name | Initials or partial masked value. |
| Address | District/village only. |
| Document | Type/status only, no raw key or private URL unless authorized action. |

## Audit Event Catalog

| Domain | Actions |
|---|---|
| Entity | `entity.create`, `entity.update`, `entity.archive`, `entity.restore` |
| Code | `code.generate`, `code.correct`, `code.generate_failed` |
| Verification | `verification.submit`, `verification.verify`, `verification.need_revision`, `verification.reject` |
| Document | `document.upload`, `document.preview`, `document.download`, `document.replace`, `document.verify`, `document.reject`, `document.supersede` |
| Import | `import.create`, `import.map`, `import.validate`, `import.promote`, `import.skip_row`, `import.override_duplicate` |
| Export | `export.create`, `export.download`, `export.restricted_create`, `export.failed` |
| Access | `security.access_denied`, `security.sensitive_reveal`, `security.abac_denied` |
| Region | `region.official_import`, `region.local_create`, `region.local_update`, `region.local_deactivate` |
| ABAC | `attribute.create`, `attribute.update`, `policy.create`, `policy.update`, `policy.preview`, `policy.activate`, `policy.disable` |
| Settings | `settings.update` |

## Critical Risks

| Risk | Required Control |
|---|---|
| Sensitive API leakage | Central masking, ABAC, negative tests. |
| Public re-identification | Aggregate-only query, small-cell suppression, conservative filters. |
| Cross-region access | Repository-level region scope and ABAC tests. |
| Raw R2 key exposure | Signed/proxy access and DTO tests. |
| Import corruption | Staging, validation, preview, explicit promotion. |
| Restricted export misuse | Field-level export policy, reason, audit. |
| Audit leakage | Redact before/after by viewer permission. |

## Security Definition of Done

Security is MVP-ready when:

1. All permissions are registered.
2. Every admin API has an RBAC permission.
3. Every object operation evaluates ABAC.
4. Repository queries enforce tenant, site, deleted, and region filters.
5. Sensitive fields are masked server-side.
6. Public page is aggregate-only with suppression.
7. R2 keys are never exposed.
8. Restricted exports require permission and reason.
9. High-risk actions are audited.
10. Security tests in `10_validation_checklist.md` pass.
