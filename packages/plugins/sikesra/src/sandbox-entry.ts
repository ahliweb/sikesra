import { definePlugin } from "emdash";

import {
	completeUpload,
	generateUploadUrl,
	getDocumentDownload,
	getEntityDocuments,
	replaceDocument,
	verifyDocument,
	type CompleteUploadInput,
	type DocumentReplacementInput,
	type DocumentStorageContext,
	type DocumentVerificationInput,
	type GenerateUploadUrlInput,
} from "./document.js";
import {
	createImportBatch,
	listImportRows,
	mapAndValidateImportRows,
	parseCsvFile,
	promoteImportRows,
	rollbackImportPromotion,
	stageImportRows,
	type ImportBatchCreateInput,
	type ImportMapping,
	type ImportStorageContext,
	type StageRowsInput,
} from "./import.js";
import {
	createExportJob,
	downloadExportFile,
	generateExportFile,
	getExportJob,
	listAvailableReports,
	listExportJobs,
	type ExportCreateInput,
	type ExportStorageContext,
} from "./export.js";
import { AUDIT_ACTIONS, HIGH_RISK_AUDIT_REQUIRED } from "./security/audit.js";
import { SIKESRA_PERMISSION_LIST } from "./security/permissions.js";
import {
	buildAdminBlocks,
	buildAdminWidget,
	buildPublicFilters,
	buildPublicMetadata,
	buildPublicSummary,
	getAdminPageTarget,
	type AdminInteraction,
} from "./shared.js";

export default definePlugin({
	routes: {
		admin: {
			handler: async (routeCtx: { input: AdminInteraction }) => {
				const target = getAdminPageTarget(routeCtx.input);
				return target === "widget:overview" ? buildAdminWidget() : buildAdminBlocks(target);
			},
		},
		"public/metadata": {
			public: true,
			handler: async () => buildPublicMetadata(),
		},
		"public/filters": {
			public: true,
			handler: async () => buildPublicFilters(),
		},
		"public/summary": {
			public: true,
			handler: async () => buildPublicSummary(),
		},
		"v1/status": {
			handler: async () => ({
				status: "rebuild-pending",
				message:
					"The SIKESRA shell is mounted. Data, policy, and operational endpoints will be restored in follow-up issues.",
			}),
		},
		"v1/security/manifest": {
			handler: async () => ({
				permissions: SIKESRA_PERMISSION_LIST,
				highRiskAuditActions: [...HIGH_RISK_AUDIT_REQUIRED],
				auditActions: AUDIT_ACTIONS,
			}),
		},
		"v1/exports/reports": {
			handler: async (
				_routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => ({ reports: listAvailableReports(buildPluginRequestContext(ctx)) }),
		},
		"v1/exports/jobs": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const requestContext = buildPluginRequestContext(ctx);
				const input = asRecord(routeCtx.input);
				const status = typeof input.status === "string" ? input.status : undefined;
				return { items: await listExportJobs(ctx as ExportStorageContext, requestContext, status as never) };
			},
		},
		"v1/exports/jobs/get": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				const job = await getExportJob(ctx as ExportStorageContext, jobId, buildPluginRequestContext(ctx));
				if (!job) throw new Error("EXPORT_JOB_NOT_FOUND");
				return { job };
			},
		},
		"v1/exports/jobs/create": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeExportCreateInput(routeCtx.input);
				return createExportJob(ctx as ExportStorageContext, input, buildPluginRequestContext(ctx));
			},
		},
		"v1/exports/jobs/generate": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				return generateExportFile(ctx as ExportStorageContext, jobId, buildPluginRequestContext(ctx));
			},
		},
		"v1/exports/jobs/download": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				return downloadExportFile(ctx as ExportStorageContext, jobId, buildPluginRequestContext(ctx));
			},
		},
		"v1/documents/upload-url": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) =>
				generateUploadUrl(
					normalizeUploadInput(routeCtx.input),
					buildPluginRequestContext(ctx),
					ctx as DocumentStorageContext,
				),
		},
		"v1/documents/complete": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) =>
				completeUpload(
					normalizeCompleteUploadInput(routeCtx.input),
					buildPluginRequestContext(ctx),
					ctx as DocumentStorageContext,
				),
		},
		"v1/entities/documents": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				return {
					items: await getEntityDocuments(
						ctx as DocumentStorageContext,
						entityId,
						buildPluginRequestContext(ctx),
					),
				};
			},
		},
		"v1/documents/download": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const documentId = typeof input.documentId === "string" ? input.documentId : "";
				if (!documentId) throw new Error("DOCUMENT_ID_REQUIRED");
				const reason = typeof input.reason === "string" ? input.reason : undefined;
				return getDocumentDownload(
					ctx as DocumentStorageContext,
					documentId,
					reason,
					buildPluginRequestContext(ctx),
				);
			},
		},
		"v1/documents/verify": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) =>
				verifyDocument(
					ctx as DocumentStorageContext,
					normalizeVerificationInput(routeCtx.input),
					buildPluginRequestContext(ctx),
				),
		},
		"v1/documents/replace": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) =>
				replaceDocument(
					ctx as DocumentStorageContext,
					normalizeReplacementInput(routeCtx.input),
					buildPluginRequestContext(ctx),
				),
		},
		"v1/imports/create": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => createImportBatch(ctx as ImportStorageContext, normalizeImportBatchInput(routeCtx.input), buildPluginRequestContext(ctx)),
		},
		"v1/imports/stage": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeStageRowsInput(routeCtx.input);
				return stageImportRows(ctx as ImportStorageContext, input.batchId, { rows: input.rows }, buildPluginRequestContext(ctx));
			},
		},
		"v1/imports/map-validate": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeMapValidateInput(routeCtx.input);
				return mapAndValidateImportRows(ctx as ImportStorageContext, input.batchId, input.mapping, buildPluginRequestContext(ctx));
			},
		},
		"v1/imports/rows": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const batchId = typeof input.batchId === "string" ? input.batchId : "";
				if (!batchId) throw new Error("IMPORT_BATCH_ID_REQUIRED");
				return { items: await listImportRows(ctx as ImportStorageContext, batchId, buildPluginRequestContext(ctx)) };
			},
		},
		"v1/imports/promote": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizePromoteInput(routeCtx.input);
				return promoteImportRows(
					ctx as ImportStorageContext,
					input.batchId,
					input.rowIds,
					input.duplicateDecisions,
					buildPluginRequestContext(ctx),
				);
			},
		},
		"v1/imports/rollback": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeRollbackInput(routeCtx.input);
				return rollbackImportPromotion(
					ctx as ImportStorageContext,
					input.batchId,
					buildPluginRequestContext(ctx),
					input.rowIds,
				);
			},
		},
	},
});

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeExportCreateInput(value: unknown): ExportCreateInput {
	const input = asRecord(value);
	const reportType = typeof input.reportType === "string" ? input.reportType : "";
	if (!reportType) throw new Error("INVALID_REPORT_KEY");
	return {
		reportType,
		format: "csv",
		reason: typeof input.reason === "string" ? input.reason : undefined,
		filters: isPlainRecord(input.filters) ? input.filters : undefined,
		fields: Array.isArray(input.fields)
			? input.fields.filter((field): field is string => typeof field === "string")
			: undefined,
	};
}

function normalizeUploadInput(value: unknown): GenerateUploadUrlInput {
	const input = asRecord(value);
	return {
		fileName: typeof input.fileName === "string" ? input.fileName : "",
		mimeType: typeof input.mimeType === "string" ? input.mimeType : "",
		sizeBytes: typeof input.sizeBytes === "number" ? input.sizeBytes : 0,
		classification:
			typeof input.classification === "string"
				? (input.classification as GenerateUploadUrlInput["classification"])
				: "internal",
	};
}

function normalizeCompleteUploadInput(value: unknown): CompleteUploadInput {
	const input = asRecord(value);
	const fileObjectId = typeof input.fileObjectId === "string" ? input.fileObjectId : "";
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	const documentType = typeof input.documentType === "string" ? input.documentType : "";
	if (!fileObjectId || !entityId || !documentType) throw new Error("DOCUMENT_COMPLETE_INPUT_REQUIRED");
	return {
		fileObjectId,
		entityId,
		documentType,
		classification:
			typeof input.classification === "string"
				? (input.classification as CompleteUploadInput["classification"])
				: "internal",
		checksumSha256: typeof input.checksumSha256 === "string" ? input.checksumSha256 : undefined,
		contentBase64: typeof input.contentBase64 === "string" ? input.contentBase64 : undefined,
		originalFilename:
			typeof input.originalFilename === "string" ? input.originalFilename : undefined,
		mimeType: typeof input.mimeType === "string" ? input.mimeType : undefined,
		sizeBytes: typeof input.sizeBytes === "number" ? input.sizeBytes : undefined,
	};
}

function normalizeVerificationInput(value: unknown): DocumentVerificationInput {
	const input = asRecord(value);
	const documentId = typeof input.documentId === "string" ? input.documentId : "";
	const note = typeof input.note === "string" ? input.note : "";
	const action = input.action === "reject" ? "reject" : "verify";
	if (!documentId || !note) throw new Error("DOCUMENT_VERIFICATION_INPUT_REQUIRED");
	return { documentId, note, action };
}

function normalizeReplacementInput(value: unknown): DocumentReplacementInput {
	const input = asRecord(value);
	const oldDocumentId = typeof input.oldDocumentId === "string" ? input.oldDocumentId : "";
	const newFileObjectId = typeof input.newFileObjectId === "string" ? input.newFileObjectId : "";
	const newDocumentType = typeof input.newDocumentType === "string" ? input.newDocumentType : "";
	const reason = typeof input.reason === "string" ? input.reason : "";
	if (!oldDocumentId || !newFileObjectId || !newDocumentType || !reason) {
		throw new Error("DOCUMENT_REPLACEMENT_INPUT_REQUIRED");
	}
	return {
		oldDocumentId,
		newFileObjectId,
		newDocumentType,
		newClassification:
			typeof input.newClassification === "string"
				? (input.newClassification as DocumentReplacementInput["newClassification"])
				: "internal",
		reason,
	};
}

function normalizeImportBatchInput(value: unknown): ImportBatchCreateInput {
	const input = asRecord(value);
	const originalFilename = typeof input.originalFilename === "string" ? input.originalFilename : "upload.csv";
	return {
		originalFilename,
		objectTypeCode: typeof input.objectTypeCode === "string" ? input.objectTypeCode : undefined,
	};
}

function normalizeStageRowsInput(value: unknown): StageRowsInput & { batchId: string } {
	const input = asRecord(value);
	const batchId = typeof input.batchId === "string" ? input.batchId : "";
	if (!batchId) throw new Error("IMPORT_BATCH_ID_REQUIRED");
	if (Array.isArray(input.rows)) {
		return {
			batchId,
			rows: input.rows.filter(isPlainRecord),
		};
	}
	if (typeof input.csvContent === "string") {
		return {
			batchId,
			rows: parseCsvFile(input.csvContent).rows,
		};
	}
	throw new Error("IMPORT_ROWS_REQUIRED");
}

function normalizeMapValidateInput(value: unknown): { batchId: string; mapping: ImportMapping[] } {
	const input = asRecord(value);
	const batchId = typeof input.batchId === "string" ? input.batchId : "";
	if (!batchId) throw new Error("IMPORT_BATCH_ID_REQUIRED");
	const mapping = Array.isArray(input.mapping)
		? input.mapping.filter(isPlainRecord).map((item) => ({
				sourceColumn: typeof item.sourceColumn === "string" ? item.sourceColumn : "",
				targetField: typeof item.targetField === "string" ? item.targetField : "",
				defaultValue: typeof item.defaultValue === "string" ? item.defaultValue : undefined,
			}))
		: [];
	if (mapping.length === 0 || mapping.some((item) => !item.sourceColumn || !item.targetField)) {
		throw new Error("IMPORT_MAPPING_REQUIRED");
	}
	return { batchId, mapping };
}

function normalizePromoteInput(value: unknown): {
	batchId: string;
	rowIds: string[];
	duplicateDecisions: Record<string, string>;
} {
	const input = asRecord(value);
	const batchId = typeof input.batchId === "string" ? input.batchId : "";
	const rowIds = Array.isArray(input.rowIds)
		? input.rowIds.filter((rowId): rowId is string => typeof rowId === "string")
		: [];
	if (!batchId || rowIds.length === 0) throw new Error("IMPORT_PROMOTION_INPUT_REQUIRED");
	return {
		batchId,
		rowIds,
		duplicateDecisions: isPlainRecord(input.duplicateDecisions)
			? Object.fromEntries(
					Object.entries(input.duplicateDecisions).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
				)
			: {},
	};
}

function normalizeRollbackInput(value: unknown): { batchId: string; rowIds?: string[] } {
	const input = asRecord(value);
	const batchId = typeof input.batchId === "string" ? input.batchId : "";
	if (!batchId) throw new Error("IMPORT_BATCH_ID_REQUIRED");
	return {
		batchId,
		rowIds: Array.isArray(input.rowIds)
			? input.rowIds.filter((rowId): rowId is string => typeof rowId === "string")
			: undefined,
	};
}

function buildPluginRequestContext(ctx: {
	plugin: { id: string };
	kv: { get<T>(key: string): Promise<T | null> };
}): import("./security/request-context.js").SikesraRequestContext {
	void ctx.plugin.id;
	return {
		requestId: `plugin_${Date.now()}`,
		tenantId: "plugin-tenant",
		siteId: "plugin-site",
		userId: "plugin-user",
		roles: ["admin"],
		permissions: [...SIKESRA_PERMISSION_LIST],
		subjectAttributes: {},
		regionScope: {},
		nowIso: new Date().toISOString(),
	};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
