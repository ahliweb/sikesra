// SIKESRA Permission Catalog
// All permissions must use the namespace: awcms:sikesra:<resource>:<action>
// Source: docs/sikesra/06_security_rbac_abac.md

export const SIKESRA_PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: "awcms:sikesra:dashboard:read",

  // Entity
  ENTITY_READ: "awcms:sikesra:entity:read",
  ENTITY_CREATE: "awcms:sikesra:entity:create",
  ENTITY_UPDATE: "awcms:sikesra:entity:update",
  ENTITY_DELETE: "awcms:sikesra:entity:delete",
  ENTITY_RESTORE: "awcms:sikesra:entity:restore",

  // Code
  CODE_GENERATE: "awcms:sikesra:code:generate",
  CODE_CORRECT: "awcms:sikesra:code:correct",

  // Verification
  VERIFICATION_SUBMIT: "awcms:sikesra:verification:submit",
  VERIFICATION_VERIFY: "awcms:sikesra:verification:verify",

  // Document
  DOCUMENT_UPLOAD: "awcms:sikesra:document:upload",
  DOCUMENT_PRIVATE_DOWNLOAD: "awcms:sikesra:document:private_download",
  DOCUMENT_VERIFY: "awcms:sikesra:document:verify",
  DOCUMENT_REPLACE: "awcms:sikesra:document:replace",

  // Import
  IMPORT_CREATE: "awcms:sikesra:import:create",
  IMPORT_READ: "awcms:sikesra:import:read",
  IMPORT_PROMOTE: "awcms:sikesra:import:promote",

  // Duplicate
  DUPLICATE_READ: "awcms:sikesra:duplicate:read",
  DUPLICATE_DECIDE: "awcms:sikesra:duplicate:decide",
  DUPLICATE_OVERRIDE: "awcms:sikesra:duplicate:override",

  // Export
  EXPORT_CREATE: "awcms:sikesra:export:create",
  EXPORT_RESTRICTED: "awcms:sikesra:export:restricted",
  EXPORT_AUDIT: "awcms:sikesra:export:audit",

  // Region
  REGION_READ: "awcms:sikesra:region:read",
  REGION_MANAGE: "awcms:sikesra:region:manage",

  // Attribute
  ATTRIBUTE_READ: "awcms:sikesra:attribute:read",
  ATTRIBUTE_WRITE: "awcms:sikesra:attribute:write",

  // Policy
  POLICY_READ: "awcms:sikesra:policy:read",
  POLICY_WRITE: "awcms:sikesra:policy:write",
  POLICY_PREVIEW: "awcms:sikesra:policy:preview",

  // Audit
  AUDIT_READ: "awcms:sikesra:audit:read",
  AUDIT_EXPORT: "awcms:sikesra:audit:export",

  // Settings
  SETTINGS_READ: "awcms:sikesra:settings:read",
  SETTINGS_UPDATE: "awcms:sikesra:settings:update",

  // Sensitive
  SENSITIVE_REVEAL: "awcms:sikesra:sensitive:reveal",
  SENSITIVE_HIGHLY_RESTRICTED_READ: "awcms:sikesra:sensitive:highly_restricted_read",
} as const;

export type SikesraPermission = (typeof SIKESRA_PERMISSIONS)[keyof typeof SIKESRA_PERMISSIONS];

export const SIKESRA_PERMISSION_LIST: SikesraPermission[] = Object.values(SIKESRA_PERMISSIONS);
