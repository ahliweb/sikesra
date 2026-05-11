// SIKESRA Entity Repository
// D1 SQL for entity CRUD with tenant/site/deleted/region scope enforcement
// Source: docs/sikesra/03_data_model.md

import type { D1Binding, D1Result } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import { maskProtectedName } from "../security/masking";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
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
import type { LocalRegionBreadcrumb } from "../services/types";

const TABLE = "awcms_sikesra_entities";

// Base WHERE clause applied to every normal query
function baseWhere(ctx: SikesraRequestContext): { sql: string; params: unknown[] } {
  const conditions = ["tenant_id = ?", "site_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  if (ctx.regionScope.villageCodes?.length) {
    const scopedPlaceholders = ctx.regionScope.villageCodes.map(() => "?").join(",");
    conditions.push(`official_village_code IN (${scopedPlaceholders})`);
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
  if (filters?.districtCode) {
    conditions.push("official_village_code LIKE ?");
    params.push(`${filters.districtCode}%`);
  }
  if (filters?.villageCode) {
    conditions.push("official_village_code = ?");
    params.push(filters.villageCode);
  }
  if (filters?.localRegionId) {
    conditions.push("local_region_id = ?");
    params.push(filters.localRegionId);
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
  if (typeof filters?.completenessMin === "number") {
    conditions.push("completeness_percent >= ?");
    params.push(filters.completenessMin);
  }
  if (typeof filters?.completenessMax === "number") {
    conditions.push("completeness_percent <= ?");
    params.push(filters.completenessMax);
  }

  return { sql: conditions.join(" AND "), params };
}

interface EntityRow {
  id: string;
  sikesra_id_20?: string;
  object_type_code: string;
  object_subtype_code: string;
  entity_kind: EntityKind;
  display_name: string;
  official_village_code: string;
  local_region_id?: string | null;
  address_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinate_accuracy_meters?: number | null;
  coordinate_source?: string | null;
  coordinate_recorded_at?: string | null;
  coordinate_recorded_by?: string | null;
  religion_attribute?: string | null;
  neglected_attribute?: string | null;
  desil_attribute?: string | null;
  status_data: DataStatus;
  status_verification: string;
  verification_level?: string;
  sensitivity_level: SensitivityLevel;
  completeness_percent: number;
  duplicate_status?: DuplicateStatus;
  source_input: SourceInput;
  source_institution?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface LocalRegionRow {
  id: string;
  parent_id?: string | null;
  level: string;
  code_local?: string | null;
  name: string;
}

interface HydrationMaps {
  objectTypes: Map<string, string>;
  objectSubtypes: Map<string, string>;
  officialRegions: Map<string, string>;
  localRegions: Map<string, LocalRegionRow>;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(",");
}

function canRevealSensitive(ctx: SikesraRequestContext): boolean {
  return ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_REVEAL)
    || ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_HIGHLY_RESTRICTED_READ)
    || ctx.roles.includes("owner")
    || ctx.roles.includes("super_admin");
}

async function loadHydrationMaps(
  db: D1Binding,
  rows: EntityRow[],
  ctx: SikesraRequestContext,
): Promise<HydrationMaps> {
  const objectTypeCodes = unique(rows.map((row) => row.object_type_code));
  const subtypeTypeCodes = unique(rows.map((row) => row.object_type_code));
  const villageCodes = unique(rows.map((row) => row.official_village_code));
  const districtCodes = unique(villageCodes.map((code) => code.length >= 6 ? code.slice(0, 6) : null));
  const regencyCodes = unique(villageCodes.map((code) => code.length >= 4 ? code.slice(0, 4) : null));
  const provinceCodes = unique(villageCodes.map((code) => code.length >= 2 ? code.slice(0, 2) : null));
  const regionCodes = unique([...villageCodes, ...districtCodes, ...regencyCodes, ...provinceCodes]);
  const localRegionIds = unique(rows.map((row) => row.local_region_id ?? null));

  const objectTypes = new Map<string, string>();
  const objectSubtypes = new Map<string, string>();
  const officialRegions = new Map<string, string>();
  const localRegions = new Map<string, LocalRegionRow>();

  if (objectTypeCodes.length > 0) {
    const result = await db.prepare(
      `SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND code IN (${buildPlaceholders(objectTypeCodes.length)})`,
    ).bind(ctx.tenantId, ctx.siteId, ...objectTypeCodes).all<{ code: string; name: string }>();

    for (const row of result.results) {
      objectTypes.set(row.code, row.name);
    }
  }

  if (subtypeTypeCodes.length > 0) {
    const result = await db.prepare(
      `SELECT type_code, code, name FROM awcms_sikesra_object_subtypes WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND type_code IN (${buildPlaceholders(subtypeTypeCodes.length)})`,
    ).bind(ctx.tenantId, ctx.siteId, ...subtypeTypeCodes).all<{ type_code: string; code: string; name: string }>();

    for (const row of result.results) {
      objectSubtypes.set(`${row.type_code}:${row.code}`, row.name);
    }
  }

  if (regionCodes.length > 0) {
    const result = await db.prepare(
      `SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND code IN (${buildPlaceholders(regionCodes.length)})`,
    ).bind(ctx.tenantId, ctx.siteId, ...regionCodes).all<{ code: string; name: string }>();

    for (const row of result.results) {
      officialRegions.set(row.code, row.name);
    }
  }

  if (localRegionIds.length > 0) {
    const result = await db.prepare(
      `SELECT id, parent_id, level, code_local, name FROM awcms_sikesra_local_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND id IN (${buildPlaceholders(localRegionIds.length)})`,
    ).bind(ctx.tenantId, ctx.siteId, ...localRegionIds).all<LocalRegionRow>();

    for (const row of result.results) {
      localRegions.set(row.id, row);
    }
  }

  return { objectTypes, objectSubtypes, officialRegions, localRegions };
}

function toLocalRegionBreadcrumb(localRegion?: LocalRegionRow): LocalRegionBreadcrumb | undefined {
  if (!localRegion) return undefined;
  return {
    items: [{
      id: localRegion.id,
      level: localRegion.level as LocalRegionBreadcrumb["items"][number]["level"],
      codeLocal: localRegion.code_local ?? undefined,
      name: localRegion.name,
    }],
  };
}

function toSummary(row: EntityRow, maps: HydrationMaps, ctx: SikesraRequestContext): SikesraEntitySummary {
  const revealSensitive = canRevealSensitive(ctx);
  const villageCode = row.official_village_code;
  const districtCode = villageCode?.length >= 6 ? villageCode.slice(0, 6) : undefined;
  const regencyCode = villageCode?.length >= 4 ? villageCode.slice(0, 4) : undefined;
  const provinceCode = villageCode?.length >= 2 ? villageCode.slice(0, 2) : undefined;
  const localRegion = row.local_region_id ? maps.localRegions.get(row.local_region_id) : undefined;
  const displayName = row.sensitivity_level === "public_safe" || row.sensitivity_level === "internal"
    ? row.display_name
    : (maskProtectedName(row.display_name, {
      canRevealSensitive: revealSensitive,
      canRevealHighlyRestricted: revealSensitive,
    }) ?? row.display_name);

  return {
    id: row.id,
    sikesraId20: row.sikesra_id_20,
    objectTypeCode: row.object_type_code,
    objectTypeName: maps.objectTypes.get(row.object_type_code) ?? row.object_type_code,
    objectSubtypeCode: row.object_subtype_code,
    objectSubtypeName: maps.objectSubtypes.get(`${row.object_type_code}:${row.object_subtype_code}`) ?? row.object_subtype_code,
    entityKind: row.entity_kind,
    displayName,
    masked: displayName !== row.display_name,
    officialRegion: {
      province: provinceCode && maps.officialRegions.has(provinceCode) ? { code: provinceCode, name: maps.officialRegions.get(provinceCode)! } : undefined,
      regency: regencyCode && maps.officialRegions.has(regencyCode) ? { code: regencyCode, name: maps.officialRegions.get(regencyCode)! } : undefined,
      district: districtCode && maps.officialRegions.has(districtCode) ? { code: districtCode, name: maps.officialRegions.get(districtCode)! } : undefined,
      village: villageCode && maps.officialRegions.has(villageCode) ? { code: villageCode, name: maps.officialRegions.get(villageCode)! } : undefined,
    },
    localRegion: toLocalRegionBreadcrumb(localRegion),
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

export async function hydrateEntitySummary(
  db: D1Binding,
  row: EntityRow,
  ctx: SikesraRequestContext,
): Promise<SikesraEntitySummary> {
  const maps = await loadHydrationMaps(db, [row], ctx);
  return toSummary(row, maps, ctx);
}

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
  const maps = await loadHydrationMaps(db, result.results, ctx);

  return {
    items: result.results.map((row) => toSummary(row, maps, ctx)),
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
