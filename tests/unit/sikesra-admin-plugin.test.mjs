import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ADMIN_PAGES,
  SIKESRA_ADMIN_PERMISSIONS,
  SIKESRA_ADMIN_ROUTE_PLACEHOLDERS,
  filterSikesraAdminPagesByPermissions,
  flattenSikesraAdminPages,
  sikesraAdminPlugin,
} from "../../src/plugins/sikesra-admin/index.mjs";

test("SIKESRA admin plugin exposes an EmDash-compatible descriptor", () => {
  const plugin = sikesraAdminPlugin();

  assert.equal(plugin.id, "sikesra-admin");
  assert.equal(plugin.format, "native");
  assert.equal(plugin.entrypoint, "/src/plugins/sikesra-admin/index.mjs");
  assert.equal(plugin.adminEntry, "/src/plugins/sikesra-admin/index.mjs");
  assert.deepEqual(plugin.permissions, SIKESRA_ADMIN_PERMISSIONS);
  assert.deepEqual(plugin.adminPages, SIKESRA_ADMIN_PAGES);
  assert.deepEqual(plugin.routePlaceholders, SIKESRA_ADMIN_ROUTE_PLACEHOLDERS);
});

test("SIKESRA admin pages cover the MVP menu labels", () => {
  const labels = flattenPages(SIKESRA_ADMIN_PAGES).map((page) => page.label);

  assert.deepEqual(
    [
      "Dashboard SIKESRA",
      "Registry Data",
      "Verifikasi Data",
      "Dokumen Pendukung",
      "Import Excel",
      "Laporan & Export",
      "Wilayah & Kodefikasi",
      "Audit Log",
      "Pengguna & Akses",
      "Pengaturan",
      "Lansia Terlantar",
      "Guru Agama",
    ].every((label) => labels.includes(label)),
    true,
  );
});

test("SIKESRA menu entries avoid technical operator-facing labels", () => {
  for (const page of flattenPages(SIKESRA_ADMIN_PAGES)) {
    assert.equal(/entity|object_type_code|uuid/i.test(page.label), false, page.label);
    assert.equal(page.group, "SIKESRA");
    assert.equal(typeof page.permissionCode, "string");
    assert.equal(page.sensitivity, "restricted");
  }
});

test("SIKESRA permissions use one permission code per top-level admin page", () => {
  const permissionCodes = new Set(SIKESRA_ADMIN_PERMISSIONS.map((permission) => permission.code));

  for (const page of SIKESRA_ADMIN_PAGES) {
    assert.equal(permissionCodes.has(page.permissionCode), true, page.permissionCode);
  }
});

test("SIKESRA admin route placeholders mirror the flattened menu", () => {
  const pagePaths = flattenSikesraAdminPages().map((page) => page.path).sort();
  const routePaths = SIKESRA_ADMIN_ROUTE_PLACEHOLDERS.map((route) => route.path).sort();

  assert.deepEqual(routePaths, pagePaths);

  for (const route of SIKESRA_ADMIN_ROUTE_PLACEHOLDERS) {
    assert.equal(route.status, "placeholder");
    assert.equal(route.implementationIssue, "ahliweb/sikesra#13");
    assert.equal(typeof route.permissionCode, "string");
  }
});

test("SIKESRA admin menu can be filtered by permission metadata", () => {
  const visible = filterSikesraAdminPagesByPermissions(["sikesra.dashboard.read", "sikesra.registry.read"]);
  const labels = flattenPages(visible).map((page) => page.label);

  assert.equal(labels.includes("Dashboard SIKESRA"), true);
  assert.equal(labels.includes("Registry Data"), true);
  assert.equal(labels.includes("Anak Yatim/Piatu"), true);
  assert.equal(labels.includes("Audit Log"), false);
  assert.equal(labels.includes("Pengaturan"), false);
});

function flattenPages(pages) {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}
