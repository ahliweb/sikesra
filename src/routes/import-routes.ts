// SIKESRA Import Route Handlers
// Import batch list and creation endpoints
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { createImportBatch, promoteImportRows, loadExcelIntoStaging, loadCsvIntoStaging, rollbackImportPromotion } from "../services/import";
import { getImportBatch, getStagingRows, updateStagingRow } from "../repositories/import-repository";

export interface ImportListParams {
  page?: number;
  perPage?: number;
  status?: string;
}

export interface ImportBatchSummary {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  promotedRows: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportCreateInput {
  filename: string;
  objectTypeCode?: string;
}

export interface ImportRowUpdateInput {
  rowId: string;
  mappedData?: Record<string, unknown>;
  validationErrors?: Record<string, string[]>;
  rowStatus?: "pending" | "valid" | "invalid" | "corrected" | "duplicate_review" | "promoted" | "skipped" | "failed";
}

// GET /imports — list import batches
export const importListHandler = withHandlerSequence(
  async (input: ImportListParams, db: D1Binding, ctx: SikesraRequestContext) => {
    const page = input?.page ?? 1;
    const perPage = Math.min(input?.perPage ?? 20, 100);
    const offset = (page - 1) * perPage;

    const where = `WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL${
      input?.status ? " AND status = ?" : ""
    }`;
    const params: unknown[] = [ctx.tenantId, ctx.siteId];
    if (input?.status) params.push(input.status);

    const total =
      (
        await db
          .prepare(`SELECT COUNT(*) as cnt FROM awcms_sikesra_import_batches ${where}`)
          .bind(...params)
          .first<{ cnt: number }>()
      )?.cnt ?? 0;

    const rows = await db
      .prepare(
        `SELECT id, original_filename, status, total_rows, valid_rows, invalid_rows, promoted_rows, created_at, updated_at
         FROM awcms_sikesra_import_batches ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, perPage, offset)
      .all<Record<string, unknown>>();

    const items: ImportBatchSummary[] = rows.results.map((r) => ({
      id: String(r.id),
      filename: String(r.original_filename ?? ""),
      status: String(r.status ?? "pending"),
      totalRows: Number(r.total_rows ?? 0),
      validRows: Number(r.valid_rows ?? 0),
      invalidRows: Number(r.invalid_rows ?? 0),
      promotedRows: Number(r.promoted_rows ?? 0),
      createdAt: String(r.created_at ?? ""),
      updatedAt: String(r.updated_at ?? ""),
    }));

    return { items, meta: { page, perPage, total, hasMore: offset + perPage < total } };
  }
);

// POST /imports — create import batch shell
export const importCreateHandler = async (routeCtx: EmDashRouteContext<ImportCreateInput>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const input: ImportCreateInput = routeCtx.input ?? { filename: "upload.xlsx" };
  return createImportBatch(
    db,
    {
      originalFilename: input.filename ?? "upload.xlsx",
      objectTypeCode: input.objectTypeCode,
    },
    ctx,
  );
};

// GET /imports/{id}/rows — list staging rows for a batch
export const importRowsHandler = withHandlerSequence(
  async (input: { request: Request }, db: D1Binding, ctx: SikesraRequestContext) => {
    const url = new URL(input.request.url);
    const batchId = url.searchParams.get("batchId") ?? "";
    if (!batchId) throw new Error("IMPORT_BATCH_ID_REQUIRED");

    const batch = await getImportBatch(db, batchId, ctx);
    if (!batch) throw new Error("IMPORT_BATCH_NOT_FOUND");

    const rows = await getStagingRows(db, batchId, ctx);
    return {
      batch: {
        id: batch.id,
        status: batch.status,
        originalFilename: batch.originalFilename,
      },
      rows,
    };
  },
);

// PATCH /imports/{id}/rows/{rowId} — update a staging row
export const importRowUpdateHandler = async (routeCtx: EmDashRouteContext<ImportRowUpdateInput>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const input = routeCtx.input;
  if (!input?.rowId) throw new Error("IMPORT_ROW_ID_REQUIRED");

  await updateStagingRow(
    db,
    input.rowId,
    {
      mappedData: input.mappedData,
      validationErrors: input.validationErrors,
      rowStatus: input.rowStatus,
    },
    ctx,
  );

  return {
    ok: true,
    rowId: input.rowId,
    status: input.rowStatus ?? "unchanged",
  };
};

// POST /imports/{id}/promote — promote valid rows to entities
export const importPromoteHandler = async (routeCtx: EmDashRouteContext<{ rowIds: string[]; duplicateDecisions?: Record<string, string> }>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const batchId = parts[parts.indexOf("imports") + 1];

  const input = routeCtx.input;
  if (!input?.rowIds || !input.rowIds.length) throw new Error("IMPORT_ROW_IDS_REQUIRED");

  return promoteImportRows(
    db,
    batchId,
    input.rowIds,
    input.duplicateDecisions ?? {},
    ctx,
  );
};

// POST /imports/{id}/upload — upload file and parse into staging rows
export const importUploadHandler = async (routeCtx: EmDashRouteContext) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const batchId = parts[parts.indexOf("imports") + 1];

  const formData = await routeCtx.request.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("IMPORT_FILE_REQUIRED");

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("IMPORT_FILE_TOO_LARGE");
  }

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
  const isCsv = fileName.endsWith(".csv");

  if (!isExcel && !isCsv) {
    throw new Error("IMPORT_UNSUPPORTED_FORMAT");
  }

  const fileContent = await file.arrayBuffer();
  const sheetName = formData.get("sheetName") as string | undefined;

  let result: { staged: number; headers: string[] };

  if (isExcel) {
    result = await loadExcelIntoStaging(db, batchId, fileContent, sheetName, ctx);
  } else {
    result = await loadCsvIntoStaging(db, batchId, fileContent, ctx);
  }

  return {
    success: true,
    batchId,
    staged: result.staged,
    headers: result.headers,
    fileName: file.name,
    fileSize: file.size,
  };
};

// POST /imports/{id}/rollback — rollback promoted rows
export const importRollbackHandler = async (routeCtx: EmDashRouteContext<{ rowIds?: string[] }>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const batchId = parts[parts.indexOf("imports") + 1];

  const input = routeCtx.input;
  return rollbackImportPromotion(
    db,
    batchId,
    ctx,
    input?.rowIds,
  );
};
