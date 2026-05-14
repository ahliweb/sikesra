#!/usr/bin/env node

const baseUrl = process.env.SIKESRA_BASE_URL || "https://sikesra.ahliweb.workers.dev";
const page = process.env.SIKESRA_ADMIN_PAGE || "overview";
const cookie = process.env.SIKESRA_ADMIN_COOKIE || "";
const expectUnauthorized = process.env.SIKESRA_EXPECT_UNAUTHORIZED === "1";

function fail(message) {
  console.error(`[smoke-admin-route] ${message}`);
  process.exit(1);
}

function extractBlocks(payload) {
  return payload?.data?.blocks ?? payload?.data?.data?.blocks ?? null;
}

async function main() {
  const headers = {
    "Content-Type": "application/json",
    "X-EmDash-Request": "1",
  };

  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${baseUrl}/_emdash/api/plugins/sikesra/admin`, {
    method: "POST",
    headers,
    body: JSON.stringify({ page }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    fail(`expected JSON response, received: ${text.slice(0, 200)}`);
  }

  if (expectUnauthorized) {
    if (response.status !== 401 || payload?.error?.message !== "Authentication required") {
      fail(`expected 401 Authentication required, received status=${response.status} payload=${JSON.stringify(payload)}`);
    }
    console.log(`[smoke-admin-route] unauthorized path verified for page=${page}`);
    return;
  }

  const blocks = extractBlocks(payload);
  if (!response.ok) {
    fail(`expected authenticated success, received status=${response.status} payload=${JSON.stringify(payload)}`);
  }

  if (!Array.isArray(blocks)) {
    fail(`expected data.blocks array, received payload=${JSON.stringify(payload)}`);
  }

  console.log(`[smoke-admin-route] ok page=${page} blocks=${blocks.length}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
