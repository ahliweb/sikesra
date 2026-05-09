// SIKESRA Region Repository
// D1 SQL for official and local region lookup
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { OfficialRegion, LocalRegion, LocalRegionCreateInput } from "../services/region";

const OFFICIAL_TABLE = "awcms_sikesra_official_regions";
const LOCAL_TABLE = "awcms_sikesra_local_regions";

export async function getOfficialRegionsRepo(
  db: D1Binding,
  ctx: SikesraRequestContext,
  parentCode?: string,
  level?: string,
): Promise<OfficialRegion[]> {
  const conditions = ["tenant_id = ?", "site_id = ?", "deleted_at IS NULL", "is_active = 1"];
  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  if (parentCode) { conditions.push("parent_code = ?"); params.push(parentCode); }
  if (level) { conditions.push("level = ?"); params.push(level); }

  const sql = `SELECT * FROM ${OFFICIAL_TABLE} WHERE ${conditions.join(" AND ")} ORDER BY code`;
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    code: r.code as string,
    name: r.name as string,
    level: r.level as OfficialRegion["level"],
    parentCode: r.parent_code as string | undefined,
    kemendagriVersion: r.kemendagri_version as string | undefined,
    isActive: !!(r.is_active),
  }));
}

export async function getLocalRegionsRepo(
  db: D1Binding,
  ctx: SikesraRequestContext,
  villageCode?: string,
): Promise<LocalRegion[]> {
  const conditions = ["tenant_id = ?", "site_id = ?", "deleted_at IS NULL", "is_active = 1"];
  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  if (villageCode) { conditions.push("official_village_code = ?"); params.push(villageCode); }

  const sql = `SELECT * FROM ${LOCAL_TABLE} WHERE ${conditions.join(" AND ")} ORDER BY name`;
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    id: r.id as string,
    officialVillageCode: r.official_village_code as string,
    parentId: r.parent_id as string | undefined,
    level: r.level as LocalRegion["level"],
    codeLocal: r.code_local as string | undefined,
    name: r.name as string,
    description: r.description as string | undefined,
    latitude: r.latitude as number | undefined,
    longitude: r.longitude as number | undefined,
    isActive: !!(r.is_active),
  }));
}

export async function createLocalRegionRepo(
  db: D1Binding,
  id: string,
  input: LocalRegionCreateInput,
  createdBy: string,
  ctx: SikesraRequestContext,
): Promise<LocalRegion> {
  const sql = `INSERT INTO ${LOCAL_TABLE} (
    id, tenant_id, site_id, official_village_code, parent_id, level, code_local, name, description, latitude, longitude, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    id, ctx.tenantId, ctx.siteId, input.officialVillageCode,
    input.parentId ?? null, input.level, input.codeLocal ?? null,
    input.name, input.description ?? null, input.latitude ?? null, input.longitude ?? null,
    createdBy,
  ).run();

  return {
    id, officialVillageCode: input.officialVillageCode,
    parentId: input.parentId, level: input.level,
    codeLocal: input.codeLocal, name: input.name,
    description: input.description,
    latitude: input.latitude, longitude: input.longitude,
    isActive: true,
  };
}
