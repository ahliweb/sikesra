import { AUDIT_ACTIONS } from "./security/audit.js";
import type { SikesraRequestContext } from "./security/request-context.js";

export type ImportBatchStatus =
	| "created"
	| "uploaded"
	| "mapped"
	| "validated"
	| "promoting"
	| "promoted"
	| "failed";
export type StagingRowStatus =
	| "pending"
	| "valid"
	| "invalid"
	| "corrected"
	| "duplicate_review"
	| "promoted"
	| "skipped"
	| "failed";

export interface ImportBatch {
	tenantId: string;
	siteId: string;
	originalFilename: string;
	objectTypeCode?: string;
	rowCount: number;
	validRowCount: number;
	invalidRowCount: number;
	promotedRowCount: number;
	status: ImportBatchStatus;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

export interface ImportStagingRow {
	batchId: string;
	tenantId: string;
	siteId: string;
	rowNumber: number;
	rawData: Record<string, unknown>;
	mappedData?: Record<string, unknown>;
	validationErrors?: Record<string, string[]>;
	rowStatus: StagingRowStatus;
	duplicateRisk?: "low" | "medium" | "high" | "blocking";
	promotedEntityId?: string;
}

export interface ImportMapping {
	sourceColumn: string;
	targetField: string;
	defaultValue?: string;
}

export interface ImportStorageContext {
	storage: {
		importBatches: {
			put(id: string, data: ImportBatch): Promise<void>;
			get(id: string): Promise<ImportBatch | null>;
			query(options?: {
				where?: Record<string, unknown>;
				orderBy?: Record<string, "asc" | "desc">;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: ImportBatch }> }>;
		};
		importRows: {
			put(id: string, data: ImportStagingRow): Promise<void>;
			get(id: string): Promise<ImportStagingRow | null>;
			query(options?: {
				where?: Record<string, unknown>;
				orderBy?: Record<string, "asc" | "desc">;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: ImportStagingRow }> }>;
		};
		promotedEntities: {
			put(id: string, data: Record<string, unknown>): Promise<void>;
			get(id: string): Promise<Record<string, unknown> | null>;
			delete(id: string): Promise<boolean>;
			query(options?: {
				where?: Record<string, unknown>;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: Record<string, unknown> }> }>;
		};
			auditEntries: {
				put(id: string, data: Record<string, unknown>): Promise<void>;
			};
		};
	kv: {
		get<T>(key: string): Promise<T | null>;
	};
}

export interface ImportBatchCreateInput {
	originalFilename: string;
	objectTypeCode?: string;
}

export interface StageRowsInput {
	rows: Array<Record<string, unknown>>;
}

export function parseCsvFile(text: string): { headers: string[]; rows: Array<Record<string, unknown>> } {
	const lines = text.split(/\r?\n/).filter((line) => line.trim());
	if (lines.length === 0) return { headers: [], rows: [] };
	const [firstLine] = lines;
	if (!firstLine) return { headers: [], rows: [] };
	const headers = parseCsvLine(firstLine);
	const rows = lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		const row: Record<string, unknown> = {};
		headers.forEach((header, index) => {
			row[header] = values[index] ?? null;
		});
		return row;
	});
	return { headers, rows };
}

export async function createImportBatch(
	runtime: ImportStorageContext,
	input: ImportBatchCreateInput,
	ctx: SikesraRequestContext,
): Promise<{ id: string; status: ImportBatchStatus }> {
	const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const now = new Date().toISOString();
	await runtime.storage.importBatches.put(id, {
		tenantId: ctx.tenantId,
		siteId: ctx.siteId,
		originalFilename: input.originalFilename.trim() || "upload.csv",
		objectTypeCode: input.objectTypeCode,
		rowCount: 0,
		validRowCount: 0,
		invalidRowCount: 0,
		promotedRowCount: 0,
		status: "created",
		createdAt: now,
		updatedAt: now,
		createdBy: ctx.userId,
	});
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_CREATE, id, {
		originalFilename: input.originalFilename,
		objectTypeCode: input.objectTypeCode,
	});
	return { id, status: "created" };
}

export async function stageImportRows(
	runtime: ImportStorageContext,
	batchId: string,
	input: StageRowsInput,
	ctx: SikesraRequestContext,
): Promise<{ staged: number }> {
	const batch = await requireBatch(runtime, batchId, ctx);
	const now = new Date().toISOString();
	for (const [index, row] of input.rows.entries()) {
		await runtime.storage.importRows.put(`row_${batchId}_${index + 1}`, {
			batchId,
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			rowNumber: index + 1,
			rawData: row,
			rowStatus: "pending",
		});
	}
	await runtime.storage.importBatches.put(batchId, {
		...batch,
		rowCount: input.rows.length,
		status: "uploaded",
		updatedAt: now,
	});
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_CREATE, batchId, {
		staged: input.rows.length,
	});
	return { staged: input.rows.length };
}

export async function mapAndValidateImportRows(
	runtime: ImportStorageContext,
	batchId: string,
	mapping: ImportMapping[],
	ctx: SikesraRequestContext,
): Promise<{ staged: number; validationErrors: number }> {
	const batch = await requireBatch(runtime, batchId, ctx);
	const rows = await listRows(runtime, batchId, ctx);
	const preparedRows = rows.map((row) => ({
		id: row.id,
		data: row.data,
		mappedData: buildMappedRow(row.data.rawData, mapping),
	}));
	const seenSignatures = new Set<string>();
	let validRowCount = 0;
	let invalidRowCount = 0;

	for (const row of preparedRows) {
		const mappedData = row.mappedData;
		const validationErrors = validateMappedRow(mappedData);
		const duplicateRisk = detectDuplicateRisk(mappedData, seenSignatures);
		const rowStatus = validationErrors
			? "invalid"
			: duplicateRisk === "high" || duplicateRisk === "blocking"
				? "duplicate_review"
				: "valid";
		if (!validationErrors) {
			seenSignatures.add(buildDuplicateSignature(mappedData));
		}
		if (rowStatus === "valid") validRowCount++;
		if (rowStatus !== "valid") invalidRowCount++;
		await runtime.storage.importRows.put(row.id, {
			...row.data,
			mappedData,
			validationErrors,
			duplicateRisk,
			rowStatus,
		});
	}

	await runtime.storage.importBatches.put(batchId, {
		...batch,
		validRowCount,
		invalidRowCount,
		status: "validated",
		updatedAt: new Date().toISOString(),
	});
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_VALIDATE, batchId, {
		validRowCount,
		invalidRowCount,
		mappingCount: mapping.length,
	});
	return { staged: preparedRows.length, validationErrors: invalidRowCount };
}

export async function listImportRows(
	runtime: ImportStorageContext,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<Array<{ id: string; data: ImportStagingRow }>> {
	return listRows(runtime, batchId, ctx);
}

export async function promoteImportRows(
	runtime: ImportStorageContext,
	batchId: string,
	rowIds: string[],
	duplicateDecisions: Record<string, string>,
	ctx: SikesraRequestContext,
): Promise<{ promoted: number; skipped: number }> {
	const batch = await requireBatch(runtime, batchId, ctx);
	const rows = (await listRows(runtime, batchId, ctx)).filter((row) => rowIds.includes(row.id));
	let promoted = 0;
	let skipped = 0;

	for (const row of rows) {
		if (row.data.rowStatus === "invalid" || row.data.rowStatus === "failed") {
			skipped++;
			continue;
		}
		if (row.data.rowStatus === "duplicate_review") {
			const decision = duplicateDecisions[row.id];
			if (!decision || decision === "skip") {
				skipped++;
				await runtime.storage.importRows.put(row.id, { ...row.data, rowStatus: "skipped" });
				continue;
			}
		}
		if (!row.data.mappedData) {
			skipped++;
			await runtime.storage.importRows.put(row.id, { ...row.data, rowStatus: "failed" });
			continue;
		}

		const entityId = `entity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		await runtime.storage.promotedEntities.put(entityId, {
			...row.data.mappedData,
			id: entityId,
			batchId,
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			sourceInput: "import",
		});
		await runtime.storage.importRows.put(row.id, {
			...row.data,
			rowStatus: "promoted",
			promotedEntityId: entityId,
		});
		promoted++;
	}

	await runtime.storage.importBatches.put(batchId, {
		...batch,
		promotedRowCount: batch.promotedRowCount + promoted,
		status: promoted > 0 ? "promoted" : batch.status,
		updatedAt: new Date().toISOString(),
	});
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_PROMOTE, batchId, { promoted, skipped });
	return { promoted, skipped };
}

export async function rollbackImportPromotion(
	runtime: ImportStorageContext,
	batchId: string,
	ctx: SikesraRequestContext,
	rowIds?: string[],
): Promise<{ rolledBack: number; failed: number; deletedEntityIds: string[] }> {
	const batch = await requireBatch(runtime, batchId, ctx);
	const rows = (await listRows(runtime, batchId, ctx)).filter(
		(row) => row.data.rowStatus === "promoted" && (!rowIds || rowIds.includes(row.id)),
	);
	const deletedEntityIds: string[] = [];
	let rolledBack = 0;

	for (const row of rows) {
		if (row.data.promotedEntityId) {
			await runtime.storage.promotedEntities.delete(row.data.promotedEntityId);
			deletedEntityIds.push(row.data.promotedEntityId);
		}
		await runtime.storage.importRows.put(row.id, {
			...row.data,
			rowStatus: "valid",
			promotedEntityId: undefined,
		});
		rolledBack++;
	}

	await runtime.storage.importBatches.put(batchId, {
		...batch,
		promotedRowCount: Math.max(0, batch.promotedRowCount - rolledBack),
		status: batch.promotedRowCount - rolledBack > 0 ? "promoted" : "validated",
		updatedAt: new Date().toISOString(),
	});
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_PROMOTE, batchId, {
		rolledBack,
		deletedEntityIds,
	});
	return { rolledBack, failed: 0, deletedEntityIds };
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
		} else if (char === "," && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}

function buildMappedRow(
	rawData: Record<string, unknown>,
	mapping: ImportMapping[],
): Record<string, unknown> {
	const mapped: Record<string, unknown> = {};
	for (const item of mapping) {
		mapped[item.targetField] = rawData[item.sourceColumn] ?? item.defaultValue ?? null;
	}
	return mapped;
}

function validateMappedRow(mapped: Record<string, unknown>): Record<string, string[]> | undefined {
	const errors: Record<string, string[]> = {};
	if (!String(mapped.displayName ?? "").trim()) {
		errors.displayName = ["Nama tampil wajib tersedia dari mapping atau default value."];
	}
	const villageCode = String(mapped.officialVillageCode ?? "").trim();
	if (!villageCode) {
		errors.officialVillageCode = ["Desa/kelurahan resmi wajib tersedia untuk validasi region."];
	} else if (!/^\d{10}$/.test(villageCode)) {
		errors.officialVillageCode = ["Kode desa/kelurahan resmi harus 10 digit."];
	}
	return Object.keys(errors).length ? errors : undefined;
}

function detectDuplicateRisk(
	mappedData: Record<string, unknown>,
	seenSignatures: Set<string>,
): "low" | "high" | "blocking" {
	const displayName = String(mappedData.displayName ?? "").trim().toLowerCase();
	const villageCode = String(mappedData.officialVillageCode ?? "").trim();
	if (!displayName || !villageCode) return "low";
	return seenSignatures.has(buildDuplicateSignature(mappedData)) ? "blocking" : "low";
}

function buildDuplicateSignature(mappedData: Record<string, unknown>): string {
	return `${String(mappedData.displayName ?? "").trim().toLowerCase()}::${String(
		mappedData.officialVillageCode ?? "",
	).trim()}`;
}

async function requireBatch(
	runtime: ImportStorageContext,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<ImportBatch> {
	const batch = await runtime.storage.importBatches.get(batchId);
	if (!batch || batch.tenantId !== ctx.tenantId || batch.siteId !== ctx.siteId) {
		throw new Error("IMPORT_BATCH_NOT_FOUND");
	}
	return batch;
}

async function listRows(
	runtime: ImportStorageContext,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<Array<{ id: string; data: ImportStagingRow }>> {
	const result = await runtime.storage.importRows.query({
		where: { tenantId: ctx.tenantId, siteId: ctx.siteId, batchId },
		orderBy: { rowNumber: "asc" },
		limit: 5000,
	});
	return result.items;
}

async function writeImportAudit(
	runtime: ImportStorageContext,
	ctx: SikesraRequestContext,
	action: string,
	resourceId: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	await runtime.storage.auditEntries.put(`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, {
		action,
		resourceType: "import_batch",
		resourceId,
		tenantId: ctx.tenantId,
		siteId: ctx.siteId,
		actorId: ctx.userId,
		createdAt: new Date().toISOString(),
		metadata,
	});
}
