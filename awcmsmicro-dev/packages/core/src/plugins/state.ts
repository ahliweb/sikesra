/**
 * Plugin State Repository
 *
 * Database-backed storage for plugin activation state.
 * Used by the admin API to persist plugin enable/disable across restarts.
 */

import type { Kysely } from "kysely";

import type { Database } from "../database/types.js";

export type PluginStatus = "active" | "inactive";
export type PluginSource = "config" | "marketplace";

function toPluginStatus(value: string): PluginStatus {
	if (value === "active") return "active";
	return "inactive";
}

function toPluginSource(value: string | undefined | null): PluginSource {
	if (value === "marketplace") return "marketplace";
	return "config";
}

export interface PluginState {
	pluginId: string;
	status: PluginStatus;
	version: string;
	installedAt: Date;
	activatedAt: Date | null;
	deactivatedAt: Date | null;
	source: PluginSource;
	marketplaceVersion: string | null;
	displayName: string | null;
	description: string | null;
}

/**
 * Repository for plugin state in the database
 */
export class PluginStateRepository {
	constructor(private db: Kysely<Database>) {}

	/**
	 * Get state for a specific plugin
	 */
	async get(pluginId: string): Promise<PluginState | null> {
		const row = await this.db
			.selectFrom("_plugin_state")
			.selectAll()
			.where("plugin_id", "=", pluginId)
			.executeTakeFirst();

		if (!row) return null;

		return {
			pluginId: row.plugin_id,
			status: toPluginStatus(row.status),
			version: row.version,
			installedAt: new Date(row.installed_at),
			activatedAt: row.activated_at ? new Date(row.activated_at) : null,
			deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : null,
			source: toPluginSource(row.source),
			marketplaceVersion: row.marketplace_version ?? null,
			displayName: row.display_name ?? null,
			description: row.description ?? null,
		};
	}

	/**
	 * Get all plugin states
	 */
	async getAll(): Promise<PluginState[]> {
		const rows = await this.db.selectFrom("_plugin_state").selectAll().execute();

		return rows.map((row) => ({
			pluginId: row.plugin_id,
			status: toPluginStatus(row.status),
			version: row.version,
			installedAt: new Date(row.installed_at),
			activatedAt: row.activated_at ? new Date(row.activated_at) : null,
			deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : null,
			source: toPluginSource(row.source),
			marketplaceVersion: row.marketplace_version ?? null,
			displayName: row.display_name ?? null,
			description: row.description ?? null,
		}));
	}

	/**
	 * Get all marketplace-installed plugin states
	 */
	async getMarketplacePlugins(): Promise<PluginState[]> {
		const rows = await this.db
			.selectFrom("_plugin_state")
			.selectAll()
			.where("source", "=", "marketplace")
			.execute();

		return rows.map((row) => ({
			pluginId: row.plugin_id,
			status: toPluginStatus(row.status),
			version: row.version,
			installedAt: new Date(row.installed_at),
			activatedAt: row.activated_at ? new Date(row.activated_at) : null,
			deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : null,
			source: toPluginSource(row.source),
			marketplaceVersion: row.marketplace_version ?? null,
			displayName: row.display_name ?? null,
			description: row.description ?? null,
		}));
	}

	/**
	 * Create or update plugin state
	 */
	async upsert(
		pluginId: string,
		version: string,
		status: PluginStatus,
		opts?: {
			source?: PluginSource;
			marketplaceVersion?: string;
			displayName?: string;
			description?: string;
		},
	): Promise<PluginState> {
		const now = new Date().toISOString();
		const existing = await this.get(pluginId);

		if (existing) {
			// Update existing state
			const updates: Record<string, string | null> = {
				status,
				version,
			};

			if (status === "active" && existing.status !== "active") {
				updates.activated_at = now;
			} else if (status === "inactive" && existing.status !== "inactive") {
				updates.deactivated_at = now;
			}

			if (opts?.source) updates.source = opts.source;
			if (opts?.marketplaceVersion !== undefined) {
				updates.marketplace_version = opts.marketplaceVersion;
			}
			if (opts?.displayName !== undefined) {
				updates.display_name = opts.displayName;
			}
			if (opts?.description !== undefined) {
				updates.description = opts.description;
			}

			await this.db
				.updateTable("_plugin_state")
				.set(updates)
				.where("plugin_id", "=", pluginId)
				.execute();
		} else {
			// Create new state
			await this.db
				.insertInto("_plugin_state")
				.values({
					plugin_id: pluginId,
					status,
					version,
					installed_at: now,
					activated_at: status === "active" ? now : null,
					deactivated_at: null,
					data: null,
					source: opts?.source ?? "config",
					marketplace_version: opts?.marketplaceVersion ?? null,
					display_name: opts?.displayName ?? null,
					description: opts?.description ?? null,
				})
				.execute();
		}

		return (await this.get(pluginId))!;
	}

	/**
	 * Enable a plugin
	 */
	async enable(pluginId: string, version: string): Promise<PluginState> {
		return this.upsert(pluginId, version, "active");
	}

	/**
	 * Disable a plugin
	 */
	async disable(pluginId: string, version: string): Promise<PluginState> {
		return this.upsert(pluginId, version, "inactive");
	}

	/**
	 * Delete plugin state
	 */
	async delete(pluginId: string): Promise<boolean> {
		const result = await this.db
			.deleteFrom("_plugin_state")
			.where("plugin_id", "=", pluginId)
			.executeTakeFirst();

		return (result.numDeletedRows ?? 0) > 0;
	}
}
