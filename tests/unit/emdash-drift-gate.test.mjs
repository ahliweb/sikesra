import assert from "node:assert/strict";
import test from "node:test";
import packageJson from "../../package.json" with { type: "json" };

import { DEFAULT_ADMIN_ENTRY_ALIAS_PATH, DEFAULT_ADMIN_ROUTE_PATH, DEFAULT_SETUP_SHELL_PATH, DEFAULT_SETUP_STATUS_PATH } from "../../scripts/smoke-cloudflare-admin.mjs";
import { DEFAULT_EDGE_HEALTH_PATH } from "../../scripts/smoke-deployed-runtime-health.mjs";
import { SIKESRA_HOST_REGISTRATION } from "../../src/plugins/sikesra-admin/host-registration.mjs";

test("EmDash drift gate keeps the reviewed plugin and smoke seams aligned", () => {
  assert.equal(SIKESRA_HOST_REGISTRATION.descriptor.id, "sikesra-admin");
  assert.equal(SIKESRA_HOST_REGISTRATION.astro.upstreamConfigFile, "astro.config.mjs");
  assert.equal(SIKESRA_HOST_REGISTRATION.astro.emdashIntegrationOption, "plugins");
  assert.equal(SIKESRA_HOST_REGISTRATION.guidance.integration, "plugins: [awcmsUsersAdminPlugin(), sikesraAdminPlugin()]");
  assert.equal(SIKESRA_HOST_REGISTRATION.guidance.shellState, "createSikesraAdminHostShellState({ currentPath, grantedPermissions, descriptor });");

  assert.equal(DEFAULT_ADMIN_ENTRY_ALIAS_PATH, "/_emdash/");
  assert.equal(DEFAULT_ADMIN_ROUTE_PATH, "/_emdash/admin");
  assert.equal(DEFAULT_SETUP_SHELL_PATH, "/_emdash/admin/setup");
  assert.equal(DEFAULT_SETUP_STATUS_PATH, "/_emdash/api/setup/status");
  assert.equal(DEFAULT_EDGE_HEALTH_PATH, "/_emdash/api/setup/status");

  assert.equal(packageJson.scripts["smoke:cloudflare-admin"], "node scripts/smoke-cloudflare-admin.mjs");
  assert.equal(packageJson.scripts["smoke:deployed-runtime-health"], "node scripts/smoke-deployed-runtime-health.mjs");
  assert.equal(packageJson.scripts["verify:live-runtime"], "node scripts/verify-live-runtime.mjs");
});
