import assert from "node:assert/strict";
import test from "node:test";
import packageJson from "../../package.json" with { type: "json" };

test("SIKESRA package scripts expose documented redacted security audits", () => {
  assert.equal(packageJson.scripts["audit:coolify-postgres"], "node scripts/audit-coolify-postgres.mjs");
  assert.equal(packageJson.scripts["audit:database-role"], "node scripts/audit-database-role.mjs");
  assert.equal(packageJson.scripts["smoke:cloudflare-admin"], "node scripts/smoke-cloudflare-admin.mjs");
  assert.equal(packageJson.scripts["smoke:deployed-runtime-health"], "node scripts/smoke-deployed-runtime-health.mjs");
  assert.equal(packageJson.scripts["verify:live-runtime"], "node scripts/verify-live-runtime.mjs");
});
