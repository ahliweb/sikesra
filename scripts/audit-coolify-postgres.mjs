import { buildDefaultEnvFiles, hasValue, loadLocalEnv } from "./_local-env.mjs";

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();

  try {
    return { response, json: text ? JSON.parse(text) : null };
  } catch {
    return { response, json: null };
  }
}

function buildAudit(result) {
  const postgresUser = hasValue(result?.postgres_user) ? result.postgres_user : null;
  const isPublic = result?.is_public;
  const sslEnabled = typeof result?.enable_ssl === "boolean" ? result.enable_ssl : null;
  const sslMode = hasValue(result?.ssl_mode) ? result.ssl_mode : null;

  const checks = {
    healthy: typeof result?.status === "string" ? result.status.startsWith("running") : false,
    privateNetworkOnly: isPublic === false,
    databaseMatches: result?.postgres_db === "sikesrakobar",
    runtimeRoleIsDedicated: hasValue(postgresUser) && postgresUser !== "postgres",
  };

  return {
    ok: Object.values(checks).every(Boolean),
    name: result?.name ?? null,
    status: result?.status ?? null,
    database: result?.postgres_db ?? null,
    runtimeRole: postgresUser,
    isPublic,
    publicPortPresent: hasValue(String(result?.public_port ?? "")),
    publicUrlPresent: hasValue(result?.public_database_url),
    sslEnabled,
    sslMode,
    checks,
  };
}

async function main() {
  loadLocalEnv(buildDefaultEnvFiles(process.env));

  if (!hasValue(process.env.COOLIFY_BASE_URL) || !hasValue(process.env.COOLIFY_ACCESS_TOKEN)) {
    throw new Error("Missing COOLIFY_BASE_URL or COOLIFY_ACCESS_TOKEN.");
  }

  if (!hasValue(process.env.COOLIFY_SIKESRA_POSTGRES_RESOURCE_UUID)) {
    throw new Error("Missing COOLIFY_SIKESRA_POSTGRES_RESOURCE_UUID.");
  }

  const url = new URL(
    `/api/v1/databases/${process.env.COOLIFY_SIKESRA_POSTGRES_RESOURCE_UUID}`,
    process.env.COOLIFY_BASE_URL,
  );
  const { response, json } = await fetchJson(url, process.env.COOLIFY_ACCESS_TOKEN);
  const audit = buildAudit(json ?? {});

  console.log(
    JSON.stringify(
      {
        service: "sikesra-coolify-postgres-audit",
        ok: response.ok && audit.ok,
        configured: true,
        httpStatus: response.status,
        audit,
        redaction:
          "No passwords, tokens, connection strings, private URLs, or raw management-plane payloads are printed.",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  process.exit(response.ok && audit.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        service: "sikesra-coolify-postgres-audit",
        ok: false,
        error: error.message,
        redaction:
          "No passwords, tokens, connection strings, private URLs, or raw management-plane payloads are printed.",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
