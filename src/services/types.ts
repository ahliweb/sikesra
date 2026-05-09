// SIKESRA Shared Types
// Source: docs/sikesra/04_api_contracts.md

export interface PageMeta {
  page?: number;
  perPage: number;
  total?: number;
  nextCursor?: string;
  hasMore: boolean;
}

export interface OfficialRegionBreadcrumb {
  province?: { code: string; name: string };
  regency?: { code: string; name: string };
  district?: { code: string; name: string };
  village?: { code: string; name: string };
}

export interface LocalRegionBreadcrumb {
  items: Array<{
    id: string;
    level: "dusun" | "lingkungan" | "rw" | "rt" | "blok" | "zona" | "area_petugas";
    codeLocal?: string;
    name: string;
  }>;
}

export interface AuditHint {
  auditEventId?: string;
  audited: boolean;
  message?: string;
}
