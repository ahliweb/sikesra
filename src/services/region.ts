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

export interface OfficialRegionCreateInput {
  code: string;
  name: string;
  level: OfficialRegionLevel;
  parentCode?: string;
  kemendagriVersion?: string;
}

export interface OfficialRegionUpdateInput {
  name?: string;
  parentCode?: string;
  kemendagriVersion?: string;
  isActive?: boolean;
}

const OFFICIAL_REGIONS_TABLE = "awcms_sikesra_official_regions";
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

export async function createOfficialRegion(
  db: D1Binding,
  input: OfficialRegionCreateInput,
  ctx: SikesraRequestContext,
): Promise<OfficialRegion> {
  const existing = await db.prepare(
    `SELECT code FROM ${OFFICIAL_REGIONS_TABLE} WHERE code = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(input.code, ctx.tenantId, ctx.siteId).first();

  if (existing) throw new Error("OFFICIAL_REGION_EXISTS");

  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO ${OFFICIAL_REGIONS_TABLE}
     (code, tenant_id, site_id, name, level, parent_code, kemendagri_version, is_active, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(
    input.code,
    ctx.tenantId,
    ctx.siteId,
    input.name,
    input.level,
    input.parentCode ?? null,
    input.kemendagriVersion ?? null,
    ctx.userId,
    ctx.userId,
    now,
    now,
  ).run();

  return {
    code: input.code,
    name: input.name,
    level: input.level,
    parentCode: input.parentCode,
    kemendagriVersion: input.kemendagriVersion,
    isActive: true,
  };
}

export async function updateOfficialRegion(
  db: D1Binding,
  code: string,
  input: OfficialRegionUpdateInput,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await db.prepare(
    `SELECT code FROM ${OFFICIAL_REGIONS_TABLE} WHERE code = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(code, ctx.tenantId, ctx.siteId).first();

  if (!existing) throw new Error("OFFICIAL_REGION_NOT_FOUND");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.parentCode !== undefined) {
    updates.push("parent_code = ?");
    params.push(input.parentCode ?? null);
  }
  if (input.kemendagriVersion !== undefined) {
    updates.push("kemendagri_version = ?");
    params.push(input.kemendagriVersion ?? null);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push("updated_by = ?", "updated_at = ?");
  params.push(ctx.userId, now);

  await db.prepare(
    `UPDATE ${OFFICIAL_REGIONS_TABLE} SET ${updates.join(", ")} WHERE code = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(...params, code, ctx.tenantId, ctx.siteId).run();
}

export async function deleteOfficialRegion(
  db: D1Binding,
  code: string,
  ctx: SikesraRequestContext,
): Promise<{ hasLocalRegions: boolean; localRegionCount: number; hasEntities: boolean; entityCount: number }> {
  const localCheck = await db.prepare(
    `SELECT COUNT(*) as cnt FROM ${LOCAL_REGIONS_TABLE} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND official_village_code = ?`
  ).bind(ctx.tenantId, ctx.siteId, code).first<{ cnt: number }>();

  const localCount = localCheck?.cnt ?? 0;

  const entityCheck = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND official_village_code = ?`
  ).bind(ctx.tenantId, ctx.siteId, code).first<{ cnt: number }>();

  const entityCount = entityCheck?.cnt ?? 0;

  await db.prepare(
    `UPDATE ${OFFICIAL_REGIONS_TABLE} SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE code = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, code, ctx.tenantId, ctx.siteId).run();

  return { hasLocalRegions: localCount > 0, localRegionCount: localCount, hasEntities: entityCount > 0, entityCount };
}

export async function getOfficialRegionByCode(
  db: D1Binding,
  code: string,
  ctx: SikesraRequestContext,
): Promise<OfficialRegion | null> {
  const row = await db.prepare(
    `SELECT code, name, level, parent_code, kemendagri_version, is_active
     FROM ${OFFICIAL_REGIONS_TABLE}
     WHERE code = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(code, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    code: String(row.code),
    name: String(row.name),
    level: String(row.level) as OfficialRegionLevel,
    parentCode: row.parent_code ? String(row.parent_code) : undefined,
    kemendagriVersion: row.kemendagri_version ? String(row.kemendagri_version) : undefined,
    isActive: Boolean(row.is_active),
  };
}
