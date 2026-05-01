import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadLocalEnv } from "./_local-env.mjs";
import { resolveSmokeBaseUrl } from "./smoke-cloudflare-admin.mjs";

export const DEFAULT_EDGE_HEALTH_PATH = "/_emdash/api/setup/status";

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next.length > 0 ? next : null;
}

function readExpectedDatabasePosture(env = process.env) {
  return {
    transport: normalizeOptionalString(env.HEALTHCHECK_EXPECT_DATABASE_TRANSPORT),
    hostname: normalizeOptionalString(env.HEALTHCHECK_EXPECT_DATABASE_HOSTNAME),
    sslmode: normalizeOptionalString(env.HEALTHCHECK_EXPECT_DATABASE_SSLMODE),
  };
}

function createCheckResult(ok, details) {
  return {
    ok,
    ...details,
  };
}

function assertExpectedDatabasePosture(actual, expected) {
  const checks = [
    ["transport", expected.transport],
    ["hostname", expected.hostname],
    ["sslmode", expected.sslmode],
  ].filter(([, expectedValue]) => expectedValue !== null);

  for (const [field, expectedValue] of checks) {
    if (actual[field] !== expectedValue) {
      return createCheckResult(false, {
        kind: "unexpected_database_posture",
        field,
        expected: expectedValue,
        actual: actual[field] ?? null,
        message: `Deployed runtime reported ${field}=${actual[field] ?? "null"} instead of ${expectedValue}.`,
      });
    }
  }

  return null;
}

export async function evaluateDeployedRuntimeHealthResponse(response, expectedDatabasePosture) {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return createCheckResult(false, {
      kind: "edge_health_non_json",
      status: response.status,
      contentType,
      message: "Deployed runtime health endpoint did not return JSON.",
    });
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    return createCheckResult(false, {
      kind: "edge_health_invalid_json",
      status: response.status,
      contentType,
      message: "Deployed runtime health endpoint returned invalid JSON.",
    });
  }

  const database = payload?.data?.runtimeHealth?.database;

  if (!database || typeof database.ok !== "boolean" || !database.posture) {
    return createCheckResult(false, {
      kind: "edge_health_unexpected_payload",
      status: response.status,
      contentType,
      payload,
      message: "Deployed runtime health endpoint returned an unexpected payload shape.",
    });
  }

  if (response.status !== 200 || payload?.ok === false || !database.ok) {
    return createCheckResult(false, {
      kind: "edge_health_database_unhealthy",
      status: response.status,
      contentType,
      payload,
      message: "Deployed runtime health endpoint reported a database connectivity failure.",
    });
  }

  const postureMismatch = assertExpectedDatabasePosture(database.posture, expectedDatabasePosture);

  if (postureMismatch) {
    return createCheckResult(false, {
      status: response.status,
      contentType,
      payload,
      ...postureMismatch,
    });
  }

  return createCheckResult(true, {
    status: response.status,
    contentType,
    payload,
    message: "Deployed runtime health endpoint reported the reviewed database posture.",
  });
}

export async function runDeployedRuntimeHealthSmokeTest({ baseUrl = resolveSmokeBaseUrl(), env = process.env, fetchImpl = fetch } = {}) {
  const edgeHealthUrl = new URL(DEFAULT_EDGE_HEALTH_PATH, baseUrl);
  const edgeHealthResponse = await fetchImpl(edgeHealthUrl, {
    headers: {
      Accept: "application/json",
    },
  });
  const expectedDatabasePosture = readExpectedDatabasePosture(env);
  const edgeHealth = await evaluateDeployedRuntimeHealthResponse(edgeHealthResponse, expectedDatabasePosture);

  return {
    ok: edgeHealth.ok,
    service: "sikesra",
    checks: {
      edgeHealth,
    },
    target: baseUrl.origin,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  loadLocalEnv();
  const result = await runDeployedRuntimeHealthSmokeTest();
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
