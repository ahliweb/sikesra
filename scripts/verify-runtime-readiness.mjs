import { existsSync } from "node:fs";
import { buildDefaultEnvFiles, hasValue, loadLocalEnv } from "./_local-env.mjs";

function safeUrlSummary(raw) {
  if (!hasValue(raw)) return { present: false };

  try {
    const url = new URL(raw);
    return {
      present: true,
      protocol: url.protocol,
      hostPresent: hasValue(url.hostname),
      portPresent: hasValue(url.port),
      database: url.pathname.replace(/^\//, "") || null,
      usernamePresent: Boolean(url.username),
      passwordPresent: Boolean(url.password),
    };
  } catch {
    return { present: true, parseable: false };
  }
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, json };
}

async function checkCoolify(env) {
  const result = {
    ok: false,
    configured: hasValue(env.COOLIFY_BASE_URL) && hasValue(env.COOLIFY_ACCESS_TOKEN),
    databaseResourceUuidPresent: hasValue(env.COOLIFY_SIKESRA_POSTGRES_RESOURCE_UUID),
    redaction: "Coolify token, raw response, passwords, and URLs are omitted.",
  };

  if (!result.configured || !result.databaseResourceUuidPresent) return result;

  const url = new URL(`/api/v1/databases/${env.COOLIFY_SIKESRA_POSTGRES_RESOURCE_UUID}`, env.COOLIFY_BASE_URL);
  const { response, json } = await fetchJson(url, env.COOLIFY_ACCESS_TOKEN);
  const postgresUser = hasValue(json?.postgres_user) ? json.postgres_user : null;
  result.httpStatus = response.status;
  result.healthy = typeof json?.status === "string" ? json.status.startsWith("running") : false;
  result.name = json?.name ?? null;
  result.status = json?.status ?? null;
  result.isPublic = json?.is_public ?? null;
  result.publicPortPresent = hasValue(String(json?.public_port ?? ""));
  result.publicDatabaseUrlPresent = hasValue(json?.public_database_url);
  result.databaseMatches = json?.postgres_db === "sikesrakobar";
  result.runtimeRole = postgresUser;
  result.runtimeRoleIsDedicated = hasValue(postgresUser) && postgresUser !== "postgres";
  result.userPresent = hasValue(postgresUser);
  result.passwordPresent = hasValue(json?.postgres_password);
  result.sslEnabled = typeof json?.enable_ssl === "boolean" ? json.enable_ssl : null;
  result.sslMode = hasValue(json?.ssl_mode) ? json.ssl_mode : null;
  result.ok =
    response.ok &&
    result.healthy &&
    result.isPublic === false &&
    result.databaseMatches &&
    result.runtimeRoleIsDedicated;
  return result;
}

async function checkCloudflare(env) {
  const result = {
    ok: hasValue(env.CLOUDFLARE_ACCOUNT_ID) && hasValue(env.CLOUDFLARE_API_TOKEN),
    configured: hasValue(env.CLOUDFLARE_ACCOUNT_ID) && hasValue(env.CLOUDFLARE_API_TOKEN),
    redaction: "Cloudflare token, raw response, and secret values are omitted.",
  };

  result.accountIdPresent = hasValue(env.CLOUDFLARE_ACCOUNT_ID);
  result.r2Bucket = hasValue(env.R2_BUCKET_NAME) ? env.R2_BUCKET_NAME : null;
  result.turnstileEnabled = hasValue(env.TURNSTILE_SECRET_KEY);
  return result;
}

async function main() {
  const envFiles = buildDefaultEnvFiles(process.env);
  loadLocalEnv(envFiles);

  const databaseUrl = safeUrlSummary(process.env.DATABASE_URL);
  const envCheck = {
    ok: databaseUrl.database === "sikesrakobar" && existsSync(".env.example"),
    databaseUrl,
    databaseUrlMatches: databaseUrl.database === "sikesrakobar",
    loadedEnvFiles: envFiles,
    envExamplePresent: existsSync(".env.example"),
    envLocalPresent: existsSync(".env.local"),
  };
  const checks = {
    env: envCheck,
    coolify: await checkCoolify(process.env),
    cloudflare: await checkCloudflare(process.env),
  };

  const ok = checks.env.ok && checks.coolify.ok && checks.cloudflare.ok;
  const output = {
    ok,
    service: "sikesra-runtime-readiness",
    checks,
    redaction: "No passwords, tokens, connection strings, private keys, or raw API responses are printed.",
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch(() => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        service: "sikesra-runtime-readiness",
        error: "Runtime readiness check failed before producing a complete redacted report.",
        redaction: "Exception details are omitted to avoid leaking environment or management-plane data.",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
