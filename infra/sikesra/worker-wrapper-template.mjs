import emdashWorker from "./entry.mjs";

const NO_STORE_HEADERS = {
	"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	"CDN-Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	Pragma: "no-cache",
	Expires: "0",
};

const DEFAULT_FAVICON_SVG =
	"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0f172a'/><path d='M18 34h28' stroke='#f8fafc' stroke-width='6' stroke-linecap='round'/><circle cx='32' cy='22' r='6' fill='#38bdf8'/></svg>";

function withNoStoreHeaders(headers = {}) {
	return { ...NO_STORE_HEADERS, ...headers };
}

function errorMessage(error) {
	return error instanceof Error ? error.message : "Internal server error";
}

function cloneResponseWithHeaders(response, route, extraHeaders = {}) {
	const headers = new Headers(response.headers);
	headers.set("X-Route", route);
	for (const [key, value] of Object.entries(extraHeaders)) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function routeResponse(body, init = {}, route) {
	const headers = new Headers(init.headers || {});
	headers.set("X-Route", route);
	return new Response(body, { ...init, headers });
}

async function handleEmDash(request, env, ctx, route = "emdash") {
	const response = await emdashWorker.fetch(request, env, ctx);
	return cloneResponseWithHeaders(response, route);
}

export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url);

		if (pathname === "/favicon.ico") {
			return routeResponse(
				DEFAULT_FAVICON_SVG,
				{
					status: 200,
					headers: withNoStoreHeaders({ "Content-Type": "image/svg+xml; charset=utf-8" }),
				},
				"favicon",
			);
		}

		if (pathname === "/sikesra" || pathname === "/sikesra/") {
			return handleEmDash(request, env, ctx, "sikesra-public");
		}
		if (
			pathname === "/_emdash/api/plugins/sikesra/admin" ||
			pathname === "/_emdash/api/plugins/sikesra/admin/"
		) {
			return handleEmDash(request, env, ctx, "sikesra-admin");
		}
		if (pathname.startsWith("/_emdash/api/plugins/sikesra/public/")) {
			return handleEmDash(request, env, ctx, "sikesra-public-api");
		}
		if (pathname.startsWith("/_emdash/api/plugins/sikesra/")) {
			return handleEmDash(request, env, ctx, "sikesra-api");
		}

		try {
			return await handleEmDash(request, env, ctx, pathname === "/" ? "emdash-root" : "emdash");
		} catch (error) {
			return routeResponse(
				`EmDash error: ${errorMessage(error)}`,
				{
					status: 500,
					headers: withNoStoreHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
				},
				pathname === "/" ? "emdash-root" : "emdash",
			);
		}
	},
};
