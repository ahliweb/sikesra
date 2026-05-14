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

const ALLOWED_MIME_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/jpg",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateUploadInput(input: GenerateUploadUrlInput): string[] {
	const errors: string[] = [];
	if (!input.fileName.trim()) errors.push("Filename is required.");
	if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
		errors.push(`MIME type ${input.mimeType} is not allowed.`);
	}
	if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
		errors.push(`File size ${input.sizeBytes} bytes exceeds maximum allowed ${MAX_FILE_SIZE_BYTES} bytes.`);
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
		await runtime.storage.documents.put(fileObjectId, {
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			classification: input.classification,
			originalFilename: input.fileName.trim(),
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
			status: "pending_upload",
			uploadedBy: ctx.userId,
			uploadedAt: now,
		});
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
	const existing = await runtime.storage.documents.get(input.fileObjectId);
	if (!existing || existing.tenantId !== ctx.tenantId || existing.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}

	const contentKey = `documents:file:${input.fileObjectId}`;
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
	await runtime.storage.documents.put(input.fileObjectId, updated);
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
	const document = await runtime.storage.documents.get(documentId);
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
	const document = await runtime.storage.documents.get(input.documentId);
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
	await runtime.storage.documents.put(input.documentId, updated);
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
	const existing = await runtime.storage.documents.get(input.oldDocumentId);
	if (!existing || existing.tenantId !== ctx.tenantId || existing.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}
	if (existing.replacedById) throw new Error("DOCUMENT_ALREADY_SUPERSEDED");

	const replacement = await runtime.storage.documents.get(input.newFileObjectId);
	if (!replacement || replacement.tenantId !== ctx.tenantId || replacement.siteId !== ctx.siteId) {
		throw new Error("DOCUMENT_NOT_FOUND");
	}

	await runtime.storage.documents.put(input.newFileObjectId, {
		...replacement,
		entityId: existing.entityId,
		documentType: input.newDocumentType,
		classification: input.newClassification,
		status: "uploaded",
		reason: input.reason,
	});
	await runtime.storage.documents.put(input.oldDocumentId, {
		...existing,
		status: "replaced",
		replacedById: input.newFileObjectId,
	});
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
	await runtime.storage.auditEntries.put(`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, {
		action,
		resourceType: "supporting_document",
		resourceId,
		tenantId: ctx.tenantId,
		siteId: ctx.siteId,
		actorId: ctx.userId,
		createdAt: new Date().toISOString(),
		metadata,
	});
}
