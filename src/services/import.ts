// SIKESRA Import Service
// Excel workbook -> staging -> validation -> duplicate review -> promotion
// Source: docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { createImportBatchRepo, getImportBatch, listImportMappingTemplatesRepo, updateBatchCounts, upsertImportMappingTemplateRepo } from "../repositories/import-repository";
import { AUDIT_ACTIONS, writeAuditEvent } from "./audit";

export type ImportBatchStatus = "uploaded" | "mapped" | "validated" | "promoting" | "promoted" | "failed";
export type StagingRowStatus = "pending" | "valid" | "invalid" | "corrected" | "duplicate_review" | "promoted" | "skipped" | "failed";

export interface ImportBatch {
  id: string;
  originalFilename: string;
  sheetName?: string;
  objectTypeCode?: string;
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

export interface ImportMappingTemplate {
  id: string;
  name: string;
  objectTypeCode?: string;
  mapping: ImportMapping[];
  isActive: boolean;
  updatedAt?: string;
}

export interface ImportBatchCreateInput {
  originalFilename: string;
  sheetName?: string;
  objectTypeCode?: string;
}

export async function createImportBatch(
  db: D1Binding,
  input: ImportBatchCreateInput,
  ctx: SikesraRequestContext,
): Promise<ImportBatch> {
  const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeName = input.originalFilename.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "upload.xlsx";
  const r2Key = `tenants/${ctx.tenantId}/sites/${ctx.siteId}/modules/sikesra/imports/${yyyy}/${mm}/${safeName}`;

  await createImportBatchRepo(
    db,
    id,
    r2Key,
    input.originalFilename.trim() || "upload.xlsx",
    input.sheetName,
    input.objectTypeCode,
    ctx.userId,
    ctx,
  );

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.IMPORT_CREATE,
      resourceType: "import_batch",
      resourceId: id,
      requestId: ctx.requestId,
      success: true,
      reason: `create import batch for ${input.originalFilename.trim() || "upload.xlsx"}`,
      after: {
        id,
        originalFilename: input.originalFilename.trim() || "upload.xlsx",
        sheetName: input.sheetName ?? null,
        objectTypeCode: input.objectTypeCode ?? null,
        status: "uploaded",
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  const batch = await getImportBatch(db, id, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_CREATE_FAILED");
  }
  return batch;
}

export async function parseAndStageRows(
  db: D1Binding,
  batchId: string,
  mapping: ImportMapping[],
  ctx: SikesraRequestContext,
): Promise<{ staged: number; validationErrors: number; template: ImportMappingTemplate }> {
  const batch = await getImportBatch(db, batchId, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_NOT_FOUND");
  }
  if (!mapping.length) {
    throw new Error("IMPORT_MAPPING_REQUIRED");
  }

  const templateId = `imap_${batchId}`;
  const templateName = `batch:${batchId}`;
  await upsertImportMappingTemplateRepo(
    db,
    {
      id: templateId,
      name: templateName,
      objectTypeCode: undefined,
      mapping,
      createdBy: ctx.userId,
    },
    ctx,
  );
  await updateBatchCounts(db, batchId, { status: "mapped" }, ctx);

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.IMPORT_MAP,
      resourceType: "import_batch",
      resourceId: batchId,
      requestId: ctx.requestId,
      success: true,
      reason: `save mapping template for ${batchId}`,
      after: {
        templateId,
        mappingCount: mapping.length,
        status: "mapped",
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return {
    staged: 0,
    validationErrors: 0,
    template: {
      id: templateId,
      name: templateName,
      objectTypeCode: batch.objectTypeCode,
      mapping,
      isActive: true,
    },
  };
}

export async function getImportMappingTemplates(
  db: D1Binding,
  objectTypeCode: string | undefined,
  ctx: SikesraRequestContext,
): Promise<ImportMappingTemplate[]> {
  return listImportMappingTemplatesRepo(db, objectTypeCode, ctx);
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
