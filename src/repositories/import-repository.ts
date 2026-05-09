// SIKESRA Import Repository
// D1 SQL for import batches, staging rows, mapping templates
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { ImportBatch, ImportStagingRow, StagingRowStatus, ImportBatchStatus } from "../services/import";

const BATCH_TABLE = "awcms_sikesra_import_batches";
const ROWS_TABLE = "awcms_sikesra_import_staging_rows";

export async function createImportBatchRepo(
  db: D1Binding,
  id: string,
  r2Key: string,
  originalFilename: string,
  createdBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  await db.prepare(
    `INSERT INTO ${BATCH_TABLE} (id, tenant_id, site_id, r2_key, original_filename, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, ctx.tenantId, ctx.siteId, r2Key, originalFilename, createdBy).run();
}

export async function getImportBatch(
  db: D1Binding,
  batchId: string,
  ctx: SikesraRequestContext,
): Promise<ImportBatch | null> {
  const row = await db.prepare(
    `SELECT * FROM ${BATCH_TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(batchId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: row.id as string, originalFilename: row.original_filename as string,
    sheetName: row.sheet_name as string | undefined, rowCount: row.row_count as number,
    validRowCount: row.valid_row_count as number, invalidRowCount: row.invalid_row_count as number,
    promotedRowCount: row.promoted_row_count as number, status: row.status as ImportBatchStatus,
    createdAt: row.created_at as string,
  };
}

export async function updateBatchCounts(
  db: D1Binding,
  batchId: string,
  counts: { rowCount?: number; validRowCount?: number; invalidRowCount?: number; promotedRowCount?: number; status?: ImportBatchStatus },
  ctx: SikesraRequestContext,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (counts.rowCount !== undefined) { sets.push("row_count = ?"); params.push(counts.rowCount); }
  if (counts.validRowCount !== undefined) { sets.push("valid_row_count = ?"); params.push(counts.validRowCount); }
  if (counts.invalidRowCount !== undefined) { sets.push("invalid_row_count = ?"); params.push(counts.invalidRowCount); }
  if (counts.promotedRowCount !== undefined) { sets.push("promoted_row_count = ?"); params.push(counts.promotedRowCount); }
  if (counts.status !== undefined) { sets.push("status = ?"); params.push(counts.status); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  params.push(batchId, ctx.tenantId, ctx.siteId);
  await db.prepare(`UPDATE ${BATCH_TABLE} SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ?`).bind(...params).run();
}

export async function insertStagingRow(
  db: D1Binding,
  id: string,
  batchId: string,
  rowNumber: number,
  rawData: Record<string, unknown>,
  createdBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  await db.prepare(
    `INSERT INTO ${ROWS_TABLE} (id, tenant_id, site_id, batch_id, row_number, raw_data_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, ctx.tenantId, ctx.siteId, batchId, rowNumber, JSON.stringify(rawData), createdBy).run();
}

export async function getStagingRows(
  db: D1Binding,
  batchId: string,
  ctx: SikesraRequestContext,
): Promise<ImportStagingRow[]> {
  const result = await db.prepare(
    `SELECT * FROM ${ROWS_TABLE} WHERE batch_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL ORDER BY row_number`,
  ).bind(batchId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    id: r.id as string, batchId: r.batch_id as string, rowNumber: r.row_number as number,
    rawData: JSON.parse(r.raw_data_json as string ?? "{}"),
    mappedData: r.mapped_data_json ? JSON.parse(r.mapped_data_json as string) : undefined,
    validationErrors: r.validation_errors_json ? JSON.parse(r.validation_errors_json as string) : undefined,
    rowStatus: r.row_status as StagingRowStatus,
    duplicateRisk: r.duplicate_risk as ImportStagingRow["duplicateRisk"],
  }));
}

export async function updateStagingRow(
  db: D1Binding,
  rowId: string,
  updates: { mappedData?: Record<string, unknown>; validationErrors?: Record<string, string[]>; rowStatus?: StagingRowStatus },
  ctx: SikesraRequestContext,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (updates.mappedData !== undefined) { sets.push("mapped_data_json = ?"); params.push(JSON.stringify(updates.mappedData)); }
  if (updates.validationErrors !== undefined) { sets.push("validation_errors_json = ?"); params.push(JSON.stringify(updates.validationErrors)); }
  if (updates.rowStatus !== undefined) { sets.push("row_status = ?"); params.push(updates.rowStatus); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  params.push(rowId, ctx.tenantId, ctx.siteId);
  await db.prepare(`UPDATE ${ROWS_TABLE} SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ?`).bind(...params).run();
}
