import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadLocalEnv } from "./_local-env.mjs";

export const DEFAULT_ADMIN_ENTRY_ALIAS_PATH = "/_emdash/";
export const DEFAULT_ADMIN_ROUTE_PATH = "/_emdash/admin";
export const DEFAULT_SETUP_SHELL_PATH = "/_emdash/admin/setup";
export const DEFAULT_SETUP_STATUS_PATH = "/_emdash/api/setup/status";

const SETUP_SHELL_ERROR_PATTERNS = [/worker exception/i, /internal server error/i, /application error/i];

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next.length > 0 ? next : null;
}

function resolveCliBaseUrlArg(argv = process.argv) {
  for (const value of argv.slice(2)) {
    if (value === "--") {
      continue;
    }

    return value;
  }

  return null;
}

export function resolveSmokeBaseUrl(input = resolveCliBaseUrlArg(), env = process.env) {
  const raw =
    normalizeOptionalString(input) || normalizeOptionalString(env.SMOKE_TEST_BASE_URL) || normalizeOptionalString(env.SITE_URL);

  if (!raw) {
    throw new Error("Set SITE_URL or SMOKE_TEST_BASE_URL, or pass a base URL as the first argument.");
  }

  const url = new URL(raw);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function createCheckResult(ok, details) {
  return {
    ok,
    ...details,
  };
}

export function evaluateAdminEntryAliasResponse(response, baseUrl) {
  const location = response.headers.get("location");

  if (!location) {
    return createCheckResult(false, {
      kind: "missing_redirect_location",
      status: response.status,
      message: "Admin entry alias did not return a redirect location.",
    });
  }

  const resolvedLocation = new URL(location, baseUrl);
  const isRedirect = [301, 302, 303, 307, 308].includes(response.status);

  if (!isRedirect) {
    return createCheckResult(false, {
      kind: "unexpected_alias_status",
      status: response.status,
      location: resolvedLocation.pathname,
      message: "Admin entry alias did not return an HTTP redirect.",
    });
  }

  if (resolvedLocation.origin !== baseUrl.origin || resolvedLocation.pathname !== DEFAULT_ADMIN_ROUTE_PATH) {
    return createCheckResult(false, {
      kind: "unexpected_alias_redirect_target",
      status: response.status,
      location: `${resolvedLocation.origin}${resolvedLocation.pathname}`,
      message: `Admin entry alias should redirect to ${DEFAULT_ADMIN_ROUTE_PATH} on the same host.`,
    });
  }

  return createCheckResult(true, {
    status: response.status,
    location: resolvedLocation.pathname,
    message: "Admin entry alias redirected to the reviewed EmDash admin surface.",
  });
}

export function evaluateSetupShellResponse(response, bodyText) {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    return createCheckResult(false, {
      kind: "setup_shell_http_error",
      status: response.status,
      contentType,
      message: "Setup shell returned a non-success HTTP status.",
    });
  }

  if (!contentType?.includes("text/html")) {
    return createCheckResult(false, {
      kind: "setup_shell_non_html",
      status: response.status,
      contentType,
      message: "Setup shell did not return HTML.",
    });
  }

  for (const pattern of SETUP_SHELL_ERROR_PATTERNS) {
    if (pattern.test(bodyText)) {
      return createCheckResult(false, {
        kind: "setup_shell_runtime_error",
        status: response.status,
        contentType,
        message: "Setup shell rendered a runtime error marker instead of the EmDash setup shell.",
      });
    }
  }

  return createCheckResult(true, {
    status: response.status,
    contentType,
    message: "Setup shell rendered without the reviewed runtime error markers.",
  });
}

export function evaluateSetupStatusResponse(response) {
  return response.text().then((bodyText) => {
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      return createCheckResult(false, {
        kind: "setup_status_http_error",
        status: response.status,
        contentType,
        message: "Setup-status API returned a non-success HTTP status.",
      });
    }

    if (!contentType?.includes("application/json")) {
      return createCheckResult(false, {
        kind: "setup_status_non_json",
        status: response.status,
        contentType,
        message: "Setup-status API did not return JSON.",
      });
    }

    let payload;

    try {
      payload = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      return createCheckResult(false, {
        kind: "setup_status_invalid_json",
        status: response.status,
        contentType,
        message: "Setup-status API returned invalid JSON.",
      });
    }

    if (!payload?.data || typeof payload.data.needsSetup !== "boolean") {
      return createCheckResult(false, {
        kind: "setup_status_unexpected_payload",
        status: response.status,
        contentType,
        payload,
        message: "Setup-status API returned an unexpected payload shape.",
      });
    }

    return createCheckResult(true, {
      status: response.status,
      contentType,
      payload,
      message: "Setup-status API returned the reviewed Mini compatibility payload.",
    });
  });
}

export async function runCloudflareAdminSmokeTest({ baseUrl = resolveSmokeBaseUrl(), fetchImpl = fetch } = {}) {
  const adminEntryUrl = new URL(DEFAULT_ADMIN_ENTRY_ALIAS_PATH, baseUrl);
  const setupShellUrl = new URL(DEFAULT_SETUP_SHELL_PATH, baseUrl);
  const setupStatusUrl = new URL(DEFAULT_SETUP_STATUS_PATH, baseUrl);

  const adminEntryResponse = await fetchImpl(adminEntryUrl, { redirect: "manual" });
  const adminEntry = evaluateAdminEntryAliasResponse(adminEntryResponse, baseUrl);

  const setupShellResponse = await fetchImpl(setupShellUrl);
  const setupShellBody = await setupShellResponse.text();
  const setupShell = evaluateSetupShellResponse(setupShellResponse, setupShellBody);

  let setupStatus;

  try {
    const setupStatusResponse = await fetchImpl(setupStatusUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    setupStatus = await evaluateSetupStatusResponse(setupStatusResponse);
  } catch (error) {
    setupStatus = createCheckResult(false, {
      kind: "setup_status_fetch_error",
      message: error instanceof Error ? error.message : "Unknown setup-status fetch failure.",
    });
  }

  return {
    ok: adminEntry.ok && setupShell.ok,
    service: "sikesra",
    checks: {
      adminEntry,
      setupShell,
      setupStatus,
    },
    target: baseUrl.origin,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  loadLocalEnv();
  const result = await runCloudflareAdminSmokeTest();
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

const entryScriptPath = process.argv[1] ? fileURLToPath(new URL(import.meta.url)) : null;

if (entryScriptPath && resolve(process.argv[1]) === entryScriptPath) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
