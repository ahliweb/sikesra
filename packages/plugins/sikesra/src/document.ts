import { sql } from "kysely";

import { AUDIT_ACTIONS } from "./security/audit.js";
import { maskDocumentMetadata } from "./security/masking.js";
import type { SikesraRequestContext } from "./security/request-context.js";

export type DocumentClassification = "internal" | "restricted" | "highly_restricted";
export type DocumentStatus = "pending_upload" | "uploaded" | "verified" | "rejected" | "replaced";

export interface DocumentRecord {
	tenantId: string;
	siteId: string;
	entityId?: string;
	documentType?: string;
	classification: DocumentClassification;
	originalFilename: string;
	mimeType: string;
	sizeBytes: number;
	checksumSha256?: string;
	status: DocumentStatus;
	contentKey?: string;
	uploadedBy: string;
	uploadedAt: string;
	verifiedAt?: string;
	verifiedBy?: string;
	verificationNote?: string;
	replacedById?: string;
	reason?: string;
}

export interface DocumentSummary {
	id: string;
	documentType: string;
	classification: DocumentClassification;
	originalFilename?: string;
	mimeType?: string;
	sizeBytes?: number;
	checksumSha256?: string;
	uploadedBy?: string;
	isVerified: boolean;
	uploadedAt: string;
	verificationNote?: string;
	replacedById?: string;
}

export interface UploadUrlResponse {
	uploadUrl: string;
	fileObjectId: string;
	fields?: Record<string, string>;
}

export interface GenerateUploadUrlInput {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	classification: DocumentClassification;
}

export interface CompleteUploadInput {
	fileObjectId: string;
	entityId: string;
	documentType: string;
	classification: DocumentClassification;
	checksumSha256?: string;
	contentBase64?: string;
	originalFilename?: string;
	mimeType?: string;
	sizeBytes?: number;
}

export interface DocumentVerificationInput {
	documentId: string;
	action: "verify" | "reject";
	note: string;
}

export interface DocumentReplacementInput {
	oldDocumentId: string;
	newFileObjectId: string;
	newDocumentType: string;
	newClassification: DocumentClassification;
	reason: string;
}

export interface DocumentDownloadResult {
	filename: string;
	mimeType: string;
	contentBase64: string;
	classification: DocumentClassification;
	sizeBytes: number;
}

export interface DocumentStorageContext {
	db?: unknown;
	storage: {
		documents: {
			put(id: string, data: DocumentRecord): Promise<void>;
			get(id: string): Promise<DocumentRecord | null>;
			query(options?: {
				where?: Record<string, unknown>;
				orderBy?: Record<string, "asc" | "desc">;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: DocumentRecord }> }>;
		};
		auditEntries: {
			put(id: string, data: Record<string, unknown>): Promise<void>;
		};
	};
	kv: {
		get<T>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
	};
}

const ALLOWED_MIME_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/jpg",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SAFE_FILENAME_RE = /[^a-zA-Z0-9._-]+/g;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateUploadInput(input: GenerateUploadUrlInput): string[] {
	const errors: string[] = [];
	if (!input.fileName.trim()) errors.push("Filename is required.");
	if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
		errors.push(`MIME type ${input.mimeType} is not allowed.`);
	}
	if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
		errors.push(
			`File size ${input.sizeBytes} bytes exceeds maximum allowed ${MAX_FILE_SIZE_BYTES} bytes.`,
		);
	}
	if (!["internal", "restricted", "highly_restricted"].includes(input.classification)) {
		errors.push(`Invalid classification: ${input.classification}.`);
	}
	return errors;
}

export async function generateUploadUrl(
	input: GenerateUploadUrlInput,
	ctx: SikesraRequestContext,
	runtime?: DocumentStorageContext,
): Promise<UploadUrlResponse> {
	const validationErrors = validateUploadInput(input);
	if (validationErrors.length > 0) {
		throw new Error(`UPLOAD_VALIDATION_FAILED: ${validationErrors.join("; ")}`);
	}

	const fileObjectId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	if (runtime) {
		const now = new Date().toISOString();
		const record: DocumentRecord = {
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			classification: input.classification,
			originalFilename: input.fileName.trim(),
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
			status: "pending_upload",
			uploadedBy: ctx.userId,
			uploadedAt: now,
			contentKey: buildDocumentObjectKey(fileObjectId),
		};
		await saveDocumentRecord(runtime, fileObjectId, record, ctx);
		await writeDocumentAudit(runtime, ctx, AUDIT_ACTIONS.DOCUMENT_UPLOAD, fileObjectId, {
			classification: input.classification,
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
		});
	}

	return {
		uploadUrl: `/_emdash/api/plugins/sikesra/v1/documents/${fileObjectId}/upload`,
		fileObjectId,
	};
}

export async function completeUpload(
	input: CompleteUploadInput,
	ctx: SikesraRequestContext,
	runtime: DocumentStorageContext,
): Promise<DocumentSummary> {
	const existing = await getDocumentRecord(runtime, input.fileObjectId, ctx);
	if (!existing || existing.tenantId !== ctx.tenantId || existing.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}

	const contentKey = buildDocumentObjectKey(input.fileObjectId);
	if (input.contentBase64) {
		await runtime.kv.set(contentKey, input.contentBase64);
	}

	const updated: DocumentRecord = {
		...existing,
		entityId: input.entityId,
		documentType: input.documentType,
		classification: input.classification,
		checksumSha256: input.checksumSha256,
		originalFilename: input.originalFilename ?? existing.originalFilename,
		mimeType: input.mimeType ?? existing.mimeType,
		sizeBytes: input.sizeBytes ?? existing.sizeBytes,
		status: "uploaded",
		contentKey,
	};
	await saveDocumentRecord(runtime, input.fileObjectId, updated, ctx);
	await writeDocumentAudit(runtime, ctx, AUDIT_ACTIONS.DOCUMENT_COMPLETE, input.fileObjectId, {
		entityId: input.entityId,
		documentType: input.documentType,
		classification: input.classification,
	});

	return toSummary(input.fileObjectId, updated, true);
}

export async function getEntityDocuments(
	runtime: DocumentStorageContext,
	entityId: string,
	ctx: SikesraRequestContext,
): Promise<DocumentSummary[]> {
	if (runtime.db) {
		const documents = await listEntityDocumentsFromDb(runtime.db, entityId, ctx);
		return documents.map(({ id, data }) => toSummary(id, data, true));
	}

	const result = await runtime.storage.documents.query({
		where: { tenantId: ctx.tenantId, siteId: ctx.siteId, entityId },
		orderBy: { uploadedAt: "desc" },
		limit: 100,
	});
	return result.items.map(({ id, data }) => toSummary(id, data, true));
}

export async function getDocumentDownload(
	runtime: DocumentStorageContext,
	documentId: string,
	reason: string | undefined,
	ctx: SikesraRequestContext,
): Promise<DocumentDownloadResult> {
	const document = await getDocumentRecord(runtime, documentId, ctx);
	if (!document || document.tenantId !== ctx.tenantId || document.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}
	if (document.replacedById) throw new Error("DOCUMENT_SUPERSEDED");
	if (document.classification === "highly_restricted" && !(reason ?? "").trim()) {
		throw new Error("HIGHLY_RESTRICTED_DOWNLOAD_REQUIRES_REASON");
	}
	if (!document.contentKey) throw new Error("DOCUMENT_FILE_NOT_FOUND_IN_STORAGE");

	const contentBase64 = await runtime.kv.get<string>(document.contentKey);
	if (!contentBase64) throw new Error("DOCUMENT_FILE_NOT_FOUND_IN_STORAGE");

	await writeDocumentAudit(runtime, ctx, AUDIT_ACTIONS.DOCUMENT_DOWNLOAD, documentId, {
		reason,
		classification: document.classification,
		documentType: document.documentType,
	});

	return {
		filename: document.originalFilename,
		mimeType: document.mimeType,
		contentBase64,
		classification: document.classification,
		sizeBytes: document.sizeBytes,
	};
}

export async function verifyDocument(
	runtime: DocumentStorageContext,
	input: DocumentVerificationInput,
	ctx: SikesraRequestContext,
): Promise<{ id: string; isVerified: boolean }> {
	const document = await getDocumentRecord(runtime, input.documentId, ctx);
	if (!document || document.tenantId !== ctx.tenantId || document.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}

	const updated: DocumentRecord = {
		...document,
		status: input.action === "verify" ? "verified" : "rejected",
		verifiedAt: new Date().toISOString(),
		verifiedBy: ctx.userId,
		verificationNote: input.note,
	};
	await saveDocumentRecord(runtime, input.documentId, updated, ctx);
	await writeDocumentAudit(
		runtime,
		ctx,
		input.action === "verify" ? AUDIT_ACTIONS.DOCUMENT_VERIFY : AUDIT_ACTIONS.DOCUMENT_REJECT,
		input.documentId,
		{ note: input.note },
	);

	return { id: input.documentId, isVerified: input.action === "verify" };
}

export async function replaceDocument(
	runtime: DocumentStorageContext,
	input: DocumentReplacementInput,
	ctx: SikesraRequestContext,
): Promise<{ oldDocumentId: string; newDocumentId: string }> {
	const existing = await getDocumentRecord(runtime, input.oldDocumentId, ctx);
	if (!existing || existing.tenantId !== ctx.tenantId || existing.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}
	if (existing.replacedById) throw new Error("DOCUMENT_ALREADY_SUPERSEDED");

	const replacement = await getDocumentRecord(runtime, input.newFileObjectId, ctx);
	if (!replacement || replacement.tenantId !== ctx.tenantId || replacement.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}

	await saveDocumentRecord(
		runtime,
		input.newFileObjectId,
		{
			...replacement,
			entityId: existing.entityId,
			documentType: input.newDocumentType,
			classification: input.newClassification,
			status: "uploaded",
			reason: input.reason,
		},
		ctx,
	);
	await saveDocumentRecord(
		runtime,
		input.oldDocumentId,
		{
			...existing,
			status: "replaced",
			replacedById: input.newFileObjectId,
		},
		ctx,
	);
	await writeDocumentAudit(runtime, ctx, AUDIT_ACTIONS.DOCUMENT_REPLACE, input.oldDocumentId, {
		newDocumentId: input.newFileObjectId,
		reason: input.reason,
	});

	return {
		oldDocumentId: input.oldDocumentId,
		newDocumentId: input.newFileObjectId,
	};
}

function toSummary(id: string, document: DocumentRecord, maskSensitive: boolean): DocumentSummary {
	const metadata = maskDocumentMetadata(
		{
			document_type: document.documentType,
			is_verified: document.status === "verified",
			mime_type: document.mimeType,
			size_bytes: document.sizeBytes,
		},
		{ canRevealSensitive: !maskSensitive, canRevealHighlyRestricted: !maskSensitive },
	);

	return {
		id,
		documentType: document.documentType ?? "unknown",
		classification: document.classification,
		originalFilename: document.originalFilename,
		mimeType: typeof metadata?.mime_type === "string" ? metadata.mime_type : undefined,
		sizeBytes: typeof metadata?.size_bytes === "number" ? metadata.size_bytes : undefined,
		checksumSha256: document.checksumSha256,
		uploadedBy: document.uploadedBy,
		isVerified: document.status === "verified",
		uploadedAt: document.uploadedAt,
		verificationNote: document.verificationNote,
		replacedById: document.replacedById,
	};
}

async function writeDocumentAudit(
	runtime: DocumentStorageContext,
	ctx: SikesraRequestContext,
	action: string,
	resourceId: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	await runtime.storage.auditEntries.put(
		`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		{
			action,
			resourceType: "supporting_document",
			resourceId,
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			actorId: ctx.userId,
			createdAt: new Date().toISOString(),
			metadata,
		},
	);
}

function buildDocumentObjectKey(fileObjectId: string): string {
	return `documents:file:${fileObjectId}`;
}

function buildSafeFilename(fileName: string): string {
	return fileName.trim().replaceAll(SAFE_FILENAME_RE, "-");
}

async function getDocumentRecord(
	runtime: DocumentStorageContext,
	documentId: string,
	ctx: SikesraRequestContext,
): Promise<DocumentRecord | null> {
	if (runtime.db) {
		return getDocumentRecordFromDb(runtime.db, documentId, ctx);
	}

	return runtime.storage.documents.get(documentId);
}

async function saveDocumentRecord(
	runtime: DocumentStorageContext,
	documentId: string,
	record: DocumentRecord,
	ctx: SikesraRequestContext,
): Promise<void> {
	if (runtime.db) {
		await saveDocumentRecordToDb(runtime.db, documentId, record, ctx);
		return;
	}

	await runtime.storage.documents.put(documentId, record);
}

async function getDocumentRecordFromDb(
	db: unknown,
	documentId: string,
	ctx: SikesraRequestContext,
): Promise<DocumentRecord | null> {
	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		r2_key: string;
		original_filename: string;
		mime_type: string;
		size_bytes: number;
		checksum_sha256: string | null;
		file_classification: DocumentClassification;
		document_type: string | null;
		is_verified: number;
		verified_by: string | null;
		verified_at: string | null;
		superseded_by_id: string | null;
		file_created_at: string;
		file_created_by: string | null;
		supporting_document_type: string | null;
		supporting_classification: DocumentClassification | null;
		supporting_notes: string | null;
		entity_id: string | null;
	}>`
		SELECT
			file.id,
			file.tenant_id,
			file.site_id,
			file.r2_key,
			file.original_filename,
			file.mime_type,
			file.size_bytes,
			file.checksum_sha256,
			file.classification AS file_classification,
			file.document_type,
			file.is_verified,
			file.verified_by,
			file.verified_at,
			file.superseded_by_id,
			file.created_at AS file_created_at,
			file.created_by AS file_created_by,
			doc.document_type AS supporting_document_type,
			doc.classification AS supporting_classification,
			doc.notes AS supporting_notes,
			doc.entity_id
		FROM awcms_sikesra_file_objects file
		LEFT JOIN awcms_sikesra_supporting_documents doc
			ON doc.file_object_id = file.id
			AND doc.tenant_id = file.tenant_id
			AND doc.site_id = file.site_id
			AND doc.deleted_at IS NULL
		WHERE file.tenant_id = ${ctx.tenantId}
			AND file.site_id = ${ctx.siteId}
			AND file.id = ${documentId}
			AND file.deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return null;

	return {
		tenantId: row.tenant_id,
		siteId: row.site_id,
		entityId: row.entity_id ?? undefined,
		documentType: row.supporting_document_type ?? row.document_type ?? undefined,
		classification: row.supporting_classification ?? row.file_classification,
		originalFilename: row.original_filename,
		mimeType: row.mime_type,
		sizeBytes: Number(row.size_bytes),
		checksumSha256: row.checksum_sha256 ?? undefined,
		status: mapDocumentStatus(row),
		contentKey: row.r2_key,
		uploadedBy: row.file_created_by ?? "unknown",
		uploadedAt: row.file_created_at,
		verifiedAt: row.verified_at ?? undefined,
		verifiedBy: row.verified_by ?? undefined,
		verificationNote: row.supporting_notes ?? undefined,
		replacedById: row.superseded_by_id ?? undefined,
	};
}

async function saveDocumentRecordToDb(
	db: unknown,
	documentId: string,
	record: DocumentRecord,
	ctx: SikesraRequestContext,
): Promise<void> {
	const existing = await getDocumentRecordFromDb(db, documentId, ctx);

	if (!existing) {
		await sql`
			INSERT INTO awcms_sikesra_file_objects (
				id, tenant_id, site_id, r2_key, original_filename, safe_filename,
				mime_type, size_bytes, checksum_sha256, classification, document_type,
				is_verified, verified_by, verified_at, superseded_by_id,
				created_by, updated_by
			) VALUES (
				${documentId}, ${ctx.tenantId}, ${ctx.siteId}, ${record.contentKey ?? buildDocumentObjectKey(documentId)},
				${record.originalFilename}, ${buildSafeFilename(record.originalFilename)},
				${record.mimeType}, ${record.sizeBytes}, ${record.checksumSha256 ?? null},
				${record.classification}, ${record.documentType ?? null},
				${record.status === "verified" ? 1 : 0}, ${record.verifiedBy ?? null}, ${record.verifiedAt ?? null},
				${record.replacedById ?? null}, ${ctx.userId}, ${ctx.userId}
			)
		`.execute(db as never);
		if (record.entityId && record.documentType) {
			await insertSupportingDocument(db, documentId, record, ctx);
		}
		return;
	}

	await sql`
		UPDATE awcms_sikesra_file_objects
		SET r2_key = ${record.contentKey ?? buildDocumentObjectKey(documentId)},
			original_filename = ${record.originalFilename},
			safe_filename = ${buildSafeFilename(record.originalFilename)},
			mime_type = ${record.mimeType},
			size_bytes = ${record.sizeBytes},
			checksum_sha256 = ${record.checksumSha256 ?? null},
			classification = ${record.classification},
			document_type = ${record.documentType ?? null},
			is_verified = ${record.status === "verified" ? 1 : 0},
			verified_by = ${record.verifiedBy ?? null},
			verified_at = ${record.verifiedAt ?? null},
			superseded_by_id = ${record.replacedById ?? null},
			updated_at = datetime('now'),
			updated_by = ${ctx.userId}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${documentId}
			AND deleted_at IS NULL
	`.execute(db as never);

	if (record.entityId && record.documentType) {
		await upsertSupportingDocument(db, documentId, record, ctx);
	}
	if (record.status === "replaced") {
		await updateSupportingDocumentNote(db, documentId, record.reason ?? null, ctx);
	}
	if (record.status === "rejected") {
		await updateSupportingDocumentNote(db, documentId, record.verificationNote ?? null, ctx);
	}
}

async function listEntityDocumentsFromDb(
	db: unknown,
	entityId: string,
	ctx: SikesraRequestContext,
): Promise<Array<{ id: string; data: DocumentRecord }>> {
	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		r2_key: string;
		original_filename: string;
		mime_type: string;
		size_bytes: number;
		checksum_sha256: string | null;
		file_classification: DocumentClassification;
		document_type: string | null;
		is_verified: number;
		verified_by: string | null;
		verified_at: string | null;
		superseded_by_id: string | null;
		file_created_at: string;
		file_created_by: string | null;
		supporting_document_type: string | null;
		supporting_classification: DocumentClassification | null;
		supporting_notes: string | null;
		entity_id: string;
	}>`
		SELECT
			file.id,
			file.tenant_id,
			file.site_id,
			file.r2_key,
			file.original_filename,
			file.mime_type,
			file.size_bytes,
			file.checksum_sha256,
			file.classification AS file_classification,
			file.document_type,
			file.is_verified,
			file.verified_by,
			file.verified_at,
			file.superseded_by_id,
			file.created_at AS file_created_at,
			file.created_by AS file_created_by,
			doc.document_type AS supporting_document_type,
			doc.classification AS supporting_classification,
			doc.notes AS supporting_notes,
			doc.entity_id
		FROM awcms_sikesra_supporting_documents doc
		JOIN awcms_sikesra_file_objects file
			ON file.id = doc.file_object_id
			AND file.tenant_id = doc.tenant_id
			AND file.site_id = doc.site_id
			AND file.deleted_at IS NULL
		WHERE doc.tenant_id = ${ctx.tenantId}
			AND doc.site_id = ${ctx.siteId}
			AND doc.entity_id = ${entityId}
			AND doc.deleted_at IS NULL
		ORDER BY file.created_at DESC
	`.execute(db as never);

	return result.rows.map(
		(row: {
			id: string;
			tenant_id: string;
			site_id: string;
			r2_key: string;
			original_filename: string;
			mime_type: string;
			size_bytes: number;
			checksum_sha256: string | null;
			file_classification: DocumentClassification;
			document_type: string | null;
			is_verified: number;
			verified_by: string | null;
			verified_at: string | null;
			superseded_by_id: string | null;
			file_created_at: string;
			file_created_by: string | null;
			supporting_document_type: string | null;
			supporting_classification: DocumentClassification | null;
			supporting_notes: string | null;
			entity_id: string;
		}) => ({
			id: row.id,
			data: {
				tenantId: row.tenant_id,
				siteId: row.site_id,
				entityId: row.entity_id,
				documentType: row.supporting_document_type ?? row.document_type ?? undefined,
				classification: row.supporting_classification ?? row.file_classification,
				originalFilename: row.original_filename,
				mimeType: row.mime_type,
				sizeBytes: Number(row.size_bytes),
				checksumSha256: row.checksum_sha256 ?? undefined,
				status: mapDocumentStatus(row),
				contentKey: row.r2_key,
				uploadedBy: row.file_created_by ?? "unknown",
				uploadedAt: row.file_created_at,
				verifiedAt: row.verified_at ?? undefined,
				verifiedBy: row.verified_by ?? undefined,
				verificationNote: row.supporting_notes ?? undefined,
				replacedById: row.superseded_by_id ?? undefined,
			},
		}),
	);
}

function mapDocumentStatus(row: {
	entity_id?: string | null;
	is_verified: number;
	verified_at: string | null;
	superseded_by_id: string | null;
}): DocumentStatus {
	if (row.superseded_by_id) return "replaced";
	if (row.is_verified === 1) return "verified";
	if (row.verified_at) return "rejected";
	if (row.entity_id) return "uploaded";
	return "pending_upload";
}

async function insertSupportingDocument(
	db: unknown,
	documentId: string,
	record: DocumentRecord,
	ctx: SikesraRequestContext,
): Promise<void> {
	await sql`
		INSERT INTO awcms_sikesra_supporting_documents (
			id, tenant_id, site_id, entity_id, file_object_id, document_type,
			classification, is_verified, notes, created_by, updated_by
		) VALUES (
			${documentId}, ${ctx.tenantId}, ${ctx.siteId}, ${record.entityId!}, ${documentId},
			${record.documentType!}, ${record.classification}, ${record.status === "verified" ? 1 : 0},
			${record.verificationNote ?? null}, ${ctx.userId}, ${ctx.userId}
		)
	`.execute(db as never);
}

async function upsertSupportingDocument(
	db: unknown,
	documentId: string,
	record: DocumentRecord,
	ctx: SikesraRequestContext,
): Promise<void> {
	const result = await sql<{ id: string }>`
		SELECT id
		FROM awcms_sikesra_supporting_documents
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND file_object_id = ${documentId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	if (!result.rows[0]) {
		await insertSupportingDocument(db, documentId, record, ctx);
		return;
	}

	await sql`
		UPDATE awcms_sikesra_supporting_documents
		SET entity_id = ${record.entityId!},
			document_type = ${record.documentType!},
			classification = ${record.classification},
			is_verified = ${record.status === "verified" ? 1 : 0},
			notes = ${record.verificationNote ?? null},
			updated_at = datetime('now'),
			updated_by = ${ctx.userId}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND file_object_id = ${documentId}
			AND deleted_at IS NULL
	`.execute(db as never);
}

async function updateSupportingDocumentNote(
	db: unknown,
	documentId: string,
	note: string | null,
	ctx: SikesraRequestContext,
): Promise<void> {
	await sql`
		UPDATE awcms_sikesra_supporting_documents
		SET notes = ${note},
			updated_at = datetime('now'),
			updated_by = ${ctx.userId}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND file_object_id = ${documentId}
			AND deleted_at IS NULL
	`.execute(db as never);
}
