import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ADMIN_ENTRY_ALIAS_PATH,
  DEFAULT_ADMIN_ROUTE_PATH,
  DEFAULT_SETUP_SHELL_PATH,
  DEFAULT_SETUP_STATUS_PATH,
  evaluateAdminEntryAliasResponse,
  evaluateSetupShellResponse,
  evaluateSetupStatusResponse,
  resolveSmokeBaseUrl,
  runCloudflareAdminSmokeTest,
} from "../../scripts/smoke-cloudflare-admin.mjs";

test("resolveSmokeBaseUrl prefers an explicit argument over env defaults", () => {
  const url = resolveSmokeBaseUrl("https://example.test/custom", {
    SMOKE_TEST_BASE_URL: "https://fallback.test",
    SITE_URL: "https://site.test",
  });

  assert.equal(url.origin, "https://example.test");
  assert.equal(url.pathname, "/");
});

test("resolveSmokeBaseUrl ignores pnpm's double-dash separator", () => {
  const originalArgv = process.argv;
  process.argv = ["node", "scripts/smoke-cloudflare-admin.mjs", "--", "https://example.test/path"];

  try {
    const url = resolveSmokeBaseUrl(undefined, {
      SMOKE_TEST_BASE_URL: "https://fallback.test",
      SITE_URL: "https://site.test",
    });

    assert.equal(url.origin, "https://example.test");
    assert.equal(url.pathname, "/");
  } finally {
    process.argv = originalArgv;
  }
});

test("evaluateAdminEntryAliasResponse accepts the reviewed same-host redirect", () => {
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: DEFAULT_ADMIN_ROUTE_PATH,
    },
  });

  const result = evaluateAdminEntryAliasResponse(response, new URL("https://sikesra.ahlikoding.com"));
  assert.equal(result.ok, true);
});

test("evaluateAdminEntryAliasResponse rejects unexpected redirect targets", () => {
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: "/_emdash/setup",
    },
  });

  const result = evaluateAdminEntryAliasResponse(response, new URL("https://sikesra.ahlikoding.com"));
  assert.equal(result.ok, false);
  assert.equal(result.kind, "unexpected_alias_redirect_target");
});

test("evaluateSetupShellResponse rejects non-html setup-shell responses", () => {
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });

  const result = evaluateSetupShellResponse(response, "{}");
  assert.equal(result.ok, false);
  assert.equal(result.kind, "setup_shell_non_html");
});

test("evaluateSetupShellResponse rejects known runtime error markers", () => {
  const response = new Response("<html><body>Internal Server Error</body></html>", {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });

  const result = evaluateSetupShellResponse(response, "<html><body>Internal Server Error</body></html>");
  assert.equal(result.ok, false);
  assert.equal(result.kind, "setup_shell_runtime_error");
});

test("evaluateSetupStatusResponse accepts the reviewed compatibility payload", async () => {
  const response = new Response(
    JSON.stringify({
      data: {
        needsSetup: true,
        step: "start",
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

  const result = await evaluateSetupStatusResponse(response);
  assert.equal(result.ok, true);
});

test("runCloudflareAdminSmokeTest reports setup-status as a diagnostic seam", async () => {
  const responses = new Map([
    [
      `https://sikesra.ahlikoding.com${DEFAULT_ADMIN_ENTRY_ALIAS_PATH}`,
      new Response(null, {
        status: 302,
        headers: { Location: DEFAULT_ADMIN_ROUTE_PATH },
      }),
    ],
    [
      `https://sikesra.ahlikoding.com${DEFAULT_SETUP_SHELL_PATH}`,
      new Response("<html><body>Setup</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    ],
    [
      `https://sikesra.ahlikoding.com${DEFAULT_SETUP_STATUS_PATH}`,
      new Response(JSON.stringify({ data: { needsSetup: false } }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
    ],
  ]);

  const result = await runCloudflareAdminSmokeTest({
    baseUrl: new URL("https://sikesra.ahlikoding.com"),
    fetchImpl: async (input) => {
      const response = responses.get(String(input));

      if (!response) {
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }

      return response;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.adminEntry.ok, true);
  assert.equal(result.checks.setupShell.ok, true);
  assert.equal(result.checks.setupStatus.ok, true);
});
