// SIKESRA Entity Repository
// D1 SQL for entity CRUD with tenant/site/deleted/region scope enforcement
// Source: docs/sikesra/03_data_model.md

import type { D1Binding, D1Result } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type {
  SikesraEntitySummary,
  EntityListFilters,
  EntityListParams,
  EntityKind,
  DataStatus,
  SensitivityLevel,
  DuplicateStatus,
  SourceInput,
} from "../services/entity";

const TABLE = "awcms_sikesra_entities";

// Base WHERE clause applied to every normal query
function baseWhere(ctx: SikesraRequestContext): { sql: string; params: unknown[] } {
  const conditions = ["tenant_id = ?", "site_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  // Region scope enforcement (backend-computed)
  if (ctx.regionScope.villageCodes?.length) {
    const placeholders = ctx.regionScope.villageCodes.map(() => "?").join(",");
    conditions.push(`official_village_code IN (${placeholders})`);
    params.push(...ctx.regionScope.villageCodes);
  }

  return { sql: conditions.join(" AND "), params };
}

// Apply list filters to WHERE clause
function applyFilters(
  base: { sql: string; params: unknown[] },
  filters?: EntityListFilters,
): { sql: string; params: unknown[] } {
  const conditions = [base.sql];
  const params = [...base.params];

  if (filters?.keyword) {
    conditions.push("(display_name LIKE ? OR sikesra_id_20 LIKE ?)");
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  if (filters?.objectTypeCode) {
    conditions.push("object_type_code = ?");
    params.push(filters.objectTypeCode);
  }
  if (filters?.objectSubtypeCode) {
    conditions.push("object_subtype_code = ?");
    params.push(filters.objectSubtypeCode);
  }
  if (filters?.villageCode) {
    conditions.push("official_village_code = ?");
    params.push(filters.villageCode);
  }
  if (filters?.statusData) {
    conditions.push("status_data = ?");
    params.push(filters.statusData);
  }
  if (filters?.statusVerification) {
    conditions.push("status_verification = ?");
    params.push(filters.statusVerification);
  }
  if (filters?.sensitivityLevel) {
    conditions.push("sensitivity_level = ?");
    params.push(filters.sensitivityLevel);
  }
  if (filters?.sourceInput) {
    conditions.push("source_input = ?");
    params.push(filters.sourceInput);
  }
  if (filters?.duplicateStatus) {
    conditions.push("duplicate_status = ?");
    params.push(filters.duplicateStatus);
  }

  return { sql: conditions.join(" AND "), params };
}

// Raw entity row from D1
interface EntityRow {
  id: string;
  sikesra_id_20?: string;
  object_type_code: string;
  object_subtype_code: string;
  entity_kind: EntityKind;
  display_name: string;
  official_village_code: string;
  status_data: DataStatus;
  status_verification: string;
  verification_level?: string;
  sensitivity_level: SensitivityLevel;
  completeness_percent: number;
  duplicate_status?: DuplicateStatus;
  source_input: SourceInput;
  created_at: string;
  updated_at: string;
}

function toSummary(row: EntityRow): SikesraEntitySummary {
  return {
    id: row.id,
    sikesraId20: row.sikesra_id_20,
    objectTypeCode: row.object_type_code,
    objectTypeName: "", // TODO: join with object_types
    objectSubtypeCode: row.object_subtype_code,
    objectSubtypeName: "", // TODO: join with object_subtypes
    entityKind: row.entity_kind,
    displayName: row.display_name,
    masked: false, // TODO: evaluate based on user permissions
    officialRegion: {}, // TODO: join with official_regions
    statusData: row.status_data,
    statusVerification: row.status_verification,
    verificationLevel: row.verification_level,
    sensitivityLevel: row.sensitivity_level,
    completenessPercent: row.completeness_percent,
    duplicateStatus: row.duplicate_status,
    sourceInput: row.source_input,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- Repository Methods ----------

export async function listEntities(
  db: D1Binding,
  params: EntityListParams,
  ctx: SikesraRequestContext,
): Promise<{ items: SikesraEntitySummary[]; total: number }> {
  const base = baseWhere(ctx);
  const filtered = applyFilters(base, params.filters);

  const limit = params.perPage ?? 50;
  const offset = params.page ? (params.page - 1) * limit : 0;

  const countSql = `SELECT COUNT(*) as cnt FROM ${TABLE} WHERE ${filtered.sql}`;
  const countResult = await db.prepare(countSql).bind(...filtered.params).first<{ cnt: number }>();
  const total = countResult?.cnt ?? 0;

  const sql = `SELECT * FROM ${TABLE} WHERE ${filtered.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const allParams = [...filtered.params, limit, offset];
  const result = await db.prepare(sql).bind(...allParams).all<EntityRow>();

  return {
    items: result.results.map(toSummary),
    total,
  };
}

export async function getEntityById(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<EntityRow | null> {
  const sql = `SELECT * FROM ${TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`;
  return db.prepare(sql).bind(entityId, ctx.tenantId, ctx.siteId).first<EntityRow>();
}

export async function createEntity(
  db: D1Binding,
  input: {
    id: string;
    objectTypeCode: string;
    objectSubtypeCode: string;
    entityKind: EntityKind;
    displayName: string;
    officialVillageCode: string;
    localRegionId?: string;
    sensitivityLevel?: SensitivityLevel;
    sourceInput?: SourceInput;
    sourceInstitution?: string;
    createdBy: string;
  },
  ctx: SikesraRequestContext,
): Promise<EntityRow> {
  const sql = `INSERT INTO ${TABLE} (
    id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
    display_name, official_village_code, local_region_id,
    sensitivity_level, source_input, source_institution, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    input.id,
    ctx.tenantId,
    ctx.siteId,
    input.objectTypeCode,
    input.objectSubtypeCode,
    input.entityKind,
    input.displayName,
    input.officialVillageCode,
    input.localRegionId ?? null,
    input.sensitivityLevel ?? "internal",
    input.sourceInput ?? "manual",
    input.sourceInstitution ?? null,
    input.createdBy,
  ).run();

  return (await getEntityById(db, input.id, ctx))!;
}

export async function patchEntity(
  db: D1Binding,
  entityId: string,
  updates: Record<string, unknown>,
  updatedBy: string,
  ctx: SikesraRequestContext,
): Promise<EntityRow | null> {
  const existing = await getEntityById(db, entityId, ctx);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    // Map camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    setClauses.push(`${snakeKey} = ?`);
    params.push(value);
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  setClauses.push("updated_by = ?");
  params.push(updatedBy);

  params.push(entityId, ctx.tenantId, ctx.siteId);

  await db.prepare(
    `UPDATE ${TABLE} SET ${setClauses.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ?`,
  ).bind(...params).run();

  return getEntityById(db, entityId, ctx);
}
