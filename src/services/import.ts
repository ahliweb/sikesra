// SIKESRA Import Service
// Excel workbook -> staging -> validation -> duplicate review -> promotion
// Source: docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";

export type ImportBatchStatus = "uploaded" | "mapped" | "validated" | "promoting" | "promoted" | "failed";
export type StagingRowStatus = "pending" | "valid" | "invalid" | "corrected" | "duplicate_review" | "promoted" | "skipped" | "failed";

export interface ImportBatch {
  id: string;
  originalFilename: string;
  sheetName?: string;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  promotedRowCount: number;
  status: ImportBatchStatus;
  createdAt: string;
}

export interface ImportStagingRow {
  id: string;
  batchId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  mappedData?: Record<string, unknown>;
  validationErrors?: Record<string, string[]>;
  rowStatus: StagingRowStatus;
  duplicateRisk?: "low" | "medium" | "high" | "blocking";
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  defaultValue?: string;
  transform?: string;
}

export async function createImportBatch(
  r2Key: string,
  originalFilename: string,
  ctx: SikesraRequestContext,
): Promise<ImportBatch> {
  // TODO: create import_batches record
  // Parse workbook, detect sheets
  // Audit import.create
  throw new Error("Not implemented");
}

export async function parseAndStageRows(
  batchId: string,
  mapping: ImportMapping[],
  ctx: SikesraRequestContext,
): Promise<{ staged: number; validationErrors: number }> {
  // TODO: parse rows using mapping
  // Store raw + mapped data in staging rows
  // Validate required fields, types, regions
  // Mark valid/invalid rows
  throw new Error("Not implemented");
}

export async function promoteImportRows(
  batchId: string,
  rowIds: string[],
  duplicateDecisions: Record<string, string>,
  ctx: SikesraRequestContext,
): Promise<{ promoted: number; skipped: number }> {
  // TODO: validate all rows are valid
  // Ensure duplicate decisions exist for candidates
  // Promote: create entity + detail + person + attribute + document records
  // Generate IDs where requirements pass
  // Audit import.promote
  // Promoted entity is not auto-verified
  throw new Error("Not implemented");
}
