import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadLocalEnv } from "./_local-env.mjs";

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

function resolveVerificationBaseUrl(env = process.env) {
  return normalizeOptionalString(resolveCliBaseUrlArg()) || normalizeOptionalString(env.SMOKE_TEST_BASE_URL) || normalizeOptionalString(env.SITE_URL);
}

function runStep(label, command, args, env) {
  console.log(`== ${label} ==`);

  const result = spawnSync(command, args, {
    encoding: "utf8",
    env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

async function main() {
  loadLocalEnv();

  const baseUrl = resolveVerificationBaseUrl();
  if (!baseUrl) {
    throw new Error("Set SITE_URL or SMOKE_TEST_BASE_URL, or pass a base URL as the first argument.");
  }

  runStep("Deployed runtime health", "node", ["./scripts/smoke-deployed-runtime-health.mjs", baseUrl], process.env);
  runStep("Cloudflare admin smoke", "node", ["./scripts/smoke-cloudflare-admin.mjs", baseUrl], process.env);
}

const entryScriptPath = process.argv[1] ? fileURLToPath(new URL(import.meta.url)) : null;

if (entryScriptPath && resolve(process.argv[1]) === entryScriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
