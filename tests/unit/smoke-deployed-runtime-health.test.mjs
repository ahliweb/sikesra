import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_EDGE_HEALTH_PATH,
  evaluateDeployedRuntimeHealthResponse,
  runDeployedRuntimeHealthSmokeTest,
} from "../../scripts/smoke-deployed-runtime-health.mjs";

test("evaluateDeployedRuntimeHealthResponse accepts the reviewed direct payload", async () => {
  const response = new Response(
    JSON.stringify({
      data: {
        needsSetup: true,
        runtimeHealth: {
          database: {
            ok: true,
            posture: {
              transport: "direct",
              hostname: "postgres",
              sslmode: null,
              source: "DATABASE_URL",
            },
          },
        },
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

  const result = await evaluateDeployedRuntimeHealthResponse(response, {
    transport: "direct",
    hostname: "postgres",
    sslmode: null,
  });

  assert.equal(result.ok, true);
});

test("evaluateDeployedRuntimeHealthResponse rejects unexpected database posture", async () => {
  const response = new Response(
    JSON.stringify({
      ok: true,
      data: {
        runtimeHealth: {
          database: {
            ok: true,
            posture: {
              transport: "direct",
              hostname: "id1.ahlikoding.com",
            },
          },
        },
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

  const result = await evaluateDeployedRuntimeHealthResponse(response, {
    transport: "direct",
    hostname: "postgres",
    sslmode: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, "unexpected_database_posture");
});

test("runDeployedRuntimeHealthSmokeTest checks the reviewed edge health endpoint", async () => {
  const result = await runDeployedRuntimeHealthSmokeTest({
    baseUrl: new URL("https://sikesrakobar.ahlikoding.com"),
    env: {
      HEALTHCHECK_EXPECT_DATABASE_TRANSPORT: "direct",
      HEALTHCHECK_EXPECT_DATABASE_HOSTNAME: "postgres",
    },
    fetchImpl: async (input) => {
      assert.equal(String(input), `https://sikesrakobar.ahlikoding.com${DEFAULT_EDGE_HEALTH_PATH}`);

      return new Response(
        JSON.stringify({
          data: {
            needsSetup: true,
            runtimeHealth: {
              database: {
                ok: true,
                posture: {
                  transport: "direct",
                  hostname: "postgres",
                  sslmode: null,
                  source: "DATABASE_URL",
                },
              },
            },
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        },
      );
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.edgeHealth.ok, true);
});
