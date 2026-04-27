import assert from "node:assert/strict";
import test from "node:test";
import packageJson from "../../package.json" with { type: "json" };

test("SIKESRA package scripts expose documented redacted security audits", () => {
  assert.equal(packageJson.scripts["audit:coolify-postgres"], "node scripts/audit-coolify-postgres.mjs");
  assert.equal(packageJson.scripts["audit:database-role"], "node scripts/audit-database-role.mjs");
});
