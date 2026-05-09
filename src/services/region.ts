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
