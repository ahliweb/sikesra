// SIKESRA Import Repository
// D1 SQL for import batches, staging rows, mapping templates
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { ImportBatch, ImportStagingRow, StagingRowStatus, ImportBatchStatus, ImportMapping, ImportMappingTemplate } from "../services/import";

const BATCH_TABLE = "awcms_sikesra_import_batches";
const ROWS_TABLE = "awcms_sikesra_import_staging_rows";
const MAPPING_TABLE = "awcms_sikesra_import_mapping_templates";

export async function createImportBatchRepo(
  db: D1Binding,
  id: string,
  r2Key: string,
  originalFilename: string,
  sheetName: string | undefined,
  objectTypeCode: string | undefined,
  createdBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  await db.prepare(
    `INSERT INTO ${BATCH_TABLE} (id, tenant_id, site_id, r2_key, original_filename, sheet_name, object_type_code, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, ctx.tenantId, ctx.siteId, r2Key, originalFilename, sheetName ?? null, objectTypeCode ?? null, createdBy, createdBy).run();
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
    sheetName: row.sheet_name as string | undefined, objectTypeCode: row.object_type_code as string | undefined, rowCount: row.row_count as number,
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

export async function upsertImportMappingTemplateRepo(
  db: D1Binding,
  input: {
    id: string;
    name: string;
    objectTypeCode?: string;
    mapping: ImportMapping[];
    createdBy: string;
  },
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await db.prepare(
    `SELECT id FROM ${MAPPING_TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(input.id, ctx.tenantId, ctx.siteId).first<{ id: string }>();

  if (!existing) {
    await db.prepare(
      `INSERT INTO ${MAPPING_TABLE} (id, tenant_id, site_id, name, object_type_code, mapping_json, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).bind(
      input.id,
      ctx.tenantId,
      ctx.siteId,
      input.name,
      input.objectTypeCode ?? null,
      JSON.stringify(input.mapping),
      input.createdBy,
      input.createdBy,
    ).run();
    return;
  }

  await db.prepare(
    `UPDATE ${MAPPING_TABLE}
     SET name = ?, object_type_code = ?, mapping_json = ?, is_active = 1, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(
    input.name,
    input.objectTypeCode ?? null,
    JSON.stringify(input.mapping),
    input.createdBy,
    input.id,
    ctx.tenantId,
    ctx.siteId,
  ).run();
}

export async function listImportMappingTemplatesRepo(
  db: D1Binding,
  objectTypeCode: string | undefined,
  ctx: SikesraRequestContext,
): Promise<ImportMappingTemplate[]> {
  const params: unknown[] = [ctx.tenantId, ctx.siteId];
  let sql = `SELECT id, name, object_type_code, mapping_json, is_active, updated_at
    FROM ${MAPPING_TABLE}
    WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`;
  if (objectTypeCode) {
    sql += " AND (object_type_code = ? OR object_type_code IS NULL)";
    params.push(objectTypeCode);
  }
  sql += " ORDER BY updated_at DESC, name LIMIT 20";

  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    objectTypeCode: row.object_type_code as string | undefined,
    mapping: row.mapping_json ? JSON.parse(row.mapping_json as string) : [],
    isActive: !!row.is_active,
    updatedAt: row.updated_at as string | undefined,
  }));
}
