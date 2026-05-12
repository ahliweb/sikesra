// SIKESRA Region Service
// Official and local region lookup/management
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";

export type OfficialRegionLevel = "province" | "regency" | "district" | "village";
export type LocalRegionLevel = "dusun" | "lingkungan" | "rw" | "rt" | "blok" | "zona" | "area_petugas";

export interface OfficialRegion {
  code: string;
  name: string;
  level: OfficialRegionLevel;
  parentCode?: string;
  kemendagriVersion?: string;
  isActive: boolean;
}

export interface LocalRegion {
  id: string;
  officialVillageCode: string;
  parentId?: string;
  level: LocalRegionLevel;
  codeLocal?: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface LocalRegionCreateInput {
  officialVillageCode: string;
  parentId?: string;
  level: LocalRegionLevel;
  codeLocal?: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

// ---------- Service Stubs ----------

import type { D1Binding } from "../repositories/db";
import { getOfficialRegionsRepo, getLocalRegionsRepo, createLocalRegionRepo } from "../repositories/region-repository";

export async function getOfficialRegions(
  db: D1Binding,
  ctx: SikesraRequestContext,
  parentCode?: string,
  level?: OfficialRegionLevel,
): Promise<OfficialRegion[]> {
  return getOfficialRegionsRepo(db, ctx, parentCode, level);
}

export async function getLocalRegions(
  db: D1Binding,
  ctx: SikesraRequestContext,
  villageCode?: string,
): Promise<LocalRegion[]> {
  return getLocalRegionsRepo(db, ctx, villageCode);
}

export async function createLocalRegion(
  db: D1Binding,
  input: LocalRegionCreateInput,
  ctx: SikesraRequestContext,
): Promise<LocalRegion> {
  const id = `lreg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return createLocalRegionRepo(db, id, input, ctx.userId, ctx);
}

export interface LocalRegionUpdateInput {
  parentId?: string;
  level?: LocalRegionLevel;
  codeLocal?: string;
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

const LOCAL_REGIONS_TABLE = "awcms_sikesra_local_regions";

export async function updateLocalRegion(
  db: D1Binding,
  regionId: string,
  input: LocalRegionUpdateInput,
  ctx: SikesraRequestContext,
): Promise<void> {
  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.parentId !== undefined) {
    updates.push("parent_id = ?");
    params.push(input.parentId || null);
  }
  if (input.level !== undefined) {
    updates.push("level = ?");
    params.push(input.level);
  }
  if (input.codeLocal !== undefined) {
    updates.push("code_local = ?");
    params.push(input.codeLocal || null);
  }
  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description || null);
  }
  if (input.latitude !== undefined) {
    updates.push("latitude = ?");
    params.push(input.latitude);
  }
  if (input.longitude !== undefined) {
    updates.push("longitude = ?");
    params.push(input.longitude);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push("updated_by = ?", "updated_at = ?");
  params.push(ctx.userId, now);

  await db.prepare(
    `UPDATE ${LOCAL_REGIONS_TABLE} SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(...params, regionId, ctx.tenantId, ctx.siteId).run();
}

export async function deleteLocalRegion(
  db: D1Binding,
  regionId: string,
  ctx: SikesraRequestContext,
): Promise<{ hasEntities: boolean; entityCount: number }> {
  const entityCheck = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND official_village_code IN (SELECT official_village_code FROM ${LOCAL_REGIONS_TABLE} WHERE id = ?)`
  ).bind(ctx.tenantId, ctx.siteId, regionId).first<{ cnt: number }>();

  const entityCount = entityCheck?.cnt ?? 0;

  await db.prepare(
    `UPDATE ${LOCAL_REGIONS_TABLE} SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, regionId, ctx.tenantId, ctx.siteId).run();

  return { hasEntities: entityCount > 0, entityCount };
}
