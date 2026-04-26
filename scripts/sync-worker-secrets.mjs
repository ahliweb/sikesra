import { readFileSync } from "node:fs";
import { hasValue, loadLocalEnv } from "./_local-env.mjs";

const REQUIRED_SECRETS = ["APP_SECRET", "MINI_TOTP_ENCRYPTION_KEY", "TURNSTILE_SECRET_KEY", "EDGE_API_JWT_SECRET"];

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
      if (escaping) escaping = false;
      else if (char === "\\") escaping = true;
      else if (char === stringQuote) inString = false;
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

function readWorkerName() {
  if (hasValue(process.env.SIKESRA_WORKER_NAME)) return process.env.SIKESRA_WORKER_NAME;
  const wrangler = JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8")));
  return wrangler.name;
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
  const missingLocalSecrets = REQUIRED_SECRETS.filter((name) => !hasValue(process.env[name]));
  if (missingLocalSecrets.length > 0) {
    printReport({ ok: false, workerName, missingLocalSecrets, syncedSecrets: [] });
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
  for (const name of REQUIRED_SECRETS) {
    const result = await cloudflareFetch(process.env.CLOUDFLARE_ACCOUNT_ID, `/workers/scripts/${workerName}/secrets`, {
      method: "PUT",
      body: JSON.stringify({ name, text: process.env[name], type: "secret_text" }),
    });
    if (result.response.ok && result.json?.success !== false) syncedSecrets.push(name);
    else failedSecrets.push({ name, httpStatus: result.response.status });
  }

  printReport({ ok: failedSecrets.length === 0, workerName, workerExists: true, syncedSecrets, failedSecrets });
  process.exit(failedSecrets.length === 0 ? 0 : 1);
}

main().catch((error) => {
  printReport({ ok: false, error: error.message, syncedSecrets: [] });
  process.exit(1);
});
