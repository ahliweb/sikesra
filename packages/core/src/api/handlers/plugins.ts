/**
 * Plugin management handlers
 */

import type { Kysely } from "kysely";

import type { Database } from "../../database/types.js";
import { PluginStateRepository, type PluginState, type PluginStatus } from "../../plugins/state.js";
import type { ResolvedPlugin } from "../../plugins/types.js";
import type { ApiResult } from "../types.js";

export interface PluginInfo {
	id: string;
	name: string;
	version: string;
	package?: string;
	enabled: boolean;
	status: PluginStatus;
	source?: "config" | "marketplace";
	marketplaceVersion?: string;
	capabilities: string[];
	hasAdminPages: boolean;
	hasDashboardWidgets: boolean;
	hasHooks: boolean;
	installedAt?: string;
	activatedAt?: string;
	deactivatedAt?: string;
	/** Description of what the plugin does */
	description?: string;
	/** URL to the plugin icon on the marketplace */
	iconUrl?: string;
}

export interface PluginListResponse {
	items: PluginInfo[];
}

export interface PluginResponse {
	item: PluginInfo;
}

function marketplaceIconUrl(marketplaceUrl: string, pluginId: string): string {
	return `${marketplaceUrl}/api/v1/plugins/${encodeURIComponent(pluginId)}/icon`;
}

/**
 * Get plugin info from configured plugin and database state
 */
function buildPluginInfo(
	plugin: ResolvedPlugin,
	state: PluginState | null,
	marketplaceUrl?: string,
): PluginInfo {
	// If no state exists, plugin is considered active (default on first run)
	const status = state?.status ?? "active";
	const enabled = status === "active";
	const isMarketplace = (state?.source ?? "config") === "marketplace";

	return {
		id: plugin.id,
		name: state?.displayName || plugin.id,
		version: plugin.version,
		package: undefined, // v2 doesn't have package field
		enabled,
		status,
		source: state?.source ?? "config",
		marketplaceVersion: state?.marketplaceVersion ?? undefined,
		capabilities: plugin.capabilities,
		hasAdminPages: (plugin.admin.pages?.length ?? 0) > 0,
		hasDashboardWidgets: (plugin.admin.widgets?.length ?? 0) > 0,
		hasHooks: Object.keys(plugin.hooks ?? {}).length > 0,
		installedAt: state?.installedAt?.toISOString(),
		activatedAt: state?.activatedAt?.toISOString() ?? undefined,
		deactivatedAt: state?.deactivatedAt?.toISOString() ?? undefined,
		description: state?.description ?? undefined,
		iconUrl:
			isMarketplace && marketplaceUrl ? marketplaceIconUrl(marketplaceUrl, plugin.id) : undefined,
	};
}

/**
 * List all configured plugins with their state
 */
export async function handlePluginList(
	db: Kysely<Database>,
	configuredPlugins: ResolvedPlugin[],
	marketplaceUrl?: string,
): Promise<ApiResult<PluginListResponse>> {
	try {
		const stateRepo = new PluginStateRepository(db);
		const allStates = await stateRepo.getAll();
		const stateMap = new Map(allStates.map((s) => [s.pluginId, s]));

		const configuredIds = new Set(configuredPlugins.map((p) => p.id));

		const items = configuredPlugins.map((plugin) => {
			const state = stateMap.get(plugin.id) ?? null;
			return buildPluginInfo(plugin, state, marketplaceUrl);
		});

		// Include marketplace-installed plugins that aren't in the configured plugins list
		for (const state of allStates) {
			if (state.source !== "marketplace") continue;
			if (configuredIds.has(state.pluginId)) continue;

			items.push({
				id: state.pluginId,
				name: state.displayName || state.pluginId,
				version: state.marketplaceVersion ?? state.version,
				enabled: state.status === "active",
				status: state.status,
				source: "marketplace",
				marketplaceVersion: state.marketplaceVersion ?? undefined,
				capabilities: [],
				hasAdminPages: false,
				hasDashboardWidgets: false,
				hasHooks: false,
				installedAt: state.installedAt?.toISOString(),
				activatedAt: state.activatedAt?.toISOString() ?? undefined,
				deactivatedAt: state.deactivatedAt?.toISOString() ?? undefined,
				description: state.description ?? undefined,
				iconUrl: marketplaceUrl ? marketplaceIconUrl(marketplaceUrl, state.pluginId) : undefined,
			});
		}

		return {
			success: true,
			data: { items },
		};
	} catch {
		return {
			success: false,
			error: {
				code: "PLUGIN_LIST_ERROR",
				message: "Failed to list plugins",
			},
		};
	}
}

/**
 * Get a single plugin's info
 */
export async function handlePluginGet(
	db: Kysely<Database>,
	configuredPlugins: ResolvedPlugin[],
	pluginId: string,
	marketplaceUrl?: string,
): Promise<ApiResult<PluginResponse>> {
	try {
		const plugin = configuredPlugins.find((p) => p.id === pluginId);
		if (!plugin) {
			return {
				success: false,
				error: {
					code: "NOT_FOUND",
					message: `Plugin not found: ${pluginId}`,
				},
			};
		}

		const stateRepo = new PluginStateRepository(db);
		const state = await stateRepo.get(pluginId);

		return {
			success: true,
			data: { item: buildPluginInfo(plugin, state, marketplaceUrl) },
		};
	} catch {
		return {
			success: false,
			error: {
				code: "PLUGIN_GET_ERROR",
				message: "Failed to get plugin",
			},
		};
	}
}

/**
 * Enable a plugin
 */
export async function handlePluginEnable(
	db: Kysely<Database>,
	configuredPlugins: ResolvedPlugin[],
	pluginId: string,
): Promise<ApiResult<PluginResponse>> {
	try {
		const plugin = configuredPlugins.find((p) => p.id === pluginId);
		if (!plugin) {
			return {
				success: false,
				error: {
					code: "NOT_FOUND",
					message: `Plugin not found: ${pluginId}`,
				},
			};
		}

		const stateRepo = new PluginStateRepository(db);
		const state = await stateRepo.enable(pluginId, plugin.version);

		return {
			success: true,
			data: { item: buildPluginInfo(plugin, state) },
		};
	} catch {
		return {
			success: false,
			error: {
				code: "PLUGIN_ENABLE_ERROR",
				message: "Failed to enable plugin",
			},
		};
	}
}

/**
 * Disable a plugin
 */
export async function handlePluginDisable(
	db: Kysely<Database>,
	configuredPlugins: ResolvedPlugin[],
	pluginId: string,
): Promise<ApiResult<PluginResponse>> {
	try {
		const plugin = configuredPlugins.find((p) => p.id === pluginId);
		if (!plugin) {
			return {
				success: false,
				error: {
					code: "NOT_FOUND",
					message: `Plugin not found: ${pluginId}`,
				},
			};
		}

		const stateRepo = new PluginStateRepository(db);
		const state = await stateRepo.disable(pluginId, plugin.version);

		return {
			success: true,
			data: { item: buildPluginInfo(plugin, state) },
		};
	} catch {
		return {
			success: false,
			error: {
				code: "PLUGIN_DISABLE_ERROR",
				message: "Failed to disable plugin",
			},
		};
	}
}
