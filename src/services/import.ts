// SIKESRA Import Service
// Excel workbook -> staging -> validation -> duplicate review -> promotion
// Source: docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { createImportBatchRepo, getImportBatch, getStagingRows, listImportMappingTemplatesRepo, updateBatchCounts, updateStagingRow, upsertImportMappingTemplateRepo } from "../repositories/import-repository";
import { AUDIT_ACTIONS, writeAuditEvent } from "./audit";
import ExcelJS from "exceljs";

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

function buildMappedRow(
  rawData: Record<string, unknown>,
  mapping: ImportMapping[],
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const item of mapping) {
    const rawValue = rawData[item.sourceColumn];
    mapped[item.targetField] = rawValue ?? item.defaultValue ?? null;
  }
  return mapped;
}

function validateMappedRow(mapped: Record<string, unknown>, objectTypeCode?: string): Record<string, string[]> | undefined {
  const errors: Record<string, string[]> = {};
  
  const displayName = String(mapped.displayName ?? "").trim();
  if (!displayName) {
    errors.displayName = ["Nama tampil wajib tersedia dari mapping atau default value."];
  }
  
  const villageCode = String(mapped.officialVillageCode ?? "").trim();
  if (!villageCode) {
    errors.officialVillageCode = ["Desa/kelurahan resmi wajib tersedia untuk validasi region."];
  } else if (!/^\d{10}$/.test(villageCode)) {
    errors.officialVillageCode = ["Kode desa/kelurahan resmi harus 10 digit agar konsisten dengan format ID SIKESRA."];
  }

  const lat = mapped.latitude;
  if (lat !== null && lat !== undefined && lat !== "") {
    const latNum = Number(lat);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.latitude = ["Latitude harus angka antara -90 dan 90."];
    }
  }

  const lon = mapped.longitude;
  if (lon !== null && lon !== undefined && lon !== "") {
    const lonNum = Number(lon);
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      errors.longitude = ["Longitude harus angka antara -180 dan 180."];
    }
  }

  if (objectTypeCode) {
    const typeSpecificErrors = validateObjectTypeSpecific(mapped, objectTypeCode);
    Object.assign(errors, typeSpecificErrors);
  }

  return Object.keys(errors).length ? errors : undefined;
}

function validateObjectTypeSpecific(mapped: Record<string, unknown>, objectTypeCode: string): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  switch (objectTypeCode) {
    case "01": // Rumah Ibadah
      if (!String(mapped.jenis_rumah_ibadah ?? "").trim()) {
        errors.jenis_rumah_ibadah = ["Jenis rumah ibadah wajib diisi."];
      }
      if (!String(mapped.status_pembangunan ?? "").trim()) {
        errors.status_pembangunan = ["Status pembangunan wajib diisi."];
      }
      if (mapped.luas_bangunan) {
        const luas = Number(mapped.luas_bangunan);
        if (isNaN(luas) || luas <= 0) {
          errors.luas_bangunan = ["Luas bangunan harus angka positif."];
        }
      }
      if (mapped.kapasitas_jamaah) {
        const kap = Number(mapped.kapasitas_jamaah);
        if (isNaN(kap) || kap <= 0 || !Number.isInteger(kap)) {
          errors.kapasitas_jamaah = ["Kapasitas jamaah harus bilangan bulat positif."];
        }
      }
      break;

    case "02": // Organisasi Keagamaan
      if (!String(mapped.agama ?? "").trim()) {
        errors.agama = ["Agama wajib diisi."];
      }
      if (!String(mapped.nama_pimpinan ?? "").trim()) {
        errors.nama_pimpinan = ["Nama pimpinan wajib diisi."];
      }
      if (mapped.jumlah_pengurus) {
        const jumlah = Number(mapped.jumlah_pengurus);
        if (isNaN(jumlah) || jumlah < 0 || !Number.isInteger(jumlah)) {
          errors.jumlah_pengurus = ["Jumlah pengurus harus bilangan bulat non-negatif."];
        }
      }
      break;

    case "03": // Pendidikan Keagamaan
      if (!String(mapped.jenis_pendidikan ?? "").trim()) {
        errors.jenis_pendidikan = ["Jenis pendidikan wajib diisi."];
      }
      if (mapped.jumlah_santri_lk) {
        const jumlah = Number(mapped.jumlah_santri_lk);
        if (isNaN(jumlah) || jumlah < 0 || !Number.isInteger(jumlah)) {
          errors.jumlah_santri_lk = ["Jumlah santri LK harus bilangan bulat non-negatif."];
        }
      }
      if (mapped.jumlah_santri_pr) {
        const jumlah = Number(mapped.jumlah_santri_pr);
        if (isNaN(jumlah) || jumlah < 0 || !Number.isInteger(jumlah)) {
          errors.jumlah_santri_pr = ["Jumlah santri PR harus bilangan bulat non-negatif."];
        }
      }
      break;

    case "04": // Lembaga Sosial
      if (!String(mapped.jenis_lks ?? "").trim()) {
        errors.jenis_lks = ["Jenis LKS wajib diisi."];
      }
      if (!String(mapped.nama_pimpinan ?? "").trim()) {
        errors.nama_pimpinan = ["Nama pimpinan wajib diisi."];
      }
      break;

    case "05": // Guru Keagamaan
      if (!String(mapped.agama ?? "").trim()) {
        errors.agama = ["Agama wajib diisi."];
      }
      if (!String(mapped.status_guru ?? "").trim()) {
        errors.status_guru = ["Status guru wajib diisi."];
      }
      break;

    case "06": // Anak Binaan
      if (!String(mapped.kategori_anak ?? "").trim()) {
        errors.kategori_anak = ["Kategori anak wajib diisi."];
      }
      if (!String(mapped.status_sekolah ?? "").trim()) {
        errors.status_sekolah = ["Status sekolah wajib diisi."];
      }
      break;

    case "07": // Tokoh Masyarakat
      if (!String(mapped.jenis_tokoh ?? "").trim()) {
        errors.jenis_tokoh = ["Jenis tokoh wajib diisi."];
      }
      if (!String(mapped.nama_lengkap ?? "").trim()) {
        errors.nama_lengkap = ["Nama lengkap wajib diisi."];
      }
      break;

    case "08": // Tempat Pemakaman
      if (!String(mapped.jenis_tempat ?? "").trim()) {
        errors.jenis_tempat = ["Jenis tempat wajib diisi."];
      }
      if (!String(mapped.status_pengelolaan ?? "").trim()) {
        errors.status_pengelolaan = ["Status pengelolaan wajib diisi."];
      }
      break;
  }

  return errors;
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

export interface ParseExcelResult {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

export async function parseExcelFile(
  fileContent: ArrayBuffer | Uint8Array,
  sheetName?: string,
): Promise<ParseExcelResult> {
  const workbook = new ExcelJS.Workbook();
  const buffer = fileContent instanceof ArrayBuffer
    ? Buffer.from(new Uint8Array(fileContent))
    : Buffer.from(fileContent);
  await workbook.xlsx.load(buffer as any);

  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(sheetName ? `WORKSHEET_NOT_FOUND: ${sheetName}` : "NO_WORKSHEET_IN_FILE");
  }

  const headers: string[] = [];
  const rows: Array<Record<string, unknown>> = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? "").trim() || `column_${colNumber}`;
      });
      return;
    }

    const rowData: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1] || `column_${colNumber}`;
      const value = cell.value;
      if (value instanceof Date) {
        rowData[header] = value.toISOString();
      } else if (typeof value === "object" && value !== null) {
        rowData[header] = JSON.stringify(value);
      } else {
        rowData[header] = value ?? null;
      }
    });

    if (Object.values(rowData).some((v) => v !== null && v !== "")) {
      rows.push(rowData);
    }
  });

  return { headers, rows, rowCount: rows.length };
}

export async function loadExcelIntoStaging(
  db: D1Binding,
  batchId: string,
  fileContent: ArrayBuffer | Uint8Array,
  sheetName: string | undefined,
  ctx: SikesraRequestContext,
): Promise<{ staged: number; headers: string[] }> {
  const batch = await getImportBatch(db, batchId, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_NOT_FOUND");
  }
  if (batch.status !== "uploaded") {
    throw new Error("IMPORT_BATCH_NOT_IN_UPLOADED_STATE");
  }

  const parsed = await parseExcelFile(fileContent, sheetName || batch.sheetName);
  if (parsed.rowCount === 0) {
    return { staged: 0, headers: parsed.headers };
  }

  const now = new Date().toISOString();
  const stagingIdPrefix = `stag_${batchId}_`;

  const inserts = parsed.rows.map((row, index) => {
    const stagingId = `${stagingIdPrefix}${index + 1}`;
    return db.prepare(
      `INSERT INTO awcms_sikesra_import_staging
       (id, batch_id, tenant_id, site_id, row_number, raw_data_json, row_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(
      stagingId,
      batchId,
      ctx.tenantId,
      ctx.siteId,
      index + 1,
      JSON.stringify(row),
      now,
      now,
    );
  });

  await db.batch(inserts);

  await updateBatchCounts(
    db,
    batchId,
    {
      rowCount: parsed.rowCount,
      status: "uploaded",
    },
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
      resourceId: batchId,
      requestId: ctx.requestId,
      success: true,
      reason: `parsed excel file into ${parsed.rowCount} staging rows for batch ${batchId}`,
      after: {
        rowCount: parsed.rowCount,
        headers: parsed.headers,
        sheetName: sheetName || batch.sheetName,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { staged: parsed.rowCount, headers: parsed.headers };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseCsvFile(
  fileContent: string | ArrayBuffer | Uint8Array,
): Promise<ParseExcelResult> {
  const text = typeof fileContent === "string"
    ? fileContent
    : new TextDecoder().decode(fileContent);

  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const rowData: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index] ?? null;
    });

    if (Object.values(rowData).some((v) => v !== null && v !== "")) {
      rows.push(rowData);
    }
  }

  return { headers, rows, rowCount: rows.length };
}

export async function loadCsvIntoStaging(
  db: D1Binding,
  batchId: string,
  fileContent: string | ArrayBuffer | Uint8Array,
  ctx: SikesraRequestContext,
): Promise<{ staged: number; headers: string[] }> {
  const batch = await getImportBatch(db, batchId, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_NOT_FOUND");
  }
  if (batch.status !== "uploaded") {
    throw new Error("IMPORT_BATCH_NOT_IN_UPLOADED_STATE");
  }

  const parsed = await parseCsvFile(fileContent);
  if (parsed.rowCount === 0) {
    return { staged: 0, headers: parsed.headers };
  }

  const now = new Date().toISOString();
  const stagingIdPrefix = `stag_${batchId}_`;

  const inserts = parsed.rows.map((row, index) => {
    const stagingId = `${stagingIdPrefix}${index + 1}`;
    return db.prepare(
      `INSERT INTO awcms_sikesra_import_staging
       (id, batch_id, tenant_id, site_id, row_number, raw_data_json, row_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(
      stagingId,
      batchId,
      ctx.tenantId,
      ctx.siteId,
      index + 1,
      JSON.stringify(row),
      now,
      now,
    );
  });

  await db.batch(inserts);

  await updateBatchCounts(
    db,
    batchId,
    {
      rowCount: parsed.rowCount,
      status: "uploaded",
    },
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
      resourceId: batchId,
      requestId: ctx.requestId,
      success: true,
      reason: `parsed csv file into ${parsed.rowCount} staging rows for batch ${batchId}`,
      after: {
        rowCount: parsed.rowCount,
        headers: parsed.headers,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { staged: parsed.rowCount, headers: parsed.headers };
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

  const stagingRows = await getStagingRows(db, batchId, ctx);
  let validCount = 0;
  let invalidCount = 0;
  let duplicateReviewCount = 0;

  for (const row of stagingRows) {
    if (row.rowStatus === "promoted" || row.rowStatus === "skipped" || row.rowStatus === "failed") {
      continue;
    }

    const mappedData = buildMappedRow(row.rawData, mapping);
    const validationErrors = validateMappedRow(mappedData, batch.objectTypeCode);
    let rowStatus: StagingRowStatus = validationErrors ? "invalid" : "valid";
    if (!validationErrors && row.duplicateRisk) {
      rowStatus = "duplicate_review";
    }

    await updateStagingRow(
      db,
      row.id,
      {
        mappedData,
        validationErrors,
        rowStatus,
      },
      ctx,
    );

    if (rowStatus === "valid") validCount++;
    if (rowStatus === "invalid") invalidCount++;
    if (rowStatus === "duplicate_review") duplicateReviewCount++;
  }

  await updateBatchCounts(
    db,
    batchId,
    {
      rowCount: stagingRows.length,
      validRowCount: validCount,
      invalidRowCount: invalidCount + duplicateReviewCount,
      status: stagingRows.length > 0 ? "validated" : "mapped",
    },
    ctx,
  );

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.IMPORT_VALIDATE,
      resourceType: "import_batch",
      resourceId: batchId,
      requestId: ctx.requestId,
      success: true,
      reason: `validate mapping for ${batchId}`,
      after: {
        rowCount: stagingRows.length,
        validRowCount: validCount,
        invalidRowCount: invalidCount,
        duplicateReviewCount,
        status: stagingRows.length > 0 ? "validated" : "mapped",
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return {
    staged: stagingRows.length,
    validationErrors: invalidCount + duplicateReviewCount,
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

interface DuplicateCheckResult {
  isDuplicate: boolean;
  riskLevel: "low" | "medium" | "high" | "blocking";
  existingEntityId?: string;
  existingEntityName?: string;
  matchReason?: string;
}

async function checkImportDuplicate(
  db: D1Binding,
  displayName: string,
  officialVillageCode: string,
  objectTypeCode: string,
  ctx: SikesraRequestContext,
): Promise<DuplicateCheckResult> {
  if (!displayName || !officialVillageCode) {
    return { isDuplicate: false, riskLevel: "low" };
  }

  const normalizedName = displayName.toLowerCase().trim();
  
  const result = await db.prepare(
    `SELECT id, display_name, object_type_code, official_village_code
     FROM awcms_sikesra_entities
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     AND object_type_code = ?
     AND official_village_code = ?`
  ).bind(ctx.tenantId, ctx.siteId, objectTypeCode, officialVillageCode).all<Record<string, unknown>>();

  for (const row of result.results) {
    const existingName = String(row.display_name ?? "").toLowerCase().trim();
    
    if (existingName === normalizedName) {
      return {
        isDuplicate: true,
        riskLevel: "blocking",
        existingEntityId: String(row.id),
        existingEntityName: String(row.display_name),
        matchReason: "Nama dan desa sama persis",
      };
    }
    
    const similarity = calculateStringSimilarity(normalizedName, existingName);
    if (similarity > 0.9) {
      return {
        isDuplicate: true,
        riskLevel: "high",
        existingEntityId: String(row.id),
        existingEntityName: String(row.display_name),
        matchReason: `Kemiripan nama ${Math.round(similarity * 100)}% di desa yang sama`,
      };
    }
  }

  return { isDuplicate: false, riskLevel: "low" };
}

function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  let matches = 0;
  const searchRange = Math.max(Math.floor(longer.length / 2) - 1, 0);
  
  for (let i = 0; i < shorter.length; i++) {
    const char = shorter[i];
    const startIndex = Math.max(0, i - searchRange);
    const endIndex = Math.min(i + searchRange + 1, longer.length);
    
    for (let j = startIndex; j < endIndex; j++) {
      if (longer[j] === char) {
        matches++;
        break;
      }
    }
  }
  
  return matches / longer.length;
}

export async function promoteImportRows(
  db: D1Binding,
  batchId: string,
  rowIds: string[],
  duplicateDecisions: Record<string, string>,
  ctx: SikesraRequestContext,
): Promise<{ promoted: number; skipped: number }> {
  const batch = await getImportBatch(db, batchId, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_NOT_FOUND");
  }
  if (batch.status !== "validated") {
    throw new Error("IMPORT_BATCH_NOT_VALIDATED");
  }

  const stagingRows = await getStagingRows(db, batchId, ctx);
  const rowsToPromote = stagingRows.filter((row) => rowIds.includes(row.id));

  let promotedCount = 0;
  let skippedCount = 0;

  for (const row of rowsToPromote) {
    if (row.rowStatus === "invalid" || row.rowStatus === "failed") {
      skippedCount++;
      await updateStagingRow(db, row.id, { rowStatus: "skipped" }, ctx);
      continue;
    }

    if (row.rowStatus === "duplicate_review") {
      const decision = duplicateDecisions[row.id];
      if (!decision) {
        skippedCount++;
        await updateStagingRow(db, row.id, { rowStatus: "skipped" }, ctx);
        continue;
      }
      if (decision === "skip") {
        skippedCount++;
        await updateStagingRow(db, row.id, { rowStatus: "skipped" }, ctx);
        continue;
      }
    }

    if (!row.mappedData) {
      skippedCount++;
      await updateStagingRow(db, row.id, { rowStatus: "failed" }, ctx);
      continue;
    }

    try {
      const displayName = String(row.mappedData.displayName ?? "").trim();
      const officialVillageCode = String(row.mappedData.officialVillageCode ?? "").trim();
      const objectTypeCode = batch.objectTypeCode ?? "general";

      const duplicateCheck = await checkImportDuplicate(db, displayName, officialVillageCode, objectTypeCode, ctx);
      if (duplicateCheck.isDuplicate && duplicateCheck.riskLevel === "blocking") {
        await updateStagingRow(db, row.id, { 
          rowStatus: "duplicate_review",
          validationErrors: {
            ...row.validationErrors,
            _duplicate: [`Potensi duplikat dengan entitas "${duplicateCheck.existingEntityName}" (${duplicateCheck.matchReason}).`]
          }
        }, ctx);
        skippedCount++;
        continue;
      }

      const entityId = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const objectSubtypeCode = String(row.mappedData.objectSubtypeCode ?? "default");
      const addressText = String(row.mappedData.addressText ?? "");
      const sensitivityLevel = String(row.mappedData.sensitivityLevel ?? "internal");
      const sourceInput = "import";

      await db.prepare(
        `INSERT INTO awcms_sikesra_entities 
         (id, tenant_id, site_id, display_name, object_type_code, object_subtype_code, 
          official_village_code, address_text, sensitivity_level, source_input, 
          status_data, status_verification, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending', ?, ?)`
      ).bind(
        entityId, ctx.tenantId, ctx.siteId, displayName, objectTypeCode, objectSubtypeCode,
        officialVillageCode, addressText, sensitivityLevel, sourceInput,
        ctx.userId, ctx.userId,
      ).run();

      await updateStagingRow(db, row.id, { rowStatus: "promoted" }, ctx);
      promotedCount++;
    } catch (error) {
      await updateStagingRow(db, row.id, { rowStatus: "failed" }, ctx);
      skippedCount++;
    }
  }

  await updateBatchCounts(
    db,
    batchId,
    {
      promotedRowCount: batch.promotedRowCount + promotedCount,
      status: promotedCount > 0 ? "promoted" : batch.status,
    },
    ctx,
  );

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.IMPORT_PROMOTE,
      resourceType: "import_batch",
      resourceId: batchId,
      requestId: ctx.requestId,
      success: true,
      reason: `promote ${promotedCount} rows from import batch ${batchId}`,
      after: {
        promotedCount,
        skippedCount,
        batchId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { promoted: promotedCount, skipped: skippedCount };
}

export interface ImportRollbackResult {
  rolledBack: number;
  failed: number;
  deletedEntityIds: string[];
}

export async function rollbackImportPromotion(
  db: D1Binding,
  batchId: string,
  ctx: SikesraRequestContext,
  rowIds?: string[],
): Promise<ImportRollbackResult> {
  const batch = await getImportBatch(db, batchId, ctx);
  if (!batch) {
    throw new Error("IMPORT_BATCH_NOT_FOUND");
  }

  const stagingRows = await getStagingRows(db, batchId, ctx);
  const rowsToRollback = rowIds
    ? stagingRows.filter((row) => rowIds.includes(row.id) && row.rowStatus === "promoted")
    : stagingRows.filter((row) => row.rowStatus === "promoted");

  let rolledBackCount = 0;
  let failedCount = 0;
  const deletedEntityIds: string[] = [];

  for (const row of rowsToRollback) {
    try {
      const mappedData = row.mappedData;
      if (!mappedData) {
        failedCount++;
        continue;
      }

      const displayName = String(mappedData.displayName ?? "").trim();
      const officialVillageCode = String(mappedData.officialVillageCode ?? "").trim();
      const objectTypeCode = batch.objectTypeCode ?? "general";

      const entityResult = await db.prepare(
        `SELECT id FROM awcms_sikesra_entities
         WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
         AND display_name = ? AND official_village_code = ? AND object_type_code = ?
         AND source_input = 'import'
         ORDER BY created_at DESC LIMIT 1`
      ).bind(ctx.tenantId, ctx.siteId, displayName, officialVillageCode, objectTypeCode).first<{ id: string }>();

      if (entityResult) {
        await db.prepare(
          `UPDATE awcms_sikesra_entities SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`
        ).bind(ctx.userId, entityResult.id).run();

        deletedEntityIds.push(entityResult.id);
      }

      await updateStagingRow(db, row.id, { rowStatus: "valid" }, ctx);
      rolledBackCount++;
    } catch (error) {
      failedCount++;
    }
  }

  const newPromotedCount = batch.promotedRowCount - rolledBackCount;
  await updateBatchCounts(
    db,
    batchId,
    {
      promotedRowCount: Math.max(0, newPromotedCount),
      status: newPromotedCount > 0 ? "promoted" : "validated",
    },
    ctx,
  );

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.IMPORT_PROMOTE,
      resourceType: "import_batch",
      resourceId: batchId,
      requestId: ctx.requestId,
      success: failedCount === 0,
      reason: `rollback ${rolledBackCount} promoted rows from import batch ${batchId}`,
      after: {
        rolledBackCount,
        failedCount,
        deletedEntityIds,
        batchId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { rolledBack: rolledBackCount, failed: failedCount, deletedEntityIds };
}
