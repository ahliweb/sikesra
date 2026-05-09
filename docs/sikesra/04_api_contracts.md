# 04 API Contracts

## API Principles

1. Every response includes `requestId`.
2. Every admin endpoint requires authentication and a base permission.
3. Object-level reads, writes, downloads, exports, and verification decisions require ABAC.
4. List endpoints support pagination and scope filters.
5. Sensitive values are masked server-side before response serialization.
6. Public endpoints return aggregate-safe data only.
7. Mutation responses return enough updated state for UI to continue without blind guessing.

## Response Envelope

```ts
type ApiSuccess<T> = {
  ok: true;
  requestId: string;
  data: T;
  meta?: Record<string, unknown>;
};

type ApiFailure = {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
    fields?: FieldError[];
    details?: Record<string, unknown>;
  };
};

type FieldError = {
  path: string;
  section?: string;
  message: string;
  code?: string;
};
```

## Shared Types

```ts
type PageMeta = {
  page?: number;
  perPage: number;
  total?: number;
  nextCursor?: string;
  hasMore: boolean;
};

type OfficialRegionBreadcrumb = {
  province?: { code: string; name: string };
  regency?: { code: string; name: string };
  district?: { code: string; name: string };
  village?: { code: string; name: string };
};

type LocalRegionBreadcrumb = {
  items: Array<{
    id: string;
    level: 'dusun' | 'lingkungan' | 'rw' | 'rt' | 'blok' | 'zona' | 'area_petugas';
    codeLocal?: string;
    name: string;
  }>;
};

type AuditHint = {
  auditEventId?: string;
  audited: boolean;
  message?: string;
};
```

## Entity Summary

```ts
type SikesraEntitySummary = {
  id: string;
  sikesraId20?: string;
  objectTypeCode: string;
  objectTypeName: string;
  objectSubtypeCode: string;
  objectSubtypeName: string;
  entityKind: 'person' | 'institution' | 'building' | 'group' | 'service_record';
  displayName: string;
  masked: boolean;
  officialRegion: OfficialRegionBreadcrumb;
  localRegion?: LocalRegionBreadcrumb;
  statusData: 'draft' | 'submitted' | 'active' | 'archived';
  statusVerification: string;
  verificationLevel?: string;
  sensitivityLevel: 'public_safe' | 'internal' | 'restricted' | 'highly_restricted';
  completenessPercent: number;
  duplicateStatus?: 'unknown' | 'none' | 'candidate' | 'confirmed' | 'resolved';
  sourceInput: 'manual' | 'import' | 'integration';
  createdAt: string;
  updatedAt: string;
};
```

## Endpoint Summary

Admin v1 paths below are relative to `/_emdash/api/plugins/sikesra/v1`.

Public paths are not under `v1`; they are mounted at `/_emdash/api/plugins/sikesra/public/*` and are activation-gated by the hybrid wrapper.

The EmDash admin Block Kit route is a special compatibility endpoint at `/_emdash/api/plugins/sikesra/admin`. It must return EmDash's plugin API envelope:

```json
{
  "data": {
    "blocks": []
  }
}
```

Do not return raw `{ "blocks": [] }` from this route; the EmDash admin client reads `(await response.json()).data.blocks`.

| Group | Method and Path | Permission | Purpose |
|---|---|---|---|
| Public | `GET /metadata` under public mount | Public-safe | Public title, description, status, update timestamp. |
| Public | `GET /filters` under public mount | Public-safe | Safe public filter options. |
| Public | `GET /summary` under public mount | Public-safe | Public KPIs and charts with suppression. |
| Admin Block Kit | `POST /_emdash/api/plugins/sikesra/admin` | EmDash plugin route auth | Render requested SIKESRA admin page as `data.blocks`. |
| Dashboard | `GET /dashboard` | `dashboard:read` | Scoped admin KPIs, queues, summaries. |
| Entities | `GET /entities` | `entity:read` | Registry list. |
| Entities | `POST /entities` | `entity:create` | Create draft shell. |
| Entities | `GET /entities/{id}` | `entity:read` + ABAC | Detail payload with tabs and access flags. |
| Entities | `PATCH /entities/{id}` | `entity:update` + ABAC | Autosave section patch. |
| Validation | `POST /entities/{id}/validate` | `entity:read` + ABAC | Section validation and duplicate preview. |
| Code | `POST /entities/{id}/generate-code` | `code:generate` + ABAC | Generate 20-digit ID. |
| Code | `POST /entities/{id}/correct-code` | `code:correct` + ABAC | Controlled correction with reason. |
| Verification | `POST /entities/{id}/submit` | `verification:submit` + ABAC | Submit to workflow. |
| Verification | `GET /verification/queue` | `verification:verify` | Queue by level and scope. |
| Verification | `POST /entities/{id}/verify` | `verification:verify` + ABAC | Verify, need revision, reject. |
| Documents | `POST /documents/upload-url` | `document:upload` + ABAC | Start upload flow. |
| Documents | `POST /documents/complete-upload` | `document:upload` + ABAC | Finalize upload metadata. |
| Documents | `GET /entities/{id}/documents` | `entity:read` or document permission | Document list with masked metadata. |
| Documents | `POST /documents/{id}/download` | `document:private_download` + ABAC | Preview/download via signed/proxy route. |
| Documents | `POST /documents/{id}/verify` | `document:verify` + ABAC | Verify/reject document. |
| Imports | `POST /imports` | `import:create` | Create import batch. |
| Imports | `GET /imports/{id}/rows` | `import:read` + ABAC | Staging rows. |
| Imports | `PATCH /imports/{id}/rows/{rowId}` | import permission + ABAC | Correct staging row. |
| Imports | `POST /imports/{id}/promote` | `import:promote` + ABAC | Promote valid rows. |
| Reports | `GET /reports` | `export:create` or report read | Report metadata. |
| Exports | `POST /exports` | `export:create` + ABAC | Create export job. |
| Exports | `GET /exports/{id}` | `export:create` + ABAC | Export job status/download. |
| Regions | `GET /regions/official` | surface permission or `region:read` | Official regions. |
| Regions | `GET /regions/local` | surface permission or `region:read` | Local regions. |
| Regions | `POST /regions/local` | `region:manage` + ABAC | Create local region. |
| Attributes | `GET /attributes` | `attribute:read` or policy permission | Attribute definitions. |
| Policies | `POST /policies/preview` | `policy:preview` | ABAC preview. |
| Audit | `GET /audit` | `audit:read` | Audit list. |
| Audit | `GET /audit/{id}` | `audit:read` | Audit detail with redaction. |
| Settings | `GET /settings` | `settings:read` | Module settings. |
| Settings | `PATCH /settings` | `settings:update` | Update settings with reason. |

Implementation must use full permission names such as `awcms:sikesra:entity:read`.

## Public Contracts

Public contract base path:

```txt
/_emdash/api/plugins/sikesra/public
```

### `GET /public/metadata`

```ts
type PublicMetadataResponse = {
  enabled: boolean;
  title: string;
  description: string;
  latestUpdateAt?: string;
  dataScopeNote: string;
  officialContact?: string;
};
```

### `GET /public/filters`

```ts
type PublicFiltersResponse = {
  districts: Array<{ code: string; name: string }>;
  villages: Array<{ code: string; name: string; districtCode: string }>;
  objectTypes: Array<{ code: string; name: string }>;
  years: number[];
  statuses: Array<{ code: string; label: string }>;
};
```

### `GET /public/summary`

```ts
type PublicSummaryResponse = {
  kpis: {
    totalEntities: number;
    verifiedEntities: number;
    activeVillages: number;
    latestUpdateAt?: string;
  };
  charts: {
    byObjectType: AggregatePoint[];
    byRegion: AggregatePoint[];
    byVerificationStatus: AggregatePoint[];
    bySafeAttribute: AggregatePoint[];
  };
  suppression: {
    threshold: number;
    suppressedCells: number;
  };
  caveat: string;
};

type AggregatePoint = {
  key: string;
  label: string;
  total: number;
  metadata?: Record<string, string | number>;
};
```

## Dashboard Contract

```ts
type DashboardResponse = {
  scope: {
    tenantId: string;
    siteId: string;
    regionScopeLabel: string;
  };
  kpis: {
    total: number;
    draft: number;
    submitted: number;
    verified: number;
    needRevision: number;
    rejected: number;
  };
  workQueues: Array<{
    key: string;
    label: string;
    total: number;
    href: string;
    permission: string;
  }>;
  regionalSummary: Array<{
    regionCode: string;
    regionName: string;
    total: number;
    completionPercent: number;
    verificationPercent: number;
  }>;
  attributeSummary: AggregatePoint[];
  activity: AuditActivityItem[];
};
```

## Entity Detail Contract

```ts
type EntityDetailResponse = {
  entity: SikesraEntitySummary;
  summary: Record<string, unknown>;
  details?: Record<string, unknown>;
  attributes?: EntityAttributeValue[];
  documents?: DocumentSummary[];
  verification?: VerificationTimeline;
  benefits?: BenefitServiceHistoryItem[];
  audit?: AuditActivityItem[];
  access: {
    canEdit: boolean;
    canSubmit: boolean;
    canVerify: boolean;
    canGenerateCode: boolean;
    canRevealSensitive: boolean;
    canDownloadDocuments: boolean;
    deniedActions: Array<{ action: string; reasonCode: string }>;
  };
};
```

## Validation Contracts

Stable section keys:

| Section Key | UI Step |
|---|---|
| `jenis_data` | Jenis Data |
| `wilayah_resmi` | Wilayah Resmi |
| `wilayah_rinci_lokal` | Wilayah Rinci Lokal |
| `identitas_utama` | Identitas Utama |
| `atribut_inti` | Atribut Inti |
| `detail_modul` | Detail Modul |
| `relasi_orang` | Pengurus/Wali/Pengasuh |
| `dokumen_pendukung` | Dokumen Pendukung |
| `validasi_duplikasi` | Validasi dan Duplikasi |
| `generate_id` | Generate ID |
| `review_submit` | Review dan Submit |

```ts
type SectionValidationResult = {
  section: string;
  valid: boolean;
  errors: FieldError[];
  warnings: FieldError[];
};

type CompletenessResult = {
  overallPercent: number;
  sections: Array<{
    key: string;
    label: string;
    percent: number;
    requiredComplete: boolean;
    missingRequiredCount: number;
  }>;
};
```

## Status Code Guidance

| Condition | Status |
|---|---:|
| Success read/update | 200 |
| Created draft/import/export | 201 |
| Validation failed | 400 or 422 according to repository convention |
| Unauthenticated | 401 |
| Unauthorized | 403 |
| Sensitive object existence should be hidden | 404 |
| Not found | 404 |
| Conflict, duplicate, stale revision | 409 |
| Rate limited | 429 |
| Unexpected error | 500 with safe message and request ID |
