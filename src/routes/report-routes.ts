// SIKESRA Report and Export Route Handlers
// Report metadata and export job listing/creation
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { SIKESRA_PERMISSIONS } from "../security/permissions";

export interface ReportMeta {
  key: string;
  label: string;
  description: string;
  requiredPermission: string;
  fieldSensitivity: "public_safe" | "internal" | "restricted" | "highly_restricted";
  formats: string[];
  audience: string;
  reasonRequired: boolean;
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
    requiredPermission: SIKESRA_PERMISSIONS.EXPORT_CREATE,
    fieldSensitivity: "internal",
    formats: ["csv", "xlsx"],
    audience: "Pimpinan, admin, operator analitik",
    reasonRequired: false,
  },
  {
    key: "verification_status",
    label: "Status Verifikasi",
    description: "Daftar entitas dengan status verifikasi dan catatan verifikator.",
    requiredPermission: SIKESRA_PERMISSIONS.EXPORT_RESTRICTED,
    fieldSensitivity: "restricted",
    formats: ["csv", "xlsx"],
    audience: "Admin dan verifikator berwenang",
    reasonRequired: true,
  },
  {
    key: "entity_detail_restricted",
    label: "Data Detail (Terbatas)",
    description: "Data detail entitas dengan kolom sensitif. Memerlukan alasan akses.",
    requiredPermission: SIKESRA_PERMISSIONS.EXPORT_RESTRICTED,
    fieldSensitivity: "restricted",
    formats: ["xlsx"],
    audience: "Admin berwenang dan pimpinan tertentu",
    reasonRequired: true,
  },
  {
    key: "audit_evidence",
    label: "Bukti Audit",
    description: "Log audit untuk keperluan pemeriksaan. Nilai sensitif disamarkan.",
    requiredPermission: SIKESRA_PERMISSIONS.EXPORT_AUDIT,
    fieldSensitivity: "restricted",
    formats: ["csv"],
    audience: "Auditor dan super admin",
    reasonRequired: true,
  },
];

export function requiresReasonForReport(report: ReportMeta): boolean {
  return report.reasonRequired || report.fieldSensitivity === "restricted" || report.fieldSensitivity === "highly_restricted";
}

// GET /reports — available report metadata
export const reportListHandler = withHandlerSequence(
  async (_input: unknown, _db: D1Binding, ctx: SikesraRequestContext) => {
    return { reports: REPORT_CATALOG.filter((report) => ctx.permissions.includes(report.requiredPermission)) };
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

  const ctx = buildContextFromEmDash(routeCtx);
  const input: ExportCreateInput = routeCtx.input ?? { reportKey: "" };
  const reportMeta = REPORT_CATALOG.find((r) => r.key === input.reportKey);
  if (!reportMeta) throw new Error("INVALID_REPORT_KEY");
  if (!ctx.permissions.includes(reportMeta.requiredPermission)) throw new Error("EXPORT_PERMISSION_DENIED");
  if (!reportMeta.formats.includes(input.format ?? "csv")) throw new Error("INVALID_EXPORT_FORMAT");
  if (requiresReasonForReport(reportMeta) && !(input.reason ?? "").trim()) throw new Error("EXPORT_REASON_REQUIRED");

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
