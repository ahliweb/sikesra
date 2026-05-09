// SIKESRA Public Data Services
// Aggregate-safe public dashboard data (no admin API client usage)
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/06_security_rbac_abac.md

// ---------- Public Metadata ----------

export interface PublicMetadataResponse {
  enabled: boolean;
  title: string;
  description: string;
  latestUpdateAt?: string;
  dataScopeNote: string;
  officialContact?: string;
}

export async function getPublicMetadata(): Promise<PublicMetadataResponse> {
  // TODO: read from awcms_sikesra_settings where public_enabled = 1
  return {
    enabled: false,
    title: "SIKESRA",
    description: "Data agregat kesejahteraan rakyat",
    dataScopeNote: "Data ditampilkan dalam bentuk agregat yang telah diverifikasi.",
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

export async function getPublicFilters(): Promise<PublicFiltersResponse> {
  // TODO: query active verified records for distinct filter values
  // Only return aggregate-safe filter options that cannot isolate individuals
  return {
    districts: [],
    villages: [],
    objectTypes: [],
    years: [],
    statuses: [
      { code: "active", label: "Aktif" },
      { code: "verified", label: "Terverifikasi" },
    ],
  };
}

// ---------- Public Summary (Aggregate-safe with small-cell suppression) ----------

export interface AggregatePoint {
  key: string;
  label: string;
  total: number;
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

// Public data rules:
// - status_data = 'active'
// - status_verification = 'verified'
// - deleted_at IS NULL
// - sensitivity_level IN ('public_safe', 'internal')
// - aggregate cell count >= configured small_cell_threshold
// - No NIK/KIA/hashes, protected names, exact addresses, individual desil, disability details, documents, coordinates

export function applySmallCellSuppression<T extends { total: number }>(
  points: T[],
  threshold: number = DEFAULT_SMALL_CELL_THRESHOLD,
): { suppressed: T[]; suppressionCount: number } {
  let suppressionCount = 0;
  const suppressed = points.map((p) => {
    if (p.total > 0 && p.total < threshold) {
      suppressionCount++;
      return { ...p, total: 0 };
    }
    return p;
  });
  return { suppressed, suppressionCount };
}

export async function getPublicSummary(
  threshold: number = DEFAULT_SMALL_CELL_THRESHOLD,
): Promise<PublicSummaryResponse> {
  // TODO: query D1 for aggregate counts
  // Apply small-cell suppression before returning
  const byObjectType: AggregatePoint[] = [];
  const byRegion: AggregatePoint[] = [];
  const byVerificationStatus: AggregatePoint[] = [];
  const bySafeAttribute: AggregatePoint[] = [];

  const { suppressed: safeByType, suppressionCount } = applySmallCellSuppression(byObjectType, threshold);

  return {
    kpis: {
      totalEntities: 0,
      verifiedEntities: 0,
      activeVillages: 0,
    },
    charts: {
      byObjectType: safeByType,
      byRegion: applySmallCellSuppression(byRegion, threshold).suppressed,
      byVerificationStatus: applySmallCellSuppression(byVerificationStatus, threshold).suppressed,
      bySafeAttribute: applySmallCellSuppression(bySafeAttribute, threshold).suppressed,
    },
    suppression: {
      threshold,
      suppressedCells: suppressionCount,
    },
    caveat: PUBLIC_CAVEAT,
  };
}
