# Skill: sikesra-api-rbac

Use this skill when implementing API routes, RBAC permission checks, ABAC filters, or audit logging for SIKESRA.

---

## 1. Route Handler Template

Setiap route handler WAJIB mengikuti urutan ini:

```typescript
// src/runtime.ts — di dalam createNativeRoutes()
{
  path: "/_emdash/api/plugins/awcms-sikesra/registry",
  method: "POST",
  handler: async (request: Request, ctx: PluginContext): Promise<Response> => {
    const meta = { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() }

    // STEP 1: Auth check
    const user = (ctx.locals as { user?: User }).user
    if (!user) {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Anda belum login" }, meta },
        { status: 401 }
      )
    }

    // STEP 2: RBAC permission check
    const hasPerm = checkUserPermission(user, AWCMS_SIKESRA_PERMISSIONS.registryWrite)
    if (!hasPerm) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "Tidak memiliki izin" }, meta },
        { status: 403 }
      )
    }

    // STEP 3: Parse + validate input
    let body: CreateEntityInput
    try {
      body = await request.json() as CreateEntityInput
    } catch {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Body tidak valid" }, meta },
        { status: 400 }
      )
    }
    if (!body.label || !body.entityType) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Field label dan entityType wajib diisi" }, meta },
        { status: 400 }
      )
    }

    // STEP 4: ABAC check (jika mengakses registry entities)
    const regionFilter = buildRegionFilter(user)
    // Pastikan user bisa input ke wilayah yang diminta
    if (regionFilter.village_code && body.region.villageCode !== regionFilter.village_code) {
      return Response.json(
        { error: { code: "SIKESRA_REGION_FORBIDDEN", message: "Anda tidak bisa input data di wilayah ini" }, meta },
        { status: 403 }
      )
    }

    // STEP 5: Business logic
    try {
      const entity = await ctx.storage.registryEntities.create({
        id: generateUlid(),
        code: generateEntityCode(body.entityType),
        label: body.label,
        entityType: body.entityType,
        // ...
      })

      // STEP 6: Audit event (WAJIB setelah mutasi)
      await ctx.storage.auditEvents.create(createAuditRecord({
        kind: "registry.created",
        scope: "sikesra:registry",
        actor: user.id,
        summary: `Entitas ${entity.label} dibuat`,
        metadata: { entityId: entity.id, entityType: entity.entityType }
      }))

      // STEP 7: Return success
      return Response.json({ data: entity, meta }, { status: 201 })

    } catch (error) {
      console.error("[sikesra:registry] create failed:", error)
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" }, meta },
        { status: 500 }
      )
    }
  }
}
```

## 2. RBAC Permissions Reference

```typescript
// src/permissions.ts
export const AWCMS_SIKESRA_PERMISSIONS = {
  dashboardRead: "awcms:sikesra:dashboard:read",
  settingsRead: "awcms:sikesra:settings:read",
  settingsUpdate: "awcms:sikesra:settings:update",
  auditRead: "awcms:sikesra:audit:read",
  publicStatusRead: "awcms:sikesra:public-status:read",
  stateTouch: "awcms:sikesra:state:touch",
  permissionCatalogRead: "awcms:sikesra:permissions:read",
  permissionCatalogWrite: "awcms:sikesra:permissions:write",
  roleCatalogRead: "awcms:sikesra:roles:read",
  roleCatalogWrite: "awcms:sikesra:roles:write",
  accessPreviewRead: "awcms:sikesra:access-preview:read",
  abacAttributeRead: "awcms:sikesra:abac-attributes:read",
  abacAttributeWrite: "awcms:sikesra:abac-attributes:write",
  abacPolicyRead: "awcms:sikesra:abac-policies:read",
  abacPolicyWrite: "awcms:sikesra:abac-policies:write",
  abacPreviewRead: "awcms:sikesra:abac-preview:read",
  // Add these if not present:
  registryRead: "awcms:sikesra:registry:read",
  registryWrite: "awcms:sikesra:registry:write",
  documentsRead: "awcms:sikesra:documents:read",
  documentsWrite: "awcms:sikesra:documents:write",
  verificationRead: "awcms:sikesra:verification:read",
  verificationVerify: "awcms:sikesra:verification:verify",
} as const
```

## 3. ABAC Region Filter

```typescript
type SikesraUserLevel = "desa_kelurahan" | "kecamatan" | "sopd" | "kabupaten" | "admin_sikesra"

interface RegionFilter {
  village_code?: string
  district_code?: string
  regency_code?: string
}

function buildRegionFilter(user: User): RegionFilter {
  const level = (user.attributes?.level ?? "desa_kelurahan") as SikesraUserLevel
  switch (level) {
    case "desa_kelurahan":
      return { village_code: user.attributes?.village_code as string }
    case "kecamatan":
      return { district_code: user.attributes?.district_code as string }
    case "sopd":
      return { regency_code: user.attributes?.regency_code as string }
    case "kabupaten":
    case "admin_sikesra":
      return {} // no filter — access all
  }
}

// Apply ke query
function applyRegionFilter(
  query: SelectQueryBuilder<any, any, any>,
  filter: RegionFilter
) {
  if (filter.village_code) return query.where("village_code", "=", filter.village_code)
  if (filter.district_code) return query.where("district_code", "=", filter.district_code)
  if (filter.regency_code) return query.where("regency_code", "=", filter.regency_code)
  return query
}
```

## 4. Response Envelope

```typescript
// Helper functions
function buildMeta() {
  return { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() }
}

function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ data, meta: buildMeta() }, { status })
}

function listResponse<T>(items: T[], nextCursor?: string): Response {
  return Response.json({ data: { items, nextCursor }, meta: buildMeta() })
}

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message }, meta: buildMeta() }, { status })
}
```

## 5. Cursor Pagination Pattern

```typescript
function decodeCursor(cursor: string | null): { id: string, createdAt: string } | null {
  if (!cursor) return null
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString())
  } catch {
    return null
  }
}

function encodeCursor(id: string, createdAt: string): string {
  return Buffer.from(JSON.stringify({ id, createdAt })).toString("base64")
}

// Usage in list handler:
const limitParam = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100)
const cursorParam = url.searchParams.get("cursor")
const decoded = decodeCursor(cursorParam)

let query = ctx.db.selectFrom("sikesra_registry_entities")
  .selectAll()
  .orderBy("created_at", "desc")
  .limit(limitParam + 1)  // fetch one extra to detect hasMore

if (decoded) {
  query = query.where("created_at", "<", decoded.createdAt)
}

const rows = await query.execute()
const hasMore = rows.length > limitParam
const items = hasMore ? rows.slice(0, limitParam) : rows
const lastItem = items[items.length - 1]
const nextCursor = hasMore && lastItem
  ? encodeCursor(lastItem.id, lastItem.created_at)
  : undefined
```

## 6. Audit Event Pattern

```typescript
import { createAuditRecord } from "./audit.js"

// Setelah create
await ctx.storage.auditEvents.create(createAuditRecord({
  kind: "registry.created",     // domain.action
  scope: "sikesra:registry",    // plugin scope
  actor: user.id,               // user ID atau "system"
  summary: `Entitas ${label} (${entityType}) dibuat`,
  metadata: { entityId, entityType, villageCode }
}))

// Setelah verify
await ctx.storage.auditEvents.create(createAuditRecord({
  kind: "verification.approved",
  scope: "sikesra:verification",
  actor: user.id,
  summary: `Entitas ${entity.label} disetujui di stage ${stage}`,
  metadata: { entityId, fromStage, toStage, notes }
}))

// Setelah update settings
await ctx.storage.auditEvents.create(createAuditRecord({
  kind: "settings.updated",
  scope: "sikesra:settings",
  actor: user.id,
  summary: "Plugin settings diperbarui",
  metadata: { changed: Object.keys(changes) }
}))
```

## 7. Error Codes

```typescript
// SIKESRA-specific error codes
const ERRORS = {
  NOT_INITIALIZED: ["SIKESRA_NOT_INITIALIZED", "Plugin belum di-setup", 500],
  ENTITY_NOT_FOUND: ["SIKESRA_ENTITY_NOT_FOUND", "Entitas tidak ditemukan", 404],
  STAGE_INVALID: ["SIKESRA_STAGE_INVALID", "Transisi stage tidak valid", 422],
  LEVEL_MISMATCH: ["SIKESRA_LEVEL_MISMATCH", "Level Anda tidak cukup untuk verifikasi stage ini", 403],
  REGION_FORBIDDEN: ["SIKESRA_REGION_FORBIDDEN", "Anda tidak memiliki akses ke wilayah ini", 403],
  SENSITIVITY_DENIED: ["SIKESRA_SENSITIVITY_DENIED", "Sensitivity level dokumen terlalu tinggi", 403],
  DOCUMENT_TOO_LARGE: ["SIKESRA_DOCUMENT_TOO_LARGE", "File terlalu besar (max 10MB)", 413],
  DOCUMENT_TYPE_INVALID: ["SIKESRA_DOCUMENT_TYPE_INVALID", "Tipe file tidak didukung (PDF/JPG/PNG)", 400],
} as const
```

## 8. Verification Stage Validation

```typescript
function validateStageTransition(
  currentStage: string,
  userLevel: SikesraUserLevel,
  result: "approved" | "needs_review" | "rejected"
): { valid: boolean; newStage?: string; error?: string } {

  const allowedLevels = STAGE_VERIFIER_LEVEL[currentStage]
  if (!allowedLevels?.includes(userLevel)) {
    return { valid: false, error: "SIKESRA_LEVEL_MISMATCH" }
  }

  if (result === "approved") {
    const nextStage = getNextStage(currentStage)
    if (!nextStage) return { valid: false, error: "SIKESRA_STAGE_INVALID" }
    return { valid: true, newStage: nextStage }
  }

  if (result === "needs_review") {
    const prevStage = getPreviousStage(currentStage)
    if (!prevStage) return { valid: false, error: "SIKESRA_STAGE_INVALID" }
    return { valid: true, newStage: prevStage }
  }

  if (result === "rejected") {
    return { valid: true, newStage: "draft" }
  }

  return { valid: false, error: "SIKESRA_STAGE_INVALID" }
}
```

## 9. Public Route (No Auth)

```typescript
// Untuk route publik (health check, public status)
{
  path: "/_emdash/api/plugins/awcms-sikesra/public/status",
  method: "GET",
  handler: async (request: Request, ctx: PluginContext): Promise<Response> => {
    // NO auth check — ini publik

    // Check KV cache dulu
    const cached = await ctx.kv.get<PublicAggregate>("sikesra:public-status-cache")
    if (cached) return Response.json({ data: cached, meta: buildMeta() })

    // Query aggregate
    const settings = await ctx.kv.get<SikesraSettings>("sikesra:settings") ?? DEFAULT_SETTINGS
    const threshold = settings.smallCellThreshold ?? 5

    // Hitung per entityType
    const counts = await ctx.db
      .selectFrom("sikesra_registry_entities")
      .select(["entity_type", sql`COUNT(*)`.as("total"), sql`SUM(CASE WHEN verification_stage = 'active_verified' THEN 1 ELSE 0 END)`.as("verified")])
      .groupBy("entity_type")
      .execute()

    const categories = counts.map(row => ({
      code: row.entity_type,
      label: ENTITY_TYPE_LABELS[row.entity_type as keyof typeof ENTITY_TYPE_LABELS] ?? row.entity_type,
      total: Number(row.total),
      verified: Number(row.verified),
      suppressed: Number(row.total) < threshold
    }))

    const result = { label: settings.publicStatusLabel, categories, caveat: "..." }

    // Cache 1 jam
    await ctx.kv.put("sikesra:public-status-cache", JSON.stringify(result), { expirationTtl: 3600 })

    return Response.json({ data: result, meta: buildMeta() })
  }
}
```
