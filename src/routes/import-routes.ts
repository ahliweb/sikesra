// SIKESRA Import Route Handlers
// Import batch list and creation endpoints
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";

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
  const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tenantId = ctx.tenantId;
  const siteId = ctx.siteId;

  await db
    .prepare(
      `INSERT INTO awcms_sikesra_import_batches
       (id, tenant_id, site_id, original_filename, status, object_type_code, created_by)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .bind(id, tenantId, siteId, input.filename ?? "upload.xlsx", input.objectTypeCode ?? null, "api-user")
    .run();

  const row = await db
    .prepare(`SELECT * FROM awcms_sikesra_import_batches WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>();

  return row ?? { id, status: "pending" };
};
