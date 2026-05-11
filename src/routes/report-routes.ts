// SIKESRA Report and Export Route Handlers
// Report metadata and export job listing/creation
// Source: docs/sikesra/04_api_contracts.md

import { withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";

export interface ReportMeta {
  key: string;
  label: string;
  description: string;
  requiredPermission: string;
  fieldSensitivity: "public_safe" | "internal" | "restricted" | "highly_restricted";
  formats: string[];
}

export interface ExportJobSummary {
  id: string;
  reportKey: string;
  status: string;
  rowCount: number;
  format: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCreateInput {
  reportKey: string;
  format?: "csv" | "xlsx";
  reason?: string;
  filters?: Record<string, unknown>;
}

// Static report catalog — field sensitivity drives permission requirements
export const REPORT_CATALOG: ReportMeta[] = [
  {
    key: "entity_summary",
    label: "Ringkasan Entitas",
    description: "Rekapitulasi jumlah entitas per jenis, subjenis, dan wilayah.",
    requiredPermission: "awcms:sikesra:export:create",
    fieldSensitivity: "internal",
    formats: ["csv", "xlsx"],
  },
  {
    key: "verification_status",
    label: "Status Verifikasi",
    description: "Daftar entitas dengan status verifikasi dan catatan verifikator.",
    requiredPermission: "awcms:sikesra:export:create",
    fieldSensitivity: "restricted",
    formats: ["csv", "xlsx"],
  },
  {
    key: "entity_detail_restricted",
    label: "Data Detail (Terbatas)",
    description: "Data detail entitas dengan kolom sensitif. Memerlukan alasan akses.",
    requiredPermission: "awcms:sikesra:export:restricted",
    fieldSensitivity: "restricted",
    formats: ["xlsx"],
  },
  {
    key: "audit_evidence",
    label: "Bukti Audit",
    description: "Log audit untuk keperluan pemeriksaan. Nilai sensitif disamarkan.",
    requiredPermission: "awcms:sikesra:export:audit",
    fieldSensitivity: "restricted",
    formats: ["csv"],
  },
];

// GET /reports — available report metadata
export const reportListHandler = withHandlerSequence(
  async (_input: unknown, _db: D1Binding, _ctx: SikesraRequestContext) => {
    return { reports: REPORT_CATALOG };
  }
);

// GET /exports — export job list for current tenant/site
export const exportListHandler = withHandlerSequence(
  async (_input: unknown, db: D1Binding, ctx: SikesraRequestContext) => {
    const rows = await db
      .prepare(
        `SELECT id, report_type, status, total_rows, format, created_at, updated_at
         FROM awcms_sikesra_export_jobs
         WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 20`
      )
      .bind(ctx.tenantId, ctx.siteId)
      .all<Record<string, unknown>>();

    const items: ExportJobSummary[] = rows.results.map((r) => ({
      id: String(r.id),
      reportKey: String(r.report_type ?? ""),
      status: String(r.status ?? "pending"),
      rowCount: Number(r.total_rows ?? 0),
      format: String(r.format ?? "csv"),
      createdAt: String(r.created_at ?? ""),
      updatedAt: String(r.updated_at ?? ""),
    }));

    return { items };
  }
);

// POST /exports — create export job
export const exportCreateHandler = async (routeCtx: EmDashRouteContext<ExportCreateInput>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const input = routeCtx.input ?? {};
  const reportMeta = REPORT_CATALOG.find((r) => r.key === input.reportKey);
  if (!reportMeta) throw new Error("INVALID_REPORT_KEY");

  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tenantId = routeCtx.site?.tenantId ?? "default";
  const siteId = routeCtx.site?.id ?? "default";

  await db
    .prepare(
       `INSERT INTO awcms_sikesra_export_jobs
        (id, tenant_id, site_id, report_type, format, status, reason, filters_json, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
     )
    .bind(
      id,
      tenantId,
      siteId,
      input.reportKey,
      input.format ?? "csv",
      input.reason ?? null,
      input.filters ? JSON.stringify(input.filters) : null,
      "api-user",
      "api-user",
    )
    .run();

  return { id, reportKey: input.reportKey, status: "pending", format: input.format ?? "csv" };
};
