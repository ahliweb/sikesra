// SIKESRA Export Service
// CSV/XLSX export jobs, field sensitivity, restricted export controls
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

export type ExportFormat = "csv" | "xlsx";
export type ExportJobStatus = "pending" | "generating" | "ready" | "failed" | "expired";

export interface ExportJob {
  id: string;
  reportType: string;
  filters: Record<string, unknown>;
  fields: string[];
  fieldSensitivity: Record<string, string>;
  format: ExportFormat;
  reason?: string;
  totalRows?: number;
  status: ExportJobStatus;
  createdAt: string;
  r2Key?: string;
  downloadedAt?: string;
}

export interface ExportCreateInput {
  reportType: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  format?: ExportFormat;
  reason?: string;
}

export interface ExportJobSummary {
  id: string;
  reportType: string;
  status: ExportJobStatus;
  totalRows?: number;
  format: ExportFormat;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportMetadata {
  id: string;
  name: string;
  description: string;
  availableFields: Array<{ key: string; label: string; sensitivity: string }>;
  requiredPermission: string;
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream | ArrayBuffer } | null>;
}

export async function getReports(): Promise<ReportMetadata[]> {
  return [
    {
      id: "entity_summary",
      name: "Ringkasan Entitas",
      description: "Rekapitulasi jumlah entitas per jenis, subjenis, dan wilayah.",
      availableFields: [
        { key: "total_entities", label: "Total entitas", sensitivity: "internal" },
        { key: "verified_entities", label: "Total terverifikasi", sensitivity: "internal" },
        { key: "by_object_type", label: "Rekap jenis/subjenis", sensitivity: "internal" },
        { key: "by_region", label: "Rekap wilayah", sensitivity: "internal" },
      ],
      requiredPermission: "awcms:sikesra:export:create",
    },
    {
      id: "verification_status",
      name: "Status Verifikasi",
      description: "Daftar entitas dengan status verifikasi dan catatan verifikator.",
      availableFields: [
        { key: "sikesra_id20", label: "ID SIKESRA", sensitivity: "internal" },
        { key: "display_name_masked", label: "Nama tampil termasking", sensitivity: "restricted" },
        { key: "official_region", label: "Wilayah resmi", sensitivity: "internal" },
        { key: "verification_status", label: "Status verifikasi", sensitivity: "internal" },
        { key: "verifier_note_excerpt", label: "Ringkas catatan verifikator", sensitivity: "restricted" },
      ],
      requiredPermission: "awcms:sikesra:export:restricted",
    },
    {
      id: "entity_detail_restricted",
      name: "Data Detail (Terbatas)",
      description: "Data detail entitas dengan kolom sensitif. Memerlukan alasan akses.",
      availableFields: [
        { key: "sikesra_id20", label: "ID SIKESRA", sensitivity: "internal" },
        { key: "display_name_masked", label: "Nama tampil termasking", sensitivity: "restricted" },
        { key: "address_masked", label: "Alamat termasking", sensitivity: "restricted" },
        { key: "sensitivity_level", label: "Label sensitivitas", sensitivity: "internal" },
        { key: "document_completeness", label: "Kelengkapan dokumen", sensitivity: "internal" },
      ],
      requiredPermission: "awcms:sikesra:export:restricted",
    },
    {
      id: "audit_evidence",
      name: "Bukti Audit",
      description: "Log audit untuk keperluan pemeriksaan. Nilai sensitif disamarkan.",
      availableFields: [
        { key: "request_id", label: "Request ID", sensitivity: "internal" },
        { key: "actor_id", label: "Aktor", sensitivity: "restricted" },
        { key: "action", label: "Aksi", sensitivity: "internal" },
        { key: "resource", label: "Resource", sensitivity: "internal" },
        { key: "reason_redacted", label: "Alasan teredaksi", sensitivity: "restricted" },
      ],
      requiredPermission: "awcms:sikesra:audit:read",
    },
  ];
}

export async function createExportJob(
  db: D1Binding,
  input: ExportCreateInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string; status: ExportJobStatus }> {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO awcms_sikesra_export_jobs
     (id, tenant_id, site_id, report_type, format, status, reason, filters_json, fields_json, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ctx.tenantId,
    ctx.siteId,
    input.reportType,
    input.format ?? "csv",
    input.reason ?? null,
    input.filters ? JSON.stringify(input.filters) : null,
    input.fields ? JSON.stringify(input.fields) : null,
    ctx.userId,
    ctx.userId,
    now,
    now,
  ).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: input.reason ? AUDIT_ACTIONS.EXPORT_RESTRICTED_CREATE : AUDIT_ACTIONS.EXPORT_CREATE,
      resourceType: "export_job",
      resourceId: id,
      requestId: ctx.requestId,
      success: true,
      reason: input.reason ?? `create export for ${input.reportType}`,
      after: {
        id,
        reportType: input.reportType,
        format: input.format ?? "csv",
        status: "pending",
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { id, status: "pending" };
}

export async function getExportJob(
  db: D1Binding,
  jobId: string,
  ctx: SikesraRequestContext,
): Promise<ExportJobSummary | null> {
  const row = await db.prepare(
    `SELECT id, report_type, status, total_rows, format, reason, created_at, updated_at
     FROM awcms_sikesra_export_jobs
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(jobId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    id: row.id as string,
    reportType: row.report_type as string,
    status: row.status as ExportJobStatus,
    totalRows: row.total_rows ? Number(row.total_rows) : undefined,
    format: row.format as ExportFormat,
    reason: row.reason as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function generateExportFile(
  db: D1Binding,
  r2: R2Bucket,
  jobId: string,
  ctx: SikesraRequestContext,
): Promise<{ r2Key: string; totalRows: number }> {
  const job = await getExportJob(db, jobId, ctx);
  if (!job) throw new Error("EXPORT_JOB_NOT_FOUND");
  if (job.status !== "pending") throw new Error("EXPORT_JOB_NOT_PENDING");

  await db.prepare(
    `UPDATE awcms_sikesra_export_jobs SET status = 'generating', updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, jobId, ctx.tenantId, ctx.siteId).run();

  try {
    let content: string;
    let contentType: string;
    let totalRows = 0;

    if (job.reportType === "entity_summary") {
      const rows = await db.prepare(
        `SELECT e.id, e.display_name, e.object_type_code, e.official_village_code, e.status_data, e.status_verification
         FROM awcms_sikesra_entities e
         WHERE e.tenant_id = ? AND e.site_id = ? AND e.deleted_at IS NULL
         ORDER BY e.created_at DESC`
      ).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

      totalRows = rows.results.length;
      content = generateCsv(rows.results);
      contentType = "text/csv";
    } else if (job.reportType === "verification_status") {
      const rows = await db.prepare(
        `SELECT e.id, e.display_name, e.official_village_code, e.status_verification, e.verification_note
         FROM awcms_sikesra_entities e
         WHERE e.tenant_id = ? AND e.site_id = ? AND e.deleted_at IS NULL AND e.status_verification != 'pending'
         ORDER BY e.created_at DESC`
      ).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

      totalRows = rows.results.length;
      content = generateCsv(rows.results);
      contentType = "text/csv";
    } else {
      content = "Report type not yet implemented";
      contentType = "text/csv";
    }

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const r2Key = `tenants/${ctx.tenantId}/sites/${ctx.siteId}/exports/${yyyy}/${mm}/${jobId}.${job.format === "xlsx" ? "xlsx" : "csv"}`;

    await r2.put(r2Key, content, { httpMetadata: { contentType } });

    await db.prepare(
      `UPDATE awcms_sikesra_export_jobs 
       SET status = 'ready', total_rows = ?, r2_key = ?, updated_at = datetime('now'), updated_by = ?
       WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(totalRows, r2Key, ctx.userId, jobId, ctx.tenantId, ctx.siteId).run();

    return { r2Key, totalRows };
  } catch (error) {
    await db.prepare(
      `UPDATE awcms_sikesra_export_jobs 
       SET status = 'failed', updated_at = datetime('now'), updated_by = ?
       WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(ctx.userId, jobId, ctx.tenantId, ctx.siteId).run();

    throw error;
  }
}

export interface ExportDownloadResult {
  content: ReadableStream | ArrayBuffer;
  mimeType: string;
  filename: string;
  sizeBytes: number;
}

export async function downloadExportFile(
  db: D1Binding,
  r2: R2Bucket,
  jobId: string,
  ctx: SikesraRequestContext,
): Promise<ExportDownloadResult> {
  const row = await db.prepare(
    `SELECT id, report_type, status, r2_key, format
     FROM awcms_sikesra_export_jobs
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(jobId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) throw new Error("EXPORT_JOB_NOT_FOUND");
  if (row.status !== "ready") throw new Error("EXPORT_JOB_NOT_READY");
  if (!row.r2_key) throw new Error("EXPORT_FILE_NOT_FOUND");

  const r2Object = await r2.get(row.r2_key as string);
  if (!r2Object) throw new Error("EXPORT_FILE_NOT_FOUND_IN_STORAGE");

  await db.prepare(
    `UPDATE awcms_sikesra_export_jobs 
     SET downloaded_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, jobId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.EXPORT_DOWNLOAD,
      resourceType: "export_job",
      resourceId: jobId,
      requestId: ctx.requestId,
      success: true,
      reason: `download export ${row.report_type}`,
      after: {
        reportType: row.report_type,
        format: row.format,
        status: row.status,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  const mimeType = row.format === "xlsx" 
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    : "text/csv";
  const filename = `${row.report_type}_${jobId}.${row.format === "xlsx" ? "xlsx" : "csv"}`;

  return {
    content: r2Object.body,
    mimeType,
    filename,
    sizeBytes: 0,
  };
}

function generateCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => {
        const value = row[header];
        const stringValue = value == null ? "" : String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(",")
    ),
  ];

  return csvRows.join("\n");
}
