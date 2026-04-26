import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ADMIN_PAGES,
  SIKESRA_ADMIN_PERMISSIONS,
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

function flattenPages(pages) {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}
