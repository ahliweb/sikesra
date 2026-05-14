/**
 * Marketplace update check endpoint
 *
 * GET /_emdash/api/admin/plugins/updates - Check for marketplace plugin updates
 */

import type { APIRoute } from "astro";

import { requirePerm } from "#api/authorize.js";
import { apiError, unwrapResult } from "#api/error.js";
import { handleMarketplaceUpdateCheck } from "#api/index.js";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const { emdash, user } = locals;

	if (!emdash?.db) {
		return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	}

	const denied = requirePerm(user, "plugins:read");
	if (denied) return denied;

	const result = await handleMarketplaceUpdateCheck(emdash.db, emdash.config.marketplace);

	return unwrapResult(result);
};
