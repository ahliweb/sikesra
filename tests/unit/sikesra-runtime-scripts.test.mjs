import assert from "node:assert/strict";
import test from "node:test";
import packageJson from "../../package.json" with { type: "json" };

import { getRequiredWorkerSecrets, parseWranglerConfig } from "../../scripts/_wrangler-config.mjs";

test("SIKESRA wrangler helper reads the reviewed Worker secret contract", () => {
  const wrangler = parseWranglerConfig();
  const requiredSecrets = getRequiredWorkerSecrets(wrangler);

  assert.equal(wrangler.name, "sikesra-kobar");
  assert.deepEqual(requiredSecrets, ["APP_SECRET", "MINI_TOTP_ENCRYPTION_KEY", "TURNSTILE_SECRET_KEY", "EDGE_API_JWT_SECRET"]);
});

test("SIKESRA wrangler helper returns empty secrets when no contract exists", () => {
  assert.deepEqual(getRequiredWorkerSecrets({}), []);
  assert.deepEqual(getRequiredWorkerSecrets(null), []);
});

test("SIKESRA package scripts expose documented redacted security audits", () => {
  assert.equal(packageJson.scripts["audit:coolify-postgres"], "node scripts/audit-coolify-postgres.mjs");
  assert.equal(packageJson.scripts["audit:database-role"], "node scripts/audit-database-role.mjs");
});
