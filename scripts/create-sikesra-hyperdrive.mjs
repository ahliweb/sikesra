import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_NAME = "sikesra-kobar-postgres";
const PLACEHOLDER_ID = "REPLACE_WITH_SIKESRA_HYPERDRIVE_ID";

function loadEnvFile(path, env = process.env) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!env[key]) env[key] = value;
  }
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function redactErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors.map((error) => ({ code: error.code, message: error.message }));
}

async function cloudflareFetch(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

function buildPayload() {
  const databaseUrl = new URL(process.env.DATABASE_URL || "");
  const useAccess = process.env.SIKESRA_HYPERDRIVE_USE_ACCESS === "true";
  const host = process.env.SIKESRA_HYPERDRIVE_ORIGIN_HOST || databaseUrl.hostname;
  const database = process.env.SIKESRA_HYPERDRIVE_DATABASE || databaseUrl.pathname.replace(/^\//, "");

  if (!hasValue(host) || !hasValue(database) || !hasValue(databaseUrl.username) || !hasValue(databaseUrl.password)) {
    throw new Error("Missing required SIKESRA database origin values.");
  }

  const origin = {
    host,
    database,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    scheme: process.env.SIKESRA_HYPERDRIVE_ORIGIN_SCHEME || databaseUrl.protocol.replace(":", "") || "postgresql",
  };

  if (useAccess) {
    origin.access_client_id = process.env.CLOUDFLARE_ACCESS_CLIENT_ID;
    origin.access_client_secret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET;
  } else {
    origin.port = Number(process.env.SIKESRA_HYPERDRIVE_ORIGIN_PORT || databaseUrl.port || "5432");
  }

  return { name: process.env.SIKESRA_HYPERDRIVE_NAME || CONFIG_NAME, origin };
}

function updateWrangler(hyperdriveId) {
  const path = "wrangler.jsonc";
  const input = readFileSync(path, "utf8");
  if (!input.includes(PLACEHOLDER_ID)) return false;
  writeFileSync(path, input.replace(PLACEHOLDER_ID, hyperdriveId));
  return true;
}

function printReport(report) {
  console.log(
    JSON.stringify(
      {
        ...report,
        redaction: "Host, username, password, Access token, API token, and connection string omitted.",
      },
      null,
      2,
    ),
  );
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!hasValue(process.env.CLOUDFLARE_ACCOUNT_ID) || !hasValue(process.env.CLOUDFLARE_API_TOKEN)) {
    throw new Error("Missing Cloudflare account ID or API token.");
  }

  const payload = buildPayload();
  const { response: listResponse, json: listJson } = await cloudflareFetch("/hyperdrive/configs");
  const configs = Array.isArray(listJson?.result) ? listJson.result : [];
  const existing = configs.find((config) => config.name === payload.name);

  if (existing) {
    const wranglerUpdated = updateWrangler(existing.id);
    printReport({
      ok: true,
      action: "existing",
      httpStatus: listResponse.status,
      id: existing.id,
      name: existing.name,
      database: existing.origin?.database ?? null,
      wranglerUpdated,
    });
    return;
  }

  const { response, json } = await cloudflareFetch("/hyperdrive/configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const ok = response.ok && Boolean(json?.success) && hasValue(json?.result?.id);
  const wranglerUpdated = ok ? updateWrangler(json.result.id) : false;
  printReport({
    ok,
    action: "created",
    httpStatus: response.status,
    id: json?.result?.id ?? null,
    name: json?.result?.name ?? payload.name,
    database: json?.result?.origin?.database ?? payload.origin.database,
    wranglerUpdated,
    errors: redactErrors(json?.errors),
  });

  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  printReport({ ok: false, action: "failed", error: error.message });
  process.exit(1);
});
