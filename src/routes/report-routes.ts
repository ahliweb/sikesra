// SIKESRA Report and Export Route Handlers
// Report metadata and export job listing/creation/generation/download
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, withHandlerSequence, withRateLimitRequest, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { getReports, createExportJob, getExportJob, generateExportFile, downloadExportFile, type ExportCreateInput } from "../services/export";
import { getRouteDb } from "./route-db";

interface R2Bucket {
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream | ArrayBuffer } | null>;
}

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

export interface ExportCreateInputRoute {
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
    const reports = await getReports();
    return { 
      reports: reports.filter((report) => ctx.permissions.includes(report.requiredPermission)) 
    };
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

// GET /exports/:id — export job detail
export const exportDetailHandler = withHandlerSequence(
  async (input: { request: Request }, db: D1Binding, ctx: SikesraRequestContext) => {
    const url = new URL(input.request.url);
    const parts = url.pathname.split("/");
    const jobId = parts[parts.indexOf("exports") + 1];
    
    const job = await getExportJob(db, jobId, ctx);
    if (!job) throw new Error("EXPORT_JOB_NOT_FOUND");
    
    return { job };
  }
);

// POST /exports — create export job
export const exportCreateHandler = async (routeCtx: EmDashRouteContext<ExportCreateInputRoute>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const input: ExportCreateInputRoute = routeCtx.input ?? { reportKey: "" };
  
  const reportMeta = REPORT_CATALOG.find((r) => r.key === input.reportKey);
  if (!reportMeta) throw new Error("INVALID_REPORT_KEY");
  if (!ctx.permissions.includes(reportMeta.requiredPermission)) throw new Error("EXPORT_PERMISSION_DENIED");
  if (!reportMeta.formats.includes(input.format ?? "csv")) throw new Error("INVALID_EXPORT_FORMAT");
  if (requiresReasonForReport(reportMeta) && !(input.reason ?? "").trim()) throw new Error("EXPORT_REASON_REQUIRED");

  return createExportJob(
    db,
    {
      reportType: input.reportKey,
      format: input.format ?? "csv",
      reason: input.reason,
      filters: input.filters,
    },
    ctx,
  );
};

// POST /exports/:id/generate — trigger export file generation
// Rate limited: max 10 exports per hour per user
export const exportGenerateHandler = withRateLimitRequest(
  async (routeCtx: EmDashRouteContext, db: D1Binding, ctx: SikesraRequestContext) => {
    const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
    
    if (!db) throw new Error("DB_UNAVAILABLE");
    if (!r2) throw new Error("R2_STORAGE_UNAVAILABLE");

    const url = new URL(routeCtx.request.url);
    const parts = url.pathname.split("/");
    const jobId = parts[parts.indexOf("exports") + 1];

    const result = await generateExportFile(db, r2, jobId, ctx);
    return { jobId, status: "ready", ...result };
  },
  "export_generate"
);

// GET /exports/:id/download — download export file
export const exportDownloadHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
  
  if (!db) throw new Error("DB_UNAVAILABLE");
  if (!r2) throw new Error("R2_STORAGE_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const jobId = parts[parts.indexOf("exports") + 1];

  const result = await downloadExportFile(db, r2, jobId, ctx);
  
  return new Response(result.content, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
    },
  });
};
