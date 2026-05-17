import { definePlugin } from "emdash";

import { buildAdminPage } from "./admin-pages.js";
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
	createExportJob,
	downloadExportFile,
	generateExportFile,
	getExportJob,
	listAvailableReports,
	listExportJobs,
	sanitizeExportJob,
	type ExportCreateInput,
	type ExportStorageContext,
} from "./export.js";
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
import { getPublicFilters, getPublicMetadata, getPublicSummary } from "./public.js";
import { AUDIT_ACTIONS, HIGH_RISK_AUDIT_REQUIRED } from "./security/audit.js";
import { SIKESRA_PERMISSION_LIST } from "./security/permissions.js";
import { buildRequestContextFromRoute } from "./security/request-context.js";
import {
	createDraft,
	updateDraft,
	autosaveDraft,
	validateEntity,
	generateSikesraId20,
	correctSikesraId20,
	type DraftCreateInput,
	type DraftUpdateInput,
	type DraftAutosaveInput,
	type CodeCorrectionInput,
} from "./services/draft.js";
import {
	archiveEntity,
	getEntityDetail,
	listEntities,
	restoreEntity,
	type EntityArchiveInput,
} from "./services/entities.js";
import { listLocalRegions, listOfficialRegions } from "./services/regions.js";
import {
	listAuditEntries,
	getAuditDetail,
	getSettings,
	updateSettings,
	type AuditListFilters,
	type SettingsUpdateInput,
} from "./services/settings.js";
import {
	submitForVerification,
	getVerificationQueue,
	makeVerificationDecision,
	getVerificationTimeline,
	type VerificationSubmitInput,
	type VerificationQueueFilters,
	type VerificationDecisionInput,
} from "./services/verification.js";
import {
	buildAdminBlocks,
	buildAdminWidget,
	getAdminPageTarget,
	type AdminInteraction,
} from "./shared.js";

export default definePlugin({
	routes: {
		admin: {
			handler: async (routeCtx: { input: AdminInteraction; request: Request }) => {
				const target = getAdminPageTarget(routeCtx.input);
				if (target === "widget:overview") return buildAdminWidget();

				// Try to use the new admin page builder with real data
				try {
					const db = await loadDb();
					const requestContext = buildRequestContextFromRoute(routeCtx);
					const inputType = routeCtx.input?.type;
					const isAction = inputType === "block_action" || inputType === "form_submit";
					const action =
						isAction && inputType
							? { type: inputType, values: routeCtx.input as Record<string, unknown> }
							: undefined;
					return await buildAdminPage(db, requestContext, target, action);
				} catch (error) {
					console.error("[sikesra] admin page build failed:", error);
					// Fall back to static blocks if DB is not available
					return buildAdminBlocks(target);
				}
			},
		},
		"public/metadata": {
			public: true,
			handler: async () => getPublicMetadata(),
		},
		"public/filters": {
			public: true,
			handler: async () => getPublicFilters(),
		},
		"public/summary": {
			public: true,
			handler: async () => getPublicSummary(),
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
		"v1/entities": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return listEntities(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeEntityListInput(routeCtx.input),
				);
			},
		},
		"v1/entities/get": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				const db = await loadDb();
				return getEntityDetail(db, buildRequestContextFromRoute(routeCtx), entityId);
			},
		},
		"v1/entities/draft": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return createDraft(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeDraftCreateInput(routeCtx.input),
				);
			},
		},
		"v1/entities/draft/update": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return updateDraft(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeDraftUpdateInput(routeCtx.input),
				);
			},
		},
		"v1/entities/draft/autosave": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return autosaveDraft(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeDraftAutosaveInput(routeCtx.input),
				);
			},
		},
		"v1/entities/validate": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				const db = await loadDb();
				return validateEntity(db, buildRequestContextFromRoute(routeCtx), entityId);
			},
		},
		"v1/entities/code/generate": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				const db = await loadDb();
				return generateSikesraId20(db, buildRequestContextFromRoute(routeCtx), entityId);
			},
		},
		"v1/entities/code/correct": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return correctSikesraId20(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeCodeCorrectionInput(routeCtx.input),
				);
			},
		},
		"v1/entities/archive": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return archiveEntity(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeEntityArchiveInput(routeCtx.input),
				);
			},
		},
		"v1/entities/restore": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return restoreEntity(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeEntityArchiveInput(routeCtx.input),
				);
			},
		},
		"v1/regions/official": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return {
					items: await listOfficialRegions(
						db,
						buildRequestContextFromRoute(routeCtx),
						normalizeOfficialRegionInput(routeCtx.input),
					),
				};
			},
		},
		"v1/regions/local": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return {
					items: await listLocalRegions(
						db,
						buildRequestContextFromRoute(routeCtx),
						normalizeLocalRegionInput(routeCtx.input),
					),
				};
			},
		},
		"v1/verification/submit": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return submitForVerification(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeVerificationSubmitInput(routeCtx.input),
				);
			},
		},
		"v1/verification/queue": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return getVerificationQueue(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeVerificationQueueFilters(routeCtx.input),
				);
			},
		},
		"v1/verification/decision": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return makeVerificationDecision(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeVerificationDecisionInput(routeCtx.input),
				);
			},
		},
		"v1/verification/timeline": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				const db = await loadDb();
				return {
					items: await getVerificationTimeline(
						db,
						buildRequestContextFromRoute(routeCtx),
						entityId,
					),
				};
			},
		},
		"v1/exports/reports": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				_ctx: ExportStorageContext & { plugin: { id: string } },
			) => ({ reports: listAvailableReports(buildRequestContextFromRoute(routeCtx)) }),
		},
		"v1/exports/jobs": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				const requestContext = buildRequestContextFromRoute(routeCtx);
				const input = asRecord(routeCtx.input);
				const status = typeof input.status === "string" ? input.status : undefined;
				const jobs = await listExportJobs(
					{ ...(ctx as ExportStorageContext), db },
					requestContext,
					status as never,
				);
				return {
					items: jobs.map(sanitizeExportJob),
				};
			},
		},
		"v1/exports/jobs/get": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				const job = await getExportJob(
					{ ...(ctx as ExportStorageContext), db },
					jobId,
					buildRequestContextFromRoute(routeCtx),
				);
				if (!job) throw new Error("EXPORT_JOB_NOT_FOUND");
				return { job: sanitizeExportJob(job) };
			},
		},
		"v1/exports/jobs/create": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				const input = normalizeExportCreateInput(routeCtx.input);
				return createExportJob(
					{ ...(ctx as ExportStorageContext), db },
					input,
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/exports/jobs/generate": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				return generateExportFile(
					{ ...(ctx as ExportStorageContext), db },
					jobId,
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/exports/jobs/download": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ExportStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				const input = asRecord(routeCtx.input);
				const jobId = typeof input.jobId === "string" ? input.jobId : "";
				if (!jobId) throw new Error("EXPORT_JOB_ID_REQUIRED");
				return downloadExportFile(
					{ ...(ctx as ExportStorageContext), db },
					jobId,
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/documents/upload-url": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				return generateUploadUrl(
					normalizeUploadInput(routeCtx.input),
					buildRequestContextFromRoute(routeCtx),
					{ ...(ctx as DocumentStorageContext), db },
				);
			},
		},
		"v1/documents/complete": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				return completeUpload(
					normalizeCompleteUploadInput(routeCtx.input),
					buildRequestContextFromRoute(routeCtx),
					{ ...(ctx as DocumentStorageContext), db },
				);
			},
		},
		"v1/entities/documents": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const input = asRecord(routeCtx.input);
				const entityId = typeof input.entityId === "string" ? input.entityId : "";
				if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
				const db = await loadDb();
				return {
					items: await getEntityDocuments(
						{ ...(ctx as DocumentStorageContext), db },
						entityId,
						buildRequestContextFromRoute(routeCtx),
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
				const db = await loadDb();
				return getDocumentDownload(
					{ ...(ctx as DocumentStorageContext), db },
					documentId,
					reason,
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/documents/verify": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				return verifyDocument(
					{ ...(ctx as DocumentStorageContext), db },
					normalizeVerificationInput(routeCtx.input),
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/documents/replace": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: DocumentStorageContext & { plugin: { id: string } },
			) => {
				const db = await loadDb();
				return replaceDocument(
					{ ...(ctx as DocumentStorageContext), db },
					normalizeReplacementInput(routeCtx.input),
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/imports/create": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) =>
				createImportBatch(
					ctx as ImportStorageContext,
					normalizeImportBatchInput(routeCtx.input),
					buildRequestContextFromRoute(routeCtx),
				),
		},
		"v1/imports/stage": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeStageRowsInput(routeCtx.input);
				return stageImportRows(
					ctx as ImportStorageContext,
					input.batchId,
					{ rows: input.rows },
					buildRequestContextFromRoute(routeCtx),
				);
			},
		},
		"v1/imports/map-validate": {
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: ImportStorageContext & { plugin: { id: string } },
			) => {
				const input = normalizeMapValidateInput(routeCtx.input);
				return mapAndValidateImportRows(
					ctx as ImportStorageContext,
					input.batchId,
					input.mapping,
					buildRequestContextFromRoute(routeCtx),
				);
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
				return {
					items: await listImportRows(
						ctx as ImportStorageContext,
						batchId,
						buildRequestContextFromRoute(routeCtx),
					),
				};
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
					buildRequestContextFromRoute(routeCtx),
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
					buildRequestContextFromRoute(routeCtx),
					input.rowIds,
				);
			},
		},
		"v1/audit": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return listAuditEntries(
					db,
					buildRequestContextFromRoute(routeCtx),
					normalizeAuditFilters(routeCtx.input),
				);
			},
		},
		"v1/audit/get": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = asRecord(routeCtx.input);
				const auditId = typeof input.auditId === "string" ? input.auditId : "";
				if (!auditId) throw new Error("AUDIT_ID_REQUIRED");
				const db = await loadDb();
				return getAuditDetail(db, buildRequestContextFromRoute(routeCtx), auditId);
			},
		},
		"v1/settings": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const db = await loadDb();
				return getSettings(db, buildRequestContextFromRoute(routeCtx));
			},
		},
		"v1/settings/update": {
			handler: async (routeCtx: { input: unknown; request: Request }) => {
				const input = normalizeSettingsUpdateInput(routeCtx.input);
				const reason = typeof input.reason === "string" ? input.reason : "";
				if (!reason) throw new Error("SETTINGS_UPDATE_REASON_REQUIRED");
				const db = await loadDb();
				const { reason: _, ...settingsInput } = input;
				return updateSettings(db, buildRequestContextFromRoute(routeCtx), settingsInput, reason);
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
	if (!fileObjectId || !entityId || !documentType)
		throw new Error("DOCUMENT_COMPLETE_INPUT_REQUIRED");
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
	const originalFilename =
		typeof input.originalFilename === "string" ? input.originalFilename : "upload.csv";
	return {
		originalFilename,
		sheetName: typeof input.sheetName === "string" ? input.sheetName : undefined,
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
					Object.entries(input.duplicateDecisions).filter(
						(entry): entry is [string, string] => typeof entry[1] === "string",
					),
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

function normalizeEntityListInput(value: unknown) {
	const input = asRecord(value);
	return {
		keyword: typeof input.keyword === "string" ? input.keyword : undefined,
		objectTypeCode: typeof input.objectTypeCode === "string" ? input.objectTypeCode : undefined,
		objectSubtypeCode:
			typeof input.objectSubtypeCode === "string" ? input.objectSubtypeCode : undefined,
		districtCode: typeof input.districtCode === "string" ? input.districtCode : undefined,
		officialVillageCode:
			typeof input.officialVillageCode === "string" ? input.officialVillageCode : undefined,
		localRegionId: typeof input.localRegionId === "string" ? input.localRegionId : undefined,
		statusData: typeof input.statusData === "string" ? input.statusData : undefined,
		statusVerification:
			typeof input.statusVerification === "string" ? input.statusVerification : undefined,
		sensitivityLevel:
			typeof input.sensitivityLevel === "string" ? input.sensitivityLevel : undefined,
		sourceInput: typeof input.sourceInput === "string" ? input.sourceInput : undefined,
		duplicateStatus: typeof input.duplicateStatus === "string" ? input.duplicateStatus : undefined,
		limit: typeof input.limit === "number" ? input.limit : undefined,
	};
}

function normalizeOfficialRegionInput(value: unknown) {
	const input = asRecord(value);
	return {
		level: typeof input.level === "string" ? input.level : undefined,
		parentCode: typeof input.parentCode === "string" ? input.parentCode : undefined,
	};
}

function normalizeLocalRegionInput(value: unknown) {
	const input = asRecord(value);
	return {
		officialVillageCode:
			typeof input.officialVillageCode === "string" ? input.officialVillageCode : undefined,
		parentId: typeof input.parentId === "string" ? input.parentId : undefined,
		level: typeof input.level === "string" ? input.level : undefined,
	};
}

async function loadDb() {
	const runtime = await import("emdash/runtime");
	return runtime.getDb();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraftCreateInput(value: unknown): DraftCreateInput {
	const input = asRecord(value);
	const objectTypeCode = typeof input.objectTypeCode === "string" ? input.objectTypeCode : "";
	const objectSubtypeCode =
		typeof input.objectSubtypeCode === "string" ? input.objectSubtypeCode : "";
	const entityKind = typeof input.entityKind === "string" ? input.entityKind : "";
	const displayName = typeof input.displayName === "string" ? input.displayName : "";
	const officialVillageCode =
		typeof input.officialVillageCode === "string" ? input.officialVillageCode : "";
	if (
		!objectTypeCode ||
		!objectSubtypeCode ||
		!entityKind ||
		!displayName ||
		!officialVillageCode
	) {
		throw new Error("DRAFT_CREATE_INPUT_REQUIRED");
	}
	return {
		objectTypeCode,
		objectSubtypeCode,
		entityKind,
		displayName,
		officialVillageCode,
		localRegionId: typeof input.localRegionId === "string" ? input.localRegionId : undefined,
		addressText: typeof input.addressText === "string" ? input.addressText : undefined,
		initialData: isPlainRecord(input.initialData) ? input.initialData : undefined,
	};
}

function normalizeDraftUpdateInput(value: unknown): DraftUpdateInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	const section = typeof input.section === "string" ? input.section : "";
	if (!entityId || !section) throw new Error("DRAFT_UPDATE_INPUT_REQUIRED");
	return {
		entityId,
		section,
		patch: isPlainRecord(input.patch) ? input.patch : {},
	};
}

function normalizeDraftAutosaveInput(value: unknown): DraftAutosaveInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	if (!entityId) throw new Error("DRAFT_AUTOSAVE_INPUT_REQUIRED");
	return {
		entityId,
		data: isPlainRecord(input.data) ? input.data : {},
	};
}

function normalizeCodeCorrectionInput(value: unknown): CodeCorrectionInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	const newCode = typeof input.newCode === "string" ? input.newCode : "";
	const reason = typeof input.reason === "string" ? input.reason : "";
	if (!entityId || !newCode || !reason) throw new Error("CODE_CORRECTION_INPUT_REQUIRED");
	return { entityId, newCode, reason };
}

function normalizeEntityArchiveInput(value: unknown): EntityArchiveInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	const reason = typeof input.reason === "string" ? input.reason : "";
	if (!entityId || !reason) throw new Error("ENTITY_ARCHIVE_INPUT_REQUIRED");
	return {
		entityId,
		reason,
		confirmed: input.confirmed === true,
	};
}

function normalizeVerificationSubmitInput(value: unknown): VerificationSubmitInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	if (!entityId) throw new Error("ENTITY_ID_REQUIRED");
	return {
		entityId,
		note: typeof input.note === "string" ? input.note : undefined,
	};
}

function normalizeVerificationQueueFilters(value: unknown): VerificationQueueFilters {
	const input = asRecord(value);
	return {
		status: typeof input.status === "string" ? input.status : undefined,
		districtCode: typeof input.districtCode === "string" ? input.districtCode : undefined,
		officialVillageCode:
			typeof input.officialVillageCode === "string" ? input.officialVillageCode : undefined,
		limit: typeof input.limit === "number" ? input.limit : undefined,
		cursor: typeof input.cursor === "string" ? input.cursor : undefined,
	};
}

function normalizeVerificationDecisionInput(value: unknown): VerificationDecisionInput {
	const input = asRecord(value);
	const entityId = typeof input.entityId === "string" ? input.entityId : "";
	const decision = ["verify", "need_revision", "reject"].includes(input.decision as string)
		? (input.decision as "verify" | "need_revision" | "reject")
		: "verify";
	const note = typeof input.note === "string" ? input.note : "";
	if (!entityId || !note) throw new Error("VERIFICATION_DECISION_INPUT_REQUIRED");
	return { entityId, decision, note };
}

function normalizeAuditFilters(value: unknown): AuditListFilters {
	const input = asRecord(value);
	return {
		action: typeof input.action === "string" ? input.action : undefined,
		resourceType: typeof input.resourceType === "string" ? input.resourceType : undefined,
		resourceId: typeof input.resourceId === "string" ? input.resourceId : undefined,
		actorId: typeof input.actorId === "string" ? input.actorId : undefined,
		success: typeof input.success === "boolean" ? input.success : undefined,
		limit: typeof input.limit === "number" ? input.limit : undefined,
		cursor: typeof input.cursor === "string" ? input.cursor : undefined,
	};
}

function normalizeSettingsUpdateInput(value: unknown): SettingsUpdateInput & { reason: string } {
	const input = asRecord(value);
	return {
		publicEnabled: typeof input.publicEnabled === "boolean" ? input.publicEnabled : undefined,
		publicTitle: typeof input.publicTitle === "string" ? input.publicTitle : undefined,
		publicDescription:
			typeof input.publicDescription === "string" ? input.publicDescription : undefined,
		dataScopeNote: typeof input.dataScopeNote === "string" ? input.dataScopeNote : undefined,
		officialContact: typeof input.officialContact === "string" ? input.officialContact : undefined,
		smallCellThreshold:
			typeof input.smallCellThreshold === "number" ? input.smallCellThreshold : undefined,
		reason: typeof input.reason === "string" ? input.reason : "",
	};
}
