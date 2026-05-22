import type { PluginStorageConfig } from "emdash";

export type SikesraExportStorage = PluginStorageConfig & {
	exportJobs: {
		indexes: ["tenantId", "siteId", "status", "reportType", "createdAt"];
	};
	documents: {
		indexes: ["tenantId", "siteId", "entityId", "classification", "status", "uploadedAt"];
	};
	importBatches: {
		indexes: ["tenantId", "siteId", "status", "createdAt"];
	};
	importRows: {
		indexes: ["tenantId", "siteId", "batchId", "rowStatus", "rowNumber"];
	};
	promotedEntities: {
		indexes: ["tenantId", "siteId", "batchId", "sourceInput"];
	};
	auditEntries: {
		indexes: ["tenantId", "siteId", "action", "resourceType", "createdAt"];
	};
};

export const SIKESRA_EXPORT_STORAGE_CONFIG = {
	exportJobs: {
		indexes: ["tenantId", "siteId", "status", "reportType", "createdAt"] as const,
	},
	documents: {
		indexes: ["tenantId", "siteId", "entityId", "classification", "status", "uploadedAt"] as const,
	},
	importBatches: {
		indexes: ["tenantId", "siteId", "status", "createdAt"] as const,
	},
	importRows: {
		indexes: ["tenantId", "siteId", "batchId", "rowStatus", "rowNumber"] as const,
	},
	promotedEntities: {
		indexes: ["tenantId", "siteId", "batchId", "sourceInput"] as const,
	},
	auditEntries: {
		indexes: ["tenantId", "siteId", "action", "resourceType", "createdAt"] as const,
	},
} satisfies PluginStorageConfig;
