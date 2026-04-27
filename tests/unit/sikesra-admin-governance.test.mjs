import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ACCOUNT_STATUSES,
  SIKESRA_AUDIT_ACTION_LABELS,
  SIKESRA_ROLE_DEFINITIONS,
  createSikesraAccessManagementModel,
  createSikesraAccessUserFormModel,
  createSikesraAccessUserRowModel,
  createSikesraAuditLogDetailModel,
  createSikesraAuditLogRowModel,
  createSikesraAuditLogTableModel,
  createSikesraPermissionMatrixModel,
} from "../../src/plugins/sikesra-admin/governance-workflows.mjs";

test("SIKESRA audit action labels cover core governance actions", () => {
  assert.equal(SIKESRA_AUDIT_ACTION_LABELS["sikesra.reports.export"], "Export Laporan");
  assert.equal(SIKESRA_AUDIT_ACTION_LABELS["sikesra.access.role_assign"], "Tetapkan Peran");
  assert.equal(SIKESRA_AUDIT_ACTION_LABELS["sikesra.reference.lifecycle_update"], "Ubah Lifecycle Referensi Agama");
});

test("SIKESRA audit log table requires audit permission", () => {
  const denied = createSikesraAuditLogTableModel({ grantedPermissions: [] });
  const allowed = createSikesraAuditLogTableModel({
    grantedPermissions: ["sikesra.audit.read"],
    rows: [],
  });

  assert.equal(denied.canRender, false);
  assert.match(denied.accessDeniedState, /tidak memiliki izin/i);
  assert.equal(allowed.canRender, true);
  assert.ok(allowed.columns.some((column) => column.key === "actionLabel"));
});

test("SIKESRA audit log detail masks sensitive before/after values without explicit permission", () => {
  const denied = createSikesraAuditLogDetailModel({
    grantedPermissions: ["sikesra.audit.read"],
    beforeAfter: [{ fieldLabel: "NIK", fieldType: "nik", before: "1234567890123456", after: "1234567890123457" }],
  });
  const allowed = createSikesraAuditLogDetailModel({
    grantedPermissions: ["sikesra.audit.read", "sikesra.audit.sensitive.read"],
    beforeAfter: [{ fieldLabel: "NIK", fieldType: "nik", before: "1234567890123456", after: "1234567890123457" }],
  });

  assert.notEqual(denied.beforeAfter[0].before, "1234567890123456");
  assert.equal(allowed.beforeAfter[0].before, "1234567890123456");
});

test("SIKESRA audit log row localizes action label", () => {
  const row = createSikesraAuditLogRowModel({ actionKey: "sikesra.documents.preview" });
  assert.equal(row.actionLabel, "Pratinjau Dokumen");
});

test("SIKESRA role definitions include protected and 2FA-sensitive roles", () => {
  const superAdmin = SIKESRA_ROLE_DEFINITIONS.find((role) => role.key === "super_admin");
  const auditor = SIKESRA_ROLE_DEFINITIONS.find((role) => role.key === "auditor");
  assert.equal(superAdmin.protectedRole, true);
  assert.equal(superAdmin.requires2FA, true);
  assert.equal(auditor.requires2FA, true);
});

test("SIKESRA access management requires access.manage permission", () => {
  const denied = createSikesraAccessManagementModel({ grantedPermissions: [] });
  const allowed = createSikesraAccessManagementModel({
    grantedPermissions: ["sikesra.access.manage"],
    users: [],
  });

  assert.equal(denied.canRender, false);
  assert.match(denied.accessDeniedState, /tidak memiliki izin/i);
  assert.equal(allowed.canRender, true);
});

test("SIKESRA access user row includes role, region scope, account status, and 2FA state", () => {
  const row = createSikesraAccessUserRowModel({
    roleKey: "admin_sikesra",
    accountStatus: "active",
    twoFactorEnabled: true,
    regionScope: "Kec. Arut Selatan",
  });

  assert.equal(row.roleLabel, "Admin SIKESRA");
  assert.equal(row.accountStatus, "active");
  assert.equal(row.twoFactorEnabled, true);
  assert.equal(row.twoFactorRequired, true);
});

test("SIKESRA access user form hides protected roles without protected-role authority", () => {
  const form = createSikesraAccessUserFormModel({
    grantedPermissions: ["sikesra.access.manage"],
    currentAdminAuthority: { canAssignProtectedRoles: false, maxRegionLevel: "kecamatan" },
    selectedUser: { roleKey: "admin_sikesra", regionScope: "Kec. Arut Selatan" },
  });

  assert.ok(form.availableRoles.every((role) => role.key !== "super_admin"));
  assert.match(form.sensitiveRoleWarning, /2FA aktif/i);
  assert.equal(form.regionScopeAssignment.maxAssignableRegionLevel, "kecamatan");
});

test("SIKESRA permission matrix exposes operator-friendly permission labels", () => {
  const matrix = createSikesraPermissionMatrixModel({ currentAdminAuthority: {} });
  assert.ok(matrix.permissions.some((permission) => permission.label === "Lihat Dashboard SIKESRA"));
});

test("SIKESRA account statuses cover required lifecycle values", () => {
  assert.deepEqual(SIKESRA_ACCOUNT_STATUSES, ["active", "inactive", "suspended", "invited"]);
});
