// SIKESRA Public Data Services
// Aggregate-safe public dashboard data (no admin API client usage)
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/06_security_rbac_abac.md

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";

// ---------- Public Metadata ----------

export interface PublicMetadataResponse {
  enabled: boolean;
  title: string;
  description: string;
  latestUpdateAt?: string;
  dataScopeNote: string;
  officialContact?: string;
}

export interface PublicSummaryFilters {
  districtCode?: string;
  villageCode?: string;
  objectTypeCode?: string;
  year?: number;
  status?: string;
}

interface PublicSettingsRow {
  public_enabled: number;
  public_title?: string | null;
  public_description?: string | null;
  data_scope_note?: string | null;
  official_contact?: string | null;
  small_cell_threshold?: number | null;
}

async function resolvePublicScope(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<SikesraRequestContext> {
  const currentSettings = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM awcms_sikesra_settings WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(ctx.tenantId, ctx.siteId).first<{ cnt: number }>();

  if ((currentSettings?.cnt ?? 0) > 0) {
    return ctx;
  }

  const defaultSettings = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM awcms_sikesra_settings WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL`,
  ).first<{ cnt: number }>();

  if ((defaultSettings?.cnt ?? 0) > 0) {
    return {
      ...ctx,
      tenantId: "default",
      siteId: "default",
    };
  }

  return ctx;
}

function basePublicWhere(ctx: SikesraRequestContext): { clauses: string[]; params: unknown[] } {
  return {
    clauses: [
      "tenant_id = ?",
      "site_id = ?",
      "deleted_at IS NULL",
      "status_data = 'active'",
      "status_verification = 'verified'",
      "sensitivity_level IN ('public_safe', 'internal')",
    ],
    params: [ctx.tenantId, ctx.siteId],
  };
}

function withPublicFilters(
  ctx: SikesraRequestContext,
  filters?: PublicSummaryFilters,
): { whereSql: string; params: unknown[] } {
  const { clauses, params } = basePublicWhere(ctx);

  if (filters?.districtCode) {
    clauses.push("official_village_code LIKE ?");
    params.push(`${filters.districtCode}%`);
  }
  if (filters?.villageCode) {
    clauses.push("official_village_code = ?");
    params.push(filters.villageCode);
  }
  if (filters?.objectTypeCode) {
    clauses.push("object_type_code = ?");
    params.push(filters.objectTypeCode);
  }
  if (typeof filters?.year === "number" && Number.isFinite(filters.year)) {
    clauses.push("substr(COALESCE(verified_at, updated_at, created_at), 1, 4) = ?");
    params.push(String(filters.year));
  }
  if (filters?.status === "active") {
    clauses.push("status_data = 'active'");
  }
  if (filters?.status === "verified") {
    clauses.push("status_verification = 'verified'");
  }

  return { whereSql: clauses.join(" AND "), params };
}

async function getPublicSettings(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<PublicSettingsRow | null> {
  return db.prepare(
    `SELECT public_enabled, public_title, public_description, data_scope_note, official_contact, small_cell_threshold
     FROM awcms_sikesra_settings
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     LIMIT 1`,
  ).bind(ctx.tenantId, ctx.siteId).first<PublicSettingsRow>();
}

async function getLatestPublicUpdate(db: D1Binding, ctx: SikesraRequestContext): Promise<string | undefined> {
  const { whereSql, params } = withPublicFilters(ctx);
  const row = await db.prepare(
    `SELECT MAX(COALESCE(verified_at, updated_at, created_at)) AS latest_update_at
     FROM awcms_sikesra_entities
     WHERE ${whereSql}`,
  ).bind(...params).first<{ latest_update_at?: string | null }>();

  return row?.latest_update_at ?? undefined;
}

async function getScopedPublicEntityCount(
  db: D1Binding,
  ctx: SikesraRequestContext,
  filters?: PublicSummaryFilters,
): Promise<number> {
  const { whereSql, params } = withPublicFilters(ctx, filters);
  const row = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM awcms_sikesra_entities WHERE ${whereSql}`,
  ).bind(...params).first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function getPublicMetadata(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<PublicMetadataResponse> {
  const scope = await resolvePublicScope(db, ctx);
  const [settings, latestUpdateAt] = await Promise.all([
    getPublicSettings(db, scope),
    getLatestPublicUpdate(db, scope),
  ]);

  return {
    enabled: (settings?.public_enabled ?? 0) === 1,
    title: settings?.public_title ?? "SIKESRA",
    description: settings?.public_description ?? "Data agregat kesejahteraan rakyat yang telah diverifikasi.",
    latestUpdateAt,
    dataScopeNote: settings?.data_scope_note ?? "Data ditampilkan dalam bentuk agregat yang telah diverifikasi.",
    officialContact: settings?.official_contact ?? undefined,
  };
}

// ---------- Public Filters ----------

export type PublicRegionFilter = { code: string; name: string };
export type PublicTypeFilter = { code: string; name: string };
export type PublicStatusFilter = { code: string; label: string };

export interface PublicFiltersResponse {
  districts: PublicRegionFilter[];
  villages: Array<{ code: string; name: string; districtCode: string }>;
  objectTypes: PublicTypeFilter[];
  years: number[];
  statuses: PublicStatusFilter[];
}

async function getThreshold(db: D1Binding, ctx: SikesraRequestContext): Promise<number> {
  const settings = await getPublicSettings(db, ctx);
  return settings?.small_cell_threshold ?? DEFAULT_SMALL_CELL_THRESHOLD;
}

export async function getPublicFilters(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<PublicFiltersResponse> {
  const scope = await resolvePublicScope(db, ctx);
  const totalEntities = await getScopedPublicEntityCount(db, scope);
  if (totalEntities === 0) {
    return {
      districts: [],
      villages: [],
      objectTypes: [],
      years: [],
      statuses: [
        { code: "verified", label: "Terverifikasi" },
        { code: "active", label: "Aktif" },
      ],
    };
  }
  const threshold = await getThreshold(db, scope);
  const { whereSql, params } = withPublicFilters(scope);

  const [districts, villages, objectTypes, years] = await Promise.all([
    db.prepare(
      `SELECT r.code, r.name, COUNT(*) AS total
       FROM awcms_sikesra_entities e
       JOIN awcms_sikesra_official_regions r
         ON r.tenant_id = e.tenant_id
        AND r.site_id = e.site_id
        AND r.code = substr(e.official_village_code, 1, 6)
        AND r.level = 'district'
       WHERE ${whereSql}
       GROUP BY r.code, r.name
       HAVING COUNT(*) >= ?
       ORDER BY r.name`,
    ).bind(...params, threshold).all<{ code: string; name: string }>(),
    db.prepare(
      `SELECT r.code, r.name, substr(r.code, 1, 6) AS districtCode, COUNT(*) AS total
       FROM awcms_sikesra_entities e
       JOIN awcms_sikesra_official_regions r
         ON r.tenant_id = e.tenant_id
        AND r.site_id = e.site_id
        AND r.code = e.official_village_code
        AND r.level = 'village'
       WHERE ${whereSql}
       GROUP BY r.code, r.name
       HAVING COUNT(*) >= ?
       ORDER BY r.name`,
    ).bind(...params, threshold).all<{ code: string; name: string; districtCode: string }>(),
    db.prepare(
      `SELECT t.code, t.name, COUNT(*) AS total
       FROM awcms_sikesra_entities e
       JOIN awcms_sikesra_object_types t
         ON t.tenant_id = e.tenant_id
        AND t.site_id = e.site_id
        AND t.code = e.object_type_code
       WHERE ${whereSql}
       GROUP BY t.code, t.name
       HAVING COUNT(*) >= ?
       ORDER BY t.sort_order, t.name`,
    ).bind(...params, threshold).all<{ code: string; name: string }>(),
    db.prepare(
      `SELECT substr(COALESCE(verified_at, updated_at, created_at), 1, 4) AS year, COUNT(*) AS total
       FROM awcms_sikesra_entities
       WHERE ${whereSql}
       GROUP BY substr(COALESCE(verified_at, updated_at, created_at), 1, 4)
       HAVING COUNT(*) >= ?
       ORDER BY year DESC`,
    ).bind(...params, threshold).all<{ year: string }>(),
  ]);

  return {
    districts: districts.results,
    villages: villages.results,
    objectTypes: objectTypes.results,
    years: years.results.map((row) => Number(row.year)).filter((value) => Number.isFinite(value)),
    statuses: [
      { code: "verified", label: "Terverifikasi" },
      { code: "active", label: "Aktif" },
    ],
  };
}

// ---------- Public Summary (Aggregate-safe with small-cell suppression) ----------

export interface AggregatePoint {
  key: string;
  label: string;
  total: number;
  suppressed?: boolean;
  metadata?: Record<string, string | number>;
}

export interface PublicSummaryResponse {
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
}

const PUBLIC_CAVEAT =
  "Data pada halaman ini merupakan rekapitulasi agregat yang telah melalui proses verifikasi sesuai kewenangan. Data pribadi, data anak, data disabilitas, data desil individu, dokumen pendukung, dan alamat detail tidak ditampilkan untuk menjaga perlindungan data pribadi dan keamanan informasi.";

const SUPPRESSED_CELL_MESSAGE =
  "Sebagian data tidak ditampilkan secara rinci karena jumlah data terlalu kecil atau berpotensi membuka identitas individu/kelompok rentan.";

const DEFAULT_SMALL_CELL_THRESHOLD = 5;

export function applySmallCellSuppression<T extends { total: number }>(
  points: T[],
  threshold: number = DEFAULT_SMALL_CELL_THRESHOLD,
): { suppressed: Array<T & { suppressed?: boolean }>; suppressionCount: number } {
  let suppressionCount = 0;
  const suppressed = points.map((p) => {
    if (p.total > 0 && p.total < threshold) {
      suppressionCount++;
      return { ...p, total: 0, suppressed: true };
    }
    return { ...p };
  });
  return { suppressed, suppressionCount };
}

function distinctSuppressionCount(groups: Array<{ suppressionCount: number }>): number {
  return groups.reduce((sum, group) => sum + group.suppressionCount, 0);
}

export async function getPublicSummary(
  db: D1Binding,
  ctx: SikesraRequestContext,
  filters?: PublicSummaryFilters,
): Promise<PublicSummaryResponse> {
  const scope = await resolvePublicScope(db, ctx);
  const totalEntities = await getScopedPublicEntityCount(db, scope, filters);
  if (totalEntities === 0) {
    const threshold = await getThreshold(db, scope);
    return {
      kpis: {
        totalEntities: 0,
        verifiedEntities: 0,
        activeVillages: 0,
      },
      charts: {
        byObjectType: [],
        byRegion: [],
        byVerificationStatus: [],
        bySafeAttribute: [],
      },
      suppression: {
        threshold,
        suppressedCells: 0,
      },
      caveat: PUBLIC_CAVEAT,
    };
  }
  const threshold = await getThreshold(db, scope);
  const { whereSql, params } = withPublicFilters(scope, filters);

  const [kpis, byObjectTypeRows, byRegionRows, byVerificationRows, bySafeAttributeRows] = await Promise.all([
    db.prepare(
      `SELECT
         COUNT(*) AS total_entities,
         COUNT(*) AS verified_entities,
         COUNT(DISTINCT official_village_code) AS active_villages,
         MAX(COALESCE(verified_at, updated_at, created_at)) AS latest_update_at
       FROM awcms_sikesra_entities
       WHERE ${whereSql}`,
    ).bind(...params).first<{
      total_entities: number;
      verified_entities: number;
      active_villages: number;
      latest_update_at?: string | null;
    }>(),
    db.prepare(
      `SELECT
         e.object_type_code AS key,
         COALESCE(t.name, e.object_type_code) || ' / ' || COALESCE(s.name, e.object_subtype_code) AS label,
         COUNT(*) AS total
       FROM awcms_sikesra_entities e
       LEFT JOIN awcms_sikesra_object_types t
         ON t.tenant_id = e.tenant_id
        AND t.site_id = e.site_id
        AND t.code = e.object_type_code
       LEFT JOIN awcms_sikesra_object_subtypes s
         ON s.tenant_id = e.tenant_id
        AND s.site_id = e.site_id
        AND s.type_code = e.object_type_code
        AND (s.code = e.object_subtype_code OR s.id = e.object_subtype_code)
       WHERE ${whereSql}
       GROUP BY e.object_type_code, e.object_subtype_code, t.name, s.name
       ORDER BY total DESC, label ASC`,
    ).bind(...params).all<AggregatePoint>(),
    db.prepare(
      `SELECT
         CASE WHEN ? IS NOT NULL THEN village.code ELSE district.code END AS key,
         CASE WHEN ? IS NOT NULL THEN village.name ELSE district.name END AS label,
         COUNT(*) AS total
       FROM awcms_sikesra_entities e
       LEFT JOIN awcms_sikesra_official_regions district
         ON district.tenant_id = e.tenant_id
        AND district.site_id = e.site_id
        AND district.code = substr(e.official_village_code, 1, 6)
        AND district.level = 'district'
       LEFT JOIN awcms_sikesra_official_regions village
         ON village.tenant_id = e.tenant_id
        AND village.site_id = e.site_id
        AND village.code = e.official_village_code
        AND village.level = 'village'
       WHERE ${whereSql}
       GROUP BY CASE WHEN ? IS NOT NULL THEN village.code ELSE district.code END,
                CASE WHEN ? IS NOT NULL THEN village.name ELSE district.name END
       ORDER BY total DESC, label ASC`,
    ).bind(filters?.districtCode ?? null, filters?.districtCode ?? null, ...params, filters?.districtCode ?? null, filters?.districtCode ?? null).all<AggregatePoint>(),
    db.prepare(
      `SELECT status_verification AS key, 'Terverifikasi' AS label, COUNT(*) AS total
       FROM awcms_sikesra_entities
       WHERE ${whereSql}
       GROUP BY status_verification
       ORDER BY total DESC`,
    ).bind(...params).all<AggregatePoint>(),
    db.prepare(
      `SELECT key, label, total FROM (
         SELECT 'religion:' || religion_attribute AS key, 'Agama: ' || religion_attribute AS label, COUNT(*) AS total
         FROM awcms_sikesra_entities
         WHERE ${whereSql} AND religion_attribute IS NOT NULL AND religion_attribute != ''
         GROUP BY religion_attribute
         UNION ALL
         SELECT 'neglected:' || neglected_attribute AS key, 'Status Keterlantaran: ' || neglected_attribute AS label, COUNT(*) AS total
         FROM awcms_sikesra_entities
         WHERE ${whereSql} AND neglected_attribute IS NOT NULL AND neglected_attribute != ''
         GROUP BY neglected_attribute
         UNION ALL
         SELECT 'desil:' || desil_attribute AS key, 'Desil: ' || desil_attribute AS label, COUNT(*) AS total
         FROM awcms_sikesra_entities
         WHERE ${whereSql} AND desil_attribute IS NOT NULL AND desil_attribute != ''
         GROUP BY desil_attribute
       )
       ORDER BY total DESC, label ASC`,
    ).bind(...params, ...params, ...params).all<AggregatePoint>(),
  ]);

  const suppressedTypes = applySmallCellSuppression(byObjectTypeRows.results, threshold);
  const suppressedRegions = applySmallCellSuppression(byRegionRows.results, threshold);
  const suppressedVerification = applySmallCellSuppression(byVerificationRows.results, threshold);
  const suppressedSafeAttributes = applySmallCellSuppression(bySafeAttributeRows.results, threshold);
  const suppressionCount = distinctSuppressionCount([
    suppressedTypes,
    suppressedRegions,
    suppressedVerification,
    suppressedSafeAttributes,
  ]);

  return {
    kpis: {
      totalEntities: kpis?.total_entities ?? 0,
      verifiedEntities: kpis?.verified_entities ?? 0,
      activeVillages: kpis?.active_villages ?? 0,
      latestUpdateAt: kpis?.latest_update_at ?? undefined,
    },
    charts: {
      byObjectType: suppressedTypes.suppressed,
      byRegion: suppressedRegions.suppressed,
      byVerificationStatus: suppressedVerification.suppressed,
      bySafeAttribute: suppressedSafeAttributes.suppressed,
    },
    suppression: {
      threshold,
      suppressedCells: suppressionCount,
    },
    caveat: suppressionCount > 0 ? `${PUBLIC_CAVEAT} ${SUPPRESSED_CELL_MESSAGE}` : PUBLIC_CAVEAT,
  };
}
