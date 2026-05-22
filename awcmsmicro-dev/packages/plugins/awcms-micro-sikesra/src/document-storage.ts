import type { PluginStorageConfig } from "emdash";

export const SIKESRA_DOCUMENT_STORAGE_CONFIG = {
	documents: {
		indexes: ["tenantId", "siteId", "entityId", "classification", "status", "uploadedAt"] as const,
	},
} satisfies PluginStorageConfig;
