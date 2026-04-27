import { readFileSync } from "node:fs";
import { hasValue, loadLocalEnv } from "./_local-env.mjs";
import { getRequiredWorkerSecrets, parseWranglerConfig, stripJsonc } from "./_wrangler-config.mjs";

function readWorkerName() {
  if (hasValue(process.env.SIKESRA_WORKER_NAME)) return process.env.SIKESRA_WORKER_NAME;
  const wrangler = JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8")));
  return wrangler.name;
}

function readRequiredSecrets() {
  const requiredSecrets = getRequiredWorkerSecrets(parseWranglerConfig());
  if (requiredSecrets.length === 0) {
    throw new Error("Missing Worker secret contract in wrangler.jsonc.");
  }

  return requiredSecrets;
}

async function cloudflareFetch(accountId, path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
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

function printReport(report) {
  console.log(
    JSON.stringify(
      {
        ...report,
        redaction: "Secret values, API tokens, and raw Cloudflare responses are omitted.",
      },
      null,
      2,
    ),
  );
}

async function main() {
  loadLocalEnv();

  if (!hasValue(process.env.CLOUDFLARE_ACCOUNT_ID) || !hasValue(process.env.CLOUDFLARE_API_TOKEN)) {
    throw new Error("Missing Cloudflare account ID or API token.");
  }

  const workerName = readWorkerName();
  const requiredSecrets = readRequiredSecrets();
  const missingLocalSecrets = requiredSecrets.filter((name) => !hasValue(process.env[name]));
  if (missingLocalSecrets.length > 0) {
    printReport({ ok: false, workerName, requiredSecrets, missingLocalSecrets, syncedSecrets: [] });
    process.exit(1);
  }

  const script = await cloudflareFetch(process.env.CLOUDFLARE_ACCOUNT_ID, `/workers/scripts/${workerName}`);
  if (!script.response.ok) {
    printReport({
      ok: false,
      workerName,
      workerExists: false,
      httpStatus: script.response.status,
      syncedSecrets: [],
      nextStep: "Deploy the Worker first, then rerun this script to populate Cloudflare-managed secrets.",
    });
    process.exit(1);
  }

  const syncedSecrets = [];
  const failedSecrets = [];
  for (const name of requiredSecrets) {
    const result = await cloudflareFetch(process.env.CLOUDFLARE_ACCOUNT_ID, `/workers/scripts/${workerName}/secrets`, {
      method: "PUT",
      body: JSON.stringify({ name, text: process.env[name], type: "secret_text" }),
    });
    if (result.response.ok && result.json?.success !== false) syncedSecrets.push(name);
    else failedSecrets.push({ name, httpStatus: result.response.status });
  }

  printReport({ ok: failedSecrets.length === 0, workerName, requiredSecrets, workerExists: true, syncedSecrets, failedSecrets });
  process.exit(failedSecrets.length === 0 ? 0 : 1);
}

main().catch((error) => {
  printReport({ ok: false, error: error.message, syncedSecrets: [] });
  process.exit(1);
});
