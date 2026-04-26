import { existsSync, readFileSync } from "node:fs";

const ENV_FILES = [".env.local", ".env"];
const HYPERDRIVE_PLACEHOLDER = "REPLACE_WITH_SIKESRA_HYPERDRIVE_ID";

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

function stripJsonc(input) {
  let output = "";
  let inString = false;
  let stringQuote = "";
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

function parseWrangler() {
  if (!existsSync("wrangler.jsonc")) return null;
  return JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8")));
}

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
  result.httpStatus = response.status;
  result.ok = response.ok;
  result.name = json?.name ?? null;
  result.status = json?.status ?? null;
  result.isPublic = json?.is_public ?? null;
  result.databaseMatches = json?.postgres_db === "sikesrakobar";
  result.userPresent = hasValue(json?.postgres_user);
  result.passwordPresent = hasValue(json?.postgres_password);
  return result;
}

async function checkCloudflare(env, wrangler) {
  const result = {
    ok: false,
    configured: hasValue(env.CLOUDFLARE_ACCOUNT_ID) && hasValue(env.CLOUDFLARE_API_TOKEN),
    redaction: "Cloudflare token, raw response, and secret values are omitted.",
  };

  if (!result.configured) return result;

  const { response, json } = await fetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/hyperdrive/configs`,
    env.CLOUDFLARE_API_TOKEN,
  );
  const configs = Array.isArray(json?.result) ? json.result : [];
  const wranglerHyperdriveId = wrangler?.hyperdrive?.[0]?.id ?? null;
  const matchingConfig = configs.find((config) => config.id === wranglerHyperdriveId);

  result.httpStatus = response.status;
  result.hyperdriveListOk = response.ok;
  result.hyperdriveCount = configs.length;
  result.wranglerHyperdriveIdPresent = hasValue(wranglerHyperdriveId);
  result.wranglerHyperdrivePlaceholder = wranglerHyperdriveId === HYPERDRIVE_PLACEHOLDER;
  result.wranglerHyperdriveExists = Boolean(matchingConfig);
  result.sikesraNamedConfigs = configs
    .filter((config) => /sikesra|kobar/i.test(config.name || ""))
    .map((config) => ({ id: config.id, name: config.name, database: config.origin?.database ?? null }));
  result.ok = response.ok && result.wranglerHyperdriveIdPresent && !result.wranglerHyperdrivePlaceholder && result.wranglerHyperdriveExists;
  return result;
}

function checkWrangler(wrangler) {
  const requiredSecrets = ["APP_SECRET", "MINI_TOTP_ENCRYPTION_KEY", "TURNSTILE_SECRET_KEY", "EDGE_API_JWT_SECRET"];
  const declaredSecrets = Array.isArray(wrangler?.secrets?.required) ? wrangler.secrets.required : [];
  const missingSecrets = requiredSecrets.filter((secret) => !declaredSecrets.includes(secret));

  return {
    ok: Boolean(wrangler) && missingSecrets.length === 0,
    workerName: wrangler?.name ?? null,
    siteUrl: wrangler?.vars?.SITE_URL ?? null,
    adminEntryPath: wrangler?.vars?.ADMIN_ENTRY_PATH ?? null,
    r2Binding: wrangler?.r2_buckets?.[0]?.binding ?? null,
    r2Bucket: wrangler?.r2_buckets?.[0]?.bucket_name ?? null,
    hyperdriveBinding: wrangler?.hyperdrive?.[0]?.binding ?? null,
    hyperdriveId: wrangler?.hyperdrive?.[0]?.id ?? null,
    hyperdrivePlaceholder: wrangler?.hyperdrive?.[0]?.id === HYPERDRIVE_PLACEHOLDER,
    missingRequiredSecrets: missingSecrets,
  };
}

async function main() {
  for (const file of ENV_FILES) loadEnvFile(file);

  const wrangler = parseWrangler();
  const databaseUrl = safeUrlSummary(process.env.DATABASE_URL);
  const localHyperdriveConnection = safeUrlSummary(process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE);
  const envCheck = {
    ok:
      databaseUrl.database === "sikesrakobar" &&
      (!localHyperdriveConnection.present || localHyperdriveConnection.database === "sikesrakobar") &&
      existsSync(".dev.vars.example"),
    databaseUrl,
    databaseUrlMatches: databaseUrl.database === "sikesrakobar",
    localHyperdriveConnection,
    localHyperdriveConnectionMatches:
      !localHyperdriveConnection.present || localHyperdriveConnection.database === "sikesrakobar",
    devVarsExamplePresent: existsSync(".dev.vars.example"),
    envLocalPresent: existsSync(".env.local"),
  };
  const checks = {
    wrangler: checkWrangler(wrangler),
    env: envCheck,
    coolify: await checkCoolify(process.env),
    cloudflare: await checkCloudflare(process.env, wrangler),
  };

  const ok = checks.wrangler.ok && checks.env.ok && checks.coolify.ok && checks.cloudflare.ok;
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
