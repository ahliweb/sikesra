import { sql } from "kysely";

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
	sheetName?: string;
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
	db?: unknown;
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
	sheetName?: string;
	objectTypeCode?: string;
}

export interface StageRowsInput {
	rows: Array<Record<string, unknown>>;
}

const CSV_LINE_BREAK_RE = /\r?\n/;
const VILLAGE_CODE_RE = /^\d{10}$/;

export function parseCsvFile(text: string): {
	headers: string[];
	rows: Array<Record<string, unknown>>;
} {
	const lines = text.split(CSV_LINE_BREAK_RE).filter((line) => line.trim());
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
	const batch: ImportBatch = {
		tenantId: ctx.tenantId,
		siteId: ctx.siteId,
		originalFilename: input.originalFilename.trim() || "upload.csv",
		sheetName: input.sheetName?.trim(),
		objectTypeCode: input.objectTypeCode,
		rowCount: 0,
		validRowCount: 0,
		invalidRowCount: 0,
		promotedRowCount: 0,
		status: "created",
		createdAt: now,
		updatedAt: now,
		createdBy: ctx.userId,
	};
	await saveImportBatch(runtime, id, batch, ctx);
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_CREATE, id, {
		originalFilename: input.originalFilename,
		sheetName: input.sheetName,
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
		const rowId = `row_${batchId}_${index + 1}`;
		await saveStagingRow(
			runtime,
			rowId,
			{
				batchId,
				tenantId: ctx.tenantId,
				siteId: ctx.siteId,
				rowNumber: index + 1,
				rawData: row,
				rowStatus: "pending",
			},
			ctx,
		);
	}
	const updated: ImportBatch = {
		...batch,
		rowCount: input.rows.length,
		status: "uploaded",
		updatedAt: now,
	};
	await saveImportBatch(runtime, batchId, updated, ctx);
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
		await saveStagingRow(
			runtime,
			row.id,
			{
				...row.data,
				mappedData,
				validationErrors,
				duplicateRisk,
				rowStatus,
			},
			ctx,
		);
	}

	const updated: ImportBatch = {
		...batch,
		validRowCount,
		invalidRowCount,
		status: "validated",
		updatedAt: new Date().toISOString(),
	};
	await saveImportBatch(runtime, batchId, updated, ctx);
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
				await saveStagingRow(runtime, row.id, { ...row.data, rowStatus: "skipped" }, ctx);
				continue;
			}
		}
		if (!row.data.mappedData) {
			skipped++;
			await saveStagingRow(runtime, row.id, { ...row.data, rowStatus: "failed" }, ctx);
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
		if (runtime.db) {
			await promoteRowToD1Entity(runtime.db, entityId, batchId, row.data.mappedData, ctx);
		}
		await saveStagingRow(
			runtime,
			row.id,
			{
				...row.data,
				rowStatus: "promoted",
				promotedEntityId: entityId,
			},
			ctx,
		);
		promoted++;
	}

	const updated: ImportBatch = {
		...batch,
		promotedRowCount: batch.promotedRowCount + promoted,
		status: promoted > 0 ? "promoted" : batch.status,
		updatedAt: new Date().toISOString(),
	};
	await saveImportBatch(runtime, batchId, updated, ctx);
	await writeImportAudit(runtime, ctx, AUDIT_ACTIONS.IMPORT_PROMOTE, batchId, {
		promoted,
		skipped,
	});
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
		await saveStagingRow(
			runtime,
			row.id,
			{
				...row.data,
				rowStatus: "valid",
				promotedEntityId: undefined,
			},
			ctx,
		);
		rolledBack++;
	}

	const updated: ImportBatch = {
		...batch,
		promotedRowCount: Math.max(0, batch.promotedRowCount - rolledBack),
		status: batch.promotedRowCount - rolledBack > 0 ? "promoted" : "validated",
		updatedAt: new Date().toISOString(),
	};
	await saveImportBatch(runtime, batchId, updated, ctx);
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
	} else if (!VILLAGE_CODE_RE.test(villageCode)) {
		errors.officialVillageCode = ["Kode desa/kelurahan resmi harus 10 digit."];
	}
	return Object.keys(errors).length ? errors : undefined;
}

function detectDuplicateRisk(
	mappedData: Record<string, unknown>,
	seenSignatures: Set<string>,
): "low" | "high" | "blocking" {
	const displayName = String(mappedData.displayName ?? "")
		.trim()
		.toLowerCase();
	const villageCode = String(mappedData.officialVillageCode ?? "").trim();
	if (!displayName || !villageCode) return "low";
	return seenSignatures.has(buildDuplicateSignature(mappedData)) ? "blocking" : "low";
}

function buildDuplicateSignature(mappedData: Record<string, unknown>): string {
	return `${String(mappedData.displayName ?? "")
		.trim()
		.toLowerCase()}::${String(mappedData.officialVillageCode ?? "").trim()}`;
}

async function requireBatch(
	runtime: ImportStorageContext,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<ImportBatch> {
	const batch = runtime.db
		? await getImportBatchFromDb(runtime.db, batchId, ctx)
		: await runtime.storage.importBatches.get(batchId);
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
	if (runtime.db) {
		return listStagingRowsFromDb(runtime.db, batchId, ctx);
	}

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
	if (runtime.db) {
		await writeImportAuditToDb(runtime.db, ctx, action, resourceId, metadata);
		return;
	}

	await runtime.storage.auditEntries.put(
		`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		{
			action,
			resourceType: "import_batch",
			resourceId,
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			actorId: ctx.userId,
			createdAt: new Date().toISOString(),
			metadata,
		},
	);
}

async function saveImportBatch(
	runtime: ImportStorageContext,
	batchId: string,
	batch: ImportBatch,
	_ctx: SikesraRequestContext,
): Promise<void> {
	if (runtime.db) {
		await saveImportBatchToDb(runtime.db, batchId, batch);
		return;
	}

	await runtime.storage.importBatches.put(batchId, batch);
}

async function saveStagingRow(
	runtime: ImportStorageContext,
	rowId: string,
	row: ImportStagingRow,
	_ctx: SikesraRequestContext,
): Promise<void> {
	if (runtime.db) {
		await saveStagingRowToDb(runtime.db, rowId, row);
		return;
	}

	await runtime.storage.importRows.put(rowId, row);
}

async function saveImportBatchToDb(
	db: unknown,
	batchId: string,
	batch: ImportBatch,
): Promise<void> {
	await sql`
		INSERT INTO awcms_sikesra_import_batches (
			id, tenant_id, site_id, r2_key, original_filename, sheet_name,
			row_count, valid_row_count, invalid_row_count, promoted_row_count,
			status, object_type_code, created_at, updated_at, created_by, updated_by
		) VALUES (
			${batchId}, ${batch.tenantId}, ${batch.siteId}, '',
			${batch.originalFilename}, ${batch.sheetName ?? null},
			${batch.rowCount}, ${batch.validRowCount}, ${batch.invalidRowCount}, ${batch.promotedRowCount},
			${batch.status}, ${batch.objectTypeCode ?? null}, ${batch.createdAt}, ${batch.updatedAt},
			${batch.createdBy}, ${batch.createdBy}
		)
		ON CONFLICT(id) DO UPDATE SET
			row_count = excluded.row_count,
			valid_row_count = excluded.valid_row_count,
			invalid_row_count = excluded.invalid_row_count,
			promoted_row_count = excluded.promoted_row_count,
			status = excluded.status,
			sheet_name = excluded.sheet_name,
			updated_at = excluded.updated_at,
			updated_by = excluded.updated_by
	`.execute(db as never);
}

async function getImportBatchFromDb(
	db: unknown,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<ImportBatch | null> {
	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		original_filename: string;
		sheet_name: string | null;
		row_count: number;
		valid_row_count: number;
		invalid_row_count: number;
		promoted_row_count: number;
		status: string;
		object_type_code: string | null;
		created_at: string;
		updated_at: string;
		created_by: string | null;
	}>`
		SELECT id, tenant_id, site_id, original_filename, sheet_name,
			row_count, valid_row_count, invalid_row_count, promoted_row_count,
			status, object_type_code, created_at, updated_at, created_by
		FROM awcms_sikesra_import_batches
		WHERE id = ${batchId}
			AND tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return null;

	return {
		tenantId: row.tenant_id,
		siteId: row.site_id,
		originalFilename: row.original_filename,
		sheetName: row.sheet_name ?? undefined,
		objectTypeCode: row.object_type_code ?? undefined,
		rowCount: row.row_count,
		validRowCount: row.valid_row_count,
		invalidRowCount: row.invalid_row_count,
		promotedRowCount: row.promoted_row_count,
		status: row.status as ImportBatchStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		createdBy: row.created_by ?? "",
	};
}

async function saveStagingRowToDb(
	db: unknown,
	rowId: string,
	row: ImportStagingRow,
): Promise<void> {
	await sql`
		INSERT INTO awcms_sikesra_import_staging_rows (
			id, tenant_id, site_id, batch_id, row_number, raw_data_json,
			mapped_data_json, validation_errors_json, row_status, duplicate_risk,
			created_at, updated_at, created_by, updated_by
		) VALUES (
			${rowId}, ${row.tenantId}, ${row.siteId}, ${row.batchId}, ${row.rowNumber},
			${JSON.stringify(row.rawData)}, ${row.mappedData ? JSON.stringify(row.mappedData) : null},
			${row.validationErrors ? JSON.stringify(row.validationErrors) : null},
			${row.rowStatus}, ${row.duplicateRisk ?? null},
			datetime('now'), datetime('now'), ${row.tenantId}, ${row.tenantId}
		)
		ON CONFLICT(id) DO UPDATE SET
			mapped_data_json = excluded.mapped_data_json,
			validation_errors_json = excluded.validation_errors_json,
			row_status = excluded.row_status,
			duplicate_risk = excluded.duplicate_risk,
			updated_at = excluded.updated_at,
			updated_by = excluded.updated_by
	`.execute(db as never);
}

async function listStagingRowsFromDb(
	db: unknown,
	batchId: string,
	ctx: SikesraRequestContext,
): Promise<Array<{ id: string; data: ImportStagingRow }>> {
	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		batch_id: string;
		row_number: number;
		raw_data_json: string | null;
		mapped_data_json: string | null;
		validation_errors_json: string | null;
		row_status: string;
		duplicate_risk: string | null;
	}>`
		SELECT id, tenant_id, site_id, batch_id, row_number, raw_data_json,
			mapped_data_json, validation_errors_json, row_status, duplicate_risk
		FROM awcms_sikesra_import_staging_rows
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND batch_id = ${batchId}
			AND deleted_at IS NULL
		ORDER BY row_number ASC
	`.execute(db as never);

	return result.rows.map((row) => ({
		id: row.id,
		data: {
			batchId: row.batch_id,
			tenantId: row.tenant_id,
			siteId: row.site_id,
			rowNumber: row.row_number,
			rawData: row.raw_data_json ? JSON.parse(row.raw_data_json) : {},
			mappedData: row.mapped_data_json ? JSON.parse(row.mapped_data_json) : undefined,
			validationErrors: row.validation_errors_json
				? JSON.parse(row.validation_errors_json)
				: undefined,
			rowStatus: row.row_status as StagingRowStatus,
			duplicateRisk: (row.duplicate_risk as "low" | "medium" | "high" | "blocking") ?? undefined,
		},
	}));
}

async function writeImportAuditToDb(
	db: unknown,
	ctx: SikesraRequestContext,
	action: string,
	resourceId: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	await sql`
		INSERT INTO awcms_sikesra_audit_logs (
			id, tenant_id, site_id, actor_id, action, resource_type, resource_id,
			after_json, created_at
		) VALUES (
			${id}, ${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId}, ${action},
			'import_batch', ${resourceId},
			${metadata ? JSON.stringify(metadata) : null},
			datetime('now')
		)
	`.execute(db as never);
}

async function promoteRowToD1Entity(
	db: unknown,
	entityId: string,
	batchId: string,
	mappedData: Record<string, unknown>,
	ctx: SikesraRequestContext,
): Promise<void> {
	const displayName = String(mappedData.displayName ?? "").trim() || "Imported Entity";
	const officialVillageCode = String(mappedData.officialVillageCode ?? "").trim();
	const objectTypeCode = String(mappedData.objectTypeCode ?? "").trim() || "unknown";
	const objectSubtypeCode = String(mappedData.objectSubtypeCode ?? "").trim() || "unknown";
	const entityKind = String(mappedData.entityKind ?? "").trim() || "imported";

	await sql`
		INSERT INTO awcms_sikesra_entities (
			id, tenant_id, site_id, object_type_code, object_subtype_code,
			entity_kind, display_name, official_village_code,
			status_data, status_verification, sensitivity_level,
			completeness_percent, source_input, created_by, updated_by,
			created_at, updated_at
		) VALUES (
			${entityId}, ${ctx.tenantId}, ${ctx.siteId}, ${objectTypeCode},
			${objectSubtypeCode}, ${entityKind}, ${displayName},
			${officialVillageCode || null},
			'active', 'draft', 'internal',
			50, 'import', ${ctx.userId}, ${ctx.userId},
			datetime('now'), datetime('now')
		)
	`.execute(db as never);

	await sql`
		INSERT INTO awcms_sikesra_audit_logs (
			id, tenant_id, site_id, actor_id, action, resource_type, resource_id,
			after_json, created_at
		) VALUES (
			${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
			${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId}, 'import.promote',
			'entity', ${entityId},
			${JSON.stringify({ batchId, displayName, objectTypeCode })},
			datetime('now')
		)
	`.execute(db as never);
}
