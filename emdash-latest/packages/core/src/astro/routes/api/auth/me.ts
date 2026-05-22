/**
 * GET /_emdash/api/auth/me
 *
 * Returns the current authenticated user's info.
 * Used by the admin UI to display user info in the header.
 */

import type { APIRoute } from "astro";

export const prerender = false;

import { apiError, apiSuccess } from "#api/error.js";
import { isParseError, parseBody } from "#api/parse.js";
import { authMeActionBody } from "#api/schemas.js";

export const GET: APIRoute = async ({ locals, session }) => {
	const { user } = locals;

	if (!user) {
		return apiError("NOT_AUTHENTICATED", "Not authenticated", 401);
	}

	// Check if this is the user's first login (for welcome modal)
	// We track this in the session to show the modal only once
	const hasSeenWelcome = await session?.get("hasSeenWelcome");
	const isFirstLogin = !hasSeenWelcome;

	// Return safe user info (no sensitive data)
	return apiSuccess({
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		avatarUrl: user.avatarUrl,
		isFirstLogin,
	});
};

/**
 * POST /_emdash/api/auth/me
 *
 * Mark that the user has seen the welcome modal.
 */
export const POST: APIRoute = async ({ request, locals, session }) => {
	const { user } = locals;

	if (!user) {
		return apiError("NOT_AUTHENTICATED", "Not authenticated", 401);
	}

	const body = await parseBody(request, authMeActionBody);
	if (isParseError(body)) return body;

	if (body.action === "dismissWelcome") {
		session?.set("hasSeenWelcome", true);
		return apiSuccess({ success: true });
	}

	return apiError("UNKNOWN_ACTION", "Unknown action", 400);
};
