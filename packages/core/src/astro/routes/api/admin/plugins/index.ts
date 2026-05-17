/**
 * Plugin management list endpoint
 *
 * GET /_emdash/api/admin/plugins - List all configured plugins with state
 */

import type { APIRoute } from "astro";

import { requirePerm } from "#api/authorize.js";
import { apiError, unwrapResult } from "#api/error.js";
import { handlePluginList } from "#api/index.js";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const { emdash, user } = locals;

	if (!emdash?.db) {
		return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	}

	const denied = requirePerm(user, "plugins:read");
	if (denied) return denied;

	const sandboxedPluginEntries = emdash.sandboxedPluginEntries ?? [];
	const sandboxedPlugins = emdash.sandboxedPlugins ?? new Map();
	const loadedSandboxedPluginEntries = sandboxedPluginEntries.filter((entry) =>
		sandboxedPlugins.has(`${entry.id}:${entry.version}`),
	);

	const result = await handlePluginList(
		emdash.db,
		emdash.configuredPlugins,
		loadedSandboxedPluginEntries,
		emdash.config.marketplace,
	);

	return unwrapResult(result);
};
