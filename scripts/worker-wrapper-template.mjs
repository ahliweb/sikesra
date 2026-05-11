import emdashWorker from "./entry.mjs";

const SIKESRA_PUBLIC_HTML = `__SIKESRA_PUBLIC_HTML__`;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function withNoStoreHeaders(headers = {}) {
  return { ...NO_STORE_HEADERS, ...headers };
}

function errorMessage(err) {
  return err instanceof Error ? err.message : "Internal server error";
}

function routeResponse(body, init = {}, route) {
  const headers = new Headers(init.headers || {});
  headers.set("X-Route", route);
  return new Response(body, { ...init, headers });
}

function jsonResponse(data, init = {}, route = "sikesra") {
  return routeResponse(JSON.stringify(data), {
    ...init,
    headers: withNoStoreHeaders({ "Content-Type": "application/json", ...(init.headers || {}) }),
  }, route);
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

function withInsightsScriptSource(cspValue) {
  const source = "https://static.cloudflareinsights.com";
  if (!cspValue || cspValue.includes(source)) return cspValue;

  let next = cspValue;
  if (/script-src\s/i.test(next)) {
    next = next.replace(/script-src\s+([^;]+)/i, (match, group) => {
      return group.includes(source) ? match : `script-src ${group} ${source}`;
    });
  }

  return next;
}

async function handleEmDash(request, env, ctx, route = "emdash") {
  const response = await emdashWorker.fetch(request, env, ctx);
  const headers = new Headers(response.headers);
  const csp = headers.get("content-security-policy");

  if (csp) headers.set("content-security-policy", withInsightsScriptSource(csp));

  return cloneResponseWithHeaders(response, route, Object.fromEntries(headers.entries()));
}

async function isSikesraPluginActive(env) {
  try {
    const row = await env.DB.prepare("SELECT status FROM _plugin_state WHERE plugin_id = ? LIMIT 1")
      .bind("sikesra")
      .first();
    return !row || row.status === "active";
  } catch {
    return true;
  }
}

async function handleHealth(env) {
  const requestId = crypto.randomUUID();
  const db = env.SIKESRA_DB || env.DB;

  try {
    const check = await db.prepare("SELECT 1 AS ok").first();
    return jsonResponse({ ok: true, requestId, data: { service: "SIKESRA", database: check ? "connected" : "error" } }, {}, "sikesra-health");
  } catch (err) {
    return jsonResponse({ ok: false, requestId, error: { code: "HEALTH_CHECK_FAILED", message: errorMessage(err) } }, { status: 500 }, "sikesra-health");
  }
}

async function handleSikesraPublic(env) {
  const active = await isSikesraPluginActive(env);
  if (!active) {
    return routeResponse("Not Found", { status: 404, headers: withNoStoreHeaders() }, "sikesra");
  }

  return routeResponse(SIKESRA_PUBLIC_HTML, {
    headers: withNoStoreHeaders({ "Content-Type": "text/html; charset=utf-8" }),
  }, "sikesra");
}

function handleSikesraApi() {
  return jsonResponse({
    ok: false,
    requestId: crypto.randomUUID(),
    error: {
      code: "SIKESRA_REBUILD_REQUIRED",
      message: "SIKESRA APIs are intentionally disabled until the from-scratch implementation plan rebuilds them.",
    },
  }, { status: 503 }, "sikesra-api");
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === "/health") return handleHealth(env);
    if (pathname === "/sikesra" || pathname === "/sikesra/") return handleSikesraPublic(env);
    if (pathname === "/_emdash/api/plugins/sikesra/admin" || pathname === "/_emdash/api/plugins/sikesra/admin/") {
      return handleEmDash(request, env, ctx, "sikesra-admin");
    }
    if (pathname.startsWith("/_emdash/api/plugins/sikesra/")) return handleSikesraApi();

    try {
      return await handleEmDash(request, env, ctx, pathname === "/" ? "emdash-root" : "emdash");
    } catch (err) {
      return routeResponse(`EmDash error: ${errorMessage(err)}`, {
        status: 500,
        headers: withNoStoreHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      }, pathname === "/" ? "emdash-root" : "emdash");
    }
  },
};
