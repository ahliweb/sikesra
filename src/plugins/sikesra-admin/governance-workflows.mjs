import { SIKESRA_ADMIN_PERMISSIONS } from "./index.mjs";
import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";

export const SIKESRA_AUDIT_ACTION_LABELS = Object.freeze({
  "sikesra.documents.preview": "Pratinjau Dokumen",
  "sikesra.documents.replace": "Ganti Dokumen",
  "sikesra.import.promote": "Promosikan Import",
  "sikesra.reports.export": "Export Laporan",
  "sikesra.verification.verified": "Verifikasi Data",
  "sikesra.verification.need_revision": "Butuh Perbaikan",
  "sikesra.verification.rejected": "Tolak Data",
  "sikesra.access.user_update": "Ubah Akses Pengguna",
  "sikesra.access.role_assign": "Tetapkan Peran",
  "sikesra.access.region_scope_assign": "Tetapkan Cakupan Wilayah",
  "sikesra.access.2fa_policy_update": "Ubah Kebijakan 2FA",
});

export const SIKESRA_ACCOUNT_STATUSES = Object.freeze([
  "active",
  "inactive",
  "suspended",
  "invited",
]);

export const SIKESRA_ROLE_DEFINITIONS = Object.freeze([
  role("super_admin", "Super Admin", { protectedRole: true, requires2FA: true }),
  role("admin_sikesra", "Admin SIKESRA", { requires2FA: true }),
  role("auditor", "Auditor", { requires2FA: true }),
  role("verifikator", "Verifikator"),
  role("petugas", "Petugas"),
  role("viewer", "Viewer"),
]);

export function createSikesraAuditLogTableModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canRead = permissionSet.has("sikesra.audit.read");
  const canRevealSensitive = permissionSet.has("sikesra.audit.sensitive.read");

  return {
    implementationIssue: "ahliweb/sikesra#34",
    canRender: canRead,
    columns: [
      { key: "occurredAt", label: "Waktu" },
      { key: "userLabel", label: "Pengguna" },
      { key: "roleLabel", label: "Peran" },
      { key: "moduleLabel", label: "Modul" },
      { key: "entityLabel", label: "Entitas" },
      { key: "actionLabel", label: "Aksi" },
      { key: "summary", label: "Ringkasan" },
      { key: "ipAddress", label: "IP" },
      { key: "deviceLabel", label: "Perangkat" },
      { key: "detail", label: "Detail" },
    ],
    filters: {
      moduleKey: input.moduleKey ?? null,
      userId: input.userId ?? null,
      actionKey: input.actionKey ?? null,
      regionScope: input.regionScope ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    },
    rows: (input.rows ?? []).map((row) => createSikesraAuditLogRowModel({
      ...row,
      canRevealSensitive,
    })),
    emptyState: canRead && (input.rows ?? []).length === 0 ? "Belum ada log audit yang sesuai filter." : null,
    accessDeniedState: !canRead ? "Anda tidak memiliki izin untuk melihat log audit SIKESRA." : null,
  };
}

export function createSikesraAuditLogRowModel(input = {}) {
  return {
    id: input.id ?? null,
    occurredAt: input.occurredAt ?? null,
    userLabel: input.userLabel ?? null,
    roleLabel: input.roleLabel ?? null,
    moduleLabel: input.moduleLabel ?? null,
    entityLabel: input.entityLabel ?? null,
    actionKey: input.actionKey ?? null,
    actionLabel: SIKESRA_AUDIT_ACTION_LABELS[input.actionKey] ?? input.actionKey ?? "Aksi Audit",
    summary: input.summary ?? null,
    ipAddress: input.ipAddress ?? null,
    deviceLabel: input.deviceLabel ?? null,
    canOpenDetail: true,
  };
}

export function createSikesraAuditLogDetailModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canRead = permissionSet.has("sikesra.audit.read");
  const canRevealSensitive = permissionSet.has("sikesra.audit.sensitive.read");

  return {
    implementationIssue: "ahliweb/sikesra#34",
    canRender: canRead,
    event: {
      id: input.id ?? null,
      occurredAt: input.occurredAt ?? null,
      actionLabel: SIKESRA_AUDIT_ACTION_LABELS[input.actionKey] ?? input.actionKey ?? "Aksi Audit",
      summary: input.summary ?? null,
      actor: input.actor ?? null,
    },
    beforeAfter: (input.beforeAfter ?? []).map((change) => ({
      fieldLabel: change.fieldLabel,
      before: maskAuditValue(change.before, change.fieldType, canRevealSensitive),
      after: maskAuditValue(change.after, change.fieldType, canRevealSensitive),
    })),
    regionScope: input.regionScope ?? null,
    accessDeniedState: !canRead ? "Detail audit hanya tersedia untuk admin/auditor berwenang." : null,
  };
}

export function createSikesraAccessManagementModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canManage = permissionSet.has("sikesra.access.manage");

  return {
    implementationIssue: "ahliweb/sikesra#35",
    canRender: canManage,
    accessDeniedState: !canManage ? "Anda tidak memiliki izin untuk mengelola akses SIKESRA." : null,
    users: (input.users ?? []).map((user) => createSikesraAccessUserRowModel({
      ...user,
      grantedPermissions: input.grantedPermissions,
    })),
    roles: SIKESRA_ROLE_DEFINITIONS,
    permissionMatrix: createSikesraPermissionMatrixModel({
      currentAdminAuthority: input.currentAdminAuthority,
    }),
    form: createSikesraAccessUserFormModel({
      selectedUser: input.selectedUser,
      currentAdminAuthority: input.currentAdminAuthority,
      grantedPermissions: input.grantedPermissions,
    }),
  };
}

export function createSikesraAccessUserRowModel(input = {}) {
  const roleDefinition = getRoleDefinition(input.roleKey);

  return {
    id: input.id ?? null,
    name: input.name ?? null,
    emailOrUsername: input.emailOrUsername ?? null,
    roleLabel: roleDefinition.label,
    roleKey: roleDefinition.key,
    regionScope: input.regionScope ?? null,
    accountStatus: normalizeAccountStatus(input.accountStatus),
    twoFactorEnabled: input.twoFactorEnabled === true,
    twoFactorRequired: roleDefinition.requires2FA,
    lastLoginAt: input.lastLoginAt ?? null,
    protectedRole: roleDefinition.protectedRole,
  };
}

export function createSikesraAccessUserFormModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canManage = permissionSet.has("sikesra.access.manage");
  const authority = input.currentAdminAuthority ?? {};
  const selectedUser = input.selectedUser ?? {};

  return {
    canEdit: canManage,
    selectedUserId: selectedUser.id ?? null,
    availableRoles: SIKESRA_ROLE_DEFINITIONS.filter((role) => canAssignRole(role, authority)).map((role) => ({
      key: role.key,
      label: role.label,
      protectedRole: role.protectedRole,
      requires2FA: role.requires2FA,
    })),
    regionScopeAssignment: {
      current: selectedUser.regionScope ?? null,
      maxAssignableRegionLevel: authority.maxRegionLevel ?? "desa_kelurahan",
      constrainedByAuthority: true,
      auditAction: canManage ? "sikesra.access.region_scope_assign" : null,
    },
    sensitiveRoleWarning: selectedUser.roleKey && getRoleDefinition(selectedUser.roleKey).requires2FA
      ? "Peran sensitif harus menggunakan 2FA aktif sebelum perubahan disimpan."
      : null,
    auditActions: {
      roleAssign: canManage ? "sikesra.access.role_assign" : null,
      userUpdate: canManage ? "sikesra.access.user_update" : null,
      twoFactorPolicyUpdate: canManage ? "sikesra.access.2fa_policy_update" : null,
    },
  };
}

export function createSikesraPermissionMatrixModel(input = {}) {
  const authority = input.currentAdminAuthority ?? {};
  return {
    permissions: SIKESRA_ADMIN_PERMISSIONS.map((permission) => ({
      code: permission.code,
      label: permission.label,
      description: permission.description,
      assignable: authority.canAssignPermissions !== false,
    })),
  };
}

function maskAuditValue(value, fieldType, canReveal) {
  return createSikesraSensitiveFieldProps({
    fieldType: fieldType ?? "nik",
    classification: "restricted",
    value: value ?? "",
    canReveal,
    revealRequested: canReveal,
    context: "Audit Log",
  }).displayValue;
}

function getRoleDefinition(roleKey) {
  return SIKESRA_ROLE_DEFINITIONS.find((role) => role.key === roleKey) ?? SIKESRA_ROLE_DEFINITIONS[4];
}

function canAssignRole(role, authority) {
  if (authority.canAssignProtectedRoles === true) return true;
  if (role.protectedRole) return false;
  return true;
}

function normalizeAccountStatus(value) {
  const normalized = String(value ?? "inactive").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_ACCOUNT_STATUSES.includes(normalized) ? normalized : "inactive";
}

function role(key, label, options = {}) {
  return Object.freeze({
    key,
    label,
    protectedRole: options.protectedRole === true,
    requires2FA: options.requires2FA === true,
  });
}
