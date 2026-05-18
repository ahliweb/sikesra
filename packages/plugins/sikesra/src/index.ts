import type { PluginDescriptor } from "emdash";

import { version } from "../package.json";
export {
	completeUpload,
	generateUploadUrl,
	getDocumentDownload,
	getEntityDocuments,
	replaceDocument,
	validateUploadInput,
	verifyDocument,
} from "./document.js";
export {
	createImportBatch,
	listImportRows,
	mapAndValidateImportRows,
	parseCsvFile,
	promoteImportRows,
	rollbackImportPromotion,
	stageImportRows,
} from "./import.js";
import { SIKESRA_EXPORT_STORAGE_CONFIG } from "./export-storage.js";
import {
	SIKESRA_PLUGIN_ID,
	SIKESRA_ROUTE_NAMES,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_API_BASE,
	SIKESRA_ADMIN_BASE,
} from "./shared.js";
export {
	isPluginEnabledForValidation,
	parseEnabledPluginList,
} from "./validation-mode.js";

export {
	SIKESRA_PLUGIN_ID,
	SIKESRA_ROUTE_NAMES,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_API_BASE,
	SIKESRA_ADMIN_BASE,
} from "./shared.js";
export * from "./security/index.js";
export {
	createExportJob,
	downloadExportFile,
	generateExportFile,
	getExportJob,
	getReportById,
	getReports,
	listAvailableReports,
	listExportJobs,
	requiresReasonForReport,
} from "./export.js";
export type {
	SikesraPublicFilters,
	SikesraPublicMetadata,
	SikesraPublicSummary,
} from "./shared.js";
export type {
	CompleteUploadInput,
	DocumentClassification,
	DocumentDownloadResult,
	DocumentRecord,
	DocumentReplacementInput,
	DocumentStatus,
	DocumentStorageContext,
	DocumentSummary,
	DocumentVerificationInput,
	GenerateUploadUrlInput,
	UploadUrlResponse,
} from "./document.js";
export type {
	ImportBatch,
	ImportBatchCreateInput,
	ImportBatchStatus,
	ImportMapping,
	ImportStagingRow,
	ImportStorageContext,
	StageRowsInput,
	StagingRowStatus,
} from "./import.js";
export type {
	ExportAuditEntry,
	ExportCreateInput,
	ExportDownloadResult,
	ExportField,
	ExportFormat,
	ExportJobRecord,
	ExportJobStatus,
	ExportJobSummary,
	ExportStorageContext,
	ReportMetadata,
} from "./export.js";

export function sikesraPlugin(): PluginDescriptor {
	return {
		id: SIKESRA_PLUGIN_ID,
		version,
		format: "standard",
		entrypoint: "@ahliweb/plugin-sikesra/sandbox",
		adminPages: [
			{ path: "/", label: "Dashboard", icon: "shield" },
			{ path: "/entities", label: "Registry", icon: "list" },
			{ path: "/verification", label: "Verifikasi", icon: "check" },
			{ path: "/audit", label: "Audit", icon: "lock" },
			{ path: "/settings", label: "Pengaturan", icon: "gear" },
			{ path: "/operations", label: "Operasional", icon: "gear" },
		],
		adminWidgets: [{ id: "overview", title: "SIKESRA", size: "third" }],
		storage: SIKESRA_EXPORT_STORAGE_CONFIG,
	};
}
