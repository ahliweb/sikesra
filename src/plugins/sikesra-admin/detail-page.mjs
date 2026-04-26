/**
 * SIKESRA Generic Detail Page Models
 *
 * Framework-neutral view models for the SIKESRA entity detail page pattern.
 * Implements: ahliweb/sikesra#19
 *
 * Design constraints:
 * - Sensitive fields are masked by default; revealing requires explicit permission.
 * - Reveal and export actions are prepared for audit-log hooks (caller must log).
 * - Read-only mode is enforced for viewer/auditor roles via action filtering.
 * - Status-based action gating prevents illegal state transitions in the UI.
 * - Tab availability respects permissions; tabs with no accessible content are hidden.
 * - Individual-level religion data requires `sikesra.registry.religion.read`.
 */

import { SIKESRA_MODULE_LABELS, SIKESRA_VULNERABLE_PERSON_MODULES } from "./dashboard-widgets.mjs";
import { SIKESRA_REGISTRY_VERIFICATION_STATUSES } from "./registry-list.mjs";

// ---------------------------------------------------------------------------
// Detail page tab definitions
// ---------------------------------------------------------------------------

export const SIKESRA_DETAIL_TABS = [
  { key: "ringkasan", label: "Ringkasan", permission: "sikesra.registry.read" },
  { key: "data_utama", label: "Data Utama", permission: "sikesra.registry.read" },
  { key: "personil", label: "Personil", permission: "sikesra.registry.read" },
  { key: "dokumen", label: "Dokumen", permission: "sikesra.documents.read" },
  { key: "verifikasi", label: "Verifikasi", permission: "sikesra.verification.read" },
  { key: "riwayat_perubahan", label: "Riwayat Perubahan", permission: "sikesra.audit.read" },
  { key: "catatan", label: "Catatan", permission: "sikesra.registry.read" },
];

/**
 * Returns tabs visible to the given permission set.
 *
 * @param {string[]} grantedPermissions
 * @returns {Object[]}
 */
export function getSikesraDetailVisibleTabs(grantedPermissions) {
  const permissions = new Set(grantedPermissions);
  return SIKESRA_DETAIL_TABS.filter((tab) => permissions.has(tab.permission));
}

// ---------------------------------------------------------------------------
// Detail header model
// ---------------------------------------------------------------------------

/**
 * Creates the detail page header view model.
 *
 * @param {Object} entity - Raw entity record from API
 * @param {string[]} grantedPermissions
 * @returns {Object}
 */
export function createSikesraDetailHeader(entity, grantedPermissions = []) {
  const permissions = new Set(grantedPermissions);
  const moduleKey = entity.module_key ?? "";
  const isVulnerable = SIKESRA_VULNERABLE_PERSON_MODULES.has(moduleKey);

  // Religion data requires explicit elevated permission.
  const canReadReligion = permissions.has("sikesra.registry.religion.read");

  return {
    id_sikesra: entity.id_sikesra ?? null,
    name: entity.name ?? null,
    module_key: moduleKey,
    module_label: SIKESRA_MODULE_LABELS[moduleKey] ?? moduleKey,
    subtype_label: entity.subtype_label ?? null,
    data_status: entity.data_status ?? null,
    verification_status: entity.verification_status ?? null,
    wilayah_official: entity.wilayah_official ?? null,
    custom_region: entity.custom_region ?? null,
    last_updated_at: entity.last_updated_at ?? null,
    // Religion shown only with explicit permission; masked otherwise.
    agama: canReadReligion ? (entity.agama ?? null) : null,
    agamaIsRevealed: canReadReligion,
    isVulnerablePerson: isVulnerable,
  };
}

// ---------------------------------------------------------------------------
// Detail action model
// ---------------------------------------------------------------------------

/**
 * Detail page action keys and their permission/status requirements.
 */
export const SIKESRA_DETAIL_ACTIONS = [
  { key: "edit", label: "Edit Data", permission: "sikesra.registry.write", enabledWhen: ["draft", "need_revision"], auditRequired: false },
  { key: "submit", label: "Ajukan Verifikasi", permission: "sikesra.registry.write", enabledWhen: ["draft", "need_revision"], auditRequired: false },
  { key: "verify", label: "Verifikasi", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"], auditRequired: true },
  { key: "request_revision", label: "Minta Perbaikan", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"], auditRequired: true },
  { key: "reject", label: "Tolak", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"], auditRequired: true },
  { key: "upload_document", label: "Unggah Dokumen", permission: "sikesra.documents.write", enabledWhen: ["draft", "need_revision", "submitted"], auditRequired: false },
  { key: "export_record", label: "Export Data", permission: "sikesra.reports.export", enabledAlways: true, auditRequired: true },
  { key: "reveal_sensitive", label: "Tampilkan Data Sensitif", permission: "sikesra.registry.sensitive.read", enabledAlways: true, auditRequired: true },
  { key: "archive", label: "Arsipkan", permission: "sikesra.registry.manage", enabledWhen: ["verified", "rejected"], auditRequired: false },
];

/**
 * Returns the list of visible, status-gated action buttons for the detail page.
 *
 * @param {Object} entity
 * @param {string[]} grantedPermissions
 * @returns {Object[]} Array of { key, label, enabled, auditRequired }
 */
export function createSikesraDetailActions(entity, grantedPermissions = []) {
  const permissions = new Set(grantedPermissions);
  const status = entity.verification_status ?? "draft";

  return SIKESRA_DETAIL_ACTIONS
    .filter((action) => permissions.has(action.permission))
    .map((action) => ({
      key: action.key,
      label: action.label,
      enabled: action.enabledAlways ? true : (action.enabledWhen ?? []).includes(status),
      auditRequired: action.auditRequired,
    }));
}

// ---------------------------------------------------------------------------
// Sensitive field reveal model for detail page
// ---------------------------------------------------------------------------

/**
 * Field keys that are considered sensitive at the detail page level.
 * These are masked by default and require `sikesra.registry.sensitive.read`.
 */
export const SIKESRA_DETAIL_SENSITIVE_FIELD_KEYS = [
  "nik",
  "kia",
  "no_kk",
  "tanggal_lahir",
  "tempat_lahir",
  "nomor_hp",
  "alamat_lengkap",
  "nama_ibu_kandung",
  "nama_ayah",
  "diagnosa_kesehatan",
  "catatan_disabilitas",
  "catatan_kesehatan",
];

/**
 * Creates a masked field display model for a single sensitive field.
 *
 * @param {string} fieldKey
 * @param {*} rawValue
 * @param {Set<string>} permissionSet
 * @returns {Object}
 */
export function createSikesraDetailSensitiveFieldModel(fieldKey, rawValue, permissionSet) {
  const canReveal = permissionSet.has("sikesra.registry.sensitive.read");
  return {
    fieldKey,
    isRevealed: canReveal,
    displayValue: canReveal ? rawValue : "••••••••",
    requiresAuditOnReveal: true,
    // Callers that set isRevealed=true MUST emit an audit log entry.
    auditEventType: "sensitive_field_revealed",
  };
}

// ---------------------------------------------------------------------------
// Full detail page model
// ---------------------------------------------------------------------------

/**
 * Creates the complete detail page view model.
 *
 * @param {Object} opts
 * @param {Object} opts.entity - Raw entity record from API
 * @param {string[]} opts.grantedPermissions
 * @param {"idle"|"loading"|"loaded"|"error"} [opts.loadState]
 * @param {string} [opts.activeTab] - Key of the currently active tab
 * @returns {Object}
 */
export function createSikesraDetailPageModel(opts) {
  const permissions = opts.grantedPermissions ?? [];
  const permissionSet = new Set(permissions);
  const entity = opts.entity ?? {};

  const canRead = permissionSet.has("sikesra.registry.read");
  const tabs = getSikesraDetailVisibleTabs(permissions);
  const defaultTab = tabs[0]?.key ?? "ringkasan";

  return {
    canRender: canRead,
    loadState: opts.loadState ?? "idle",
    activeTab: opts.activeTab ?? defaultTab,
    tabs,
    header: canRead ? createSikesraDetailHeader(entity, permissions) : null,
    actions: canRead ? createSikesraDetailActions(entity, permissions) : [],
    // Sensitive field models for the Data Utama tab.
    sensitiveFields: SIKESRA_DETAIL_SENSITIVE_FIELD_KEYS.map((key) =>
      createSikesraDetailSensitiveFieldModel(key, entity[key] ?? null, permissionSet)
    ),
    // Verification status options for verifier actions.
    verificationStatuses: SIKESRA_REGISTRY_VERIFICATION_STATUSES,
    // Backend note: full audit log tab data requires ahliweb/sikesra backend work.
    auditLogNote: "Riwayat perubahan memerlukan dukungan backend. Lihat ahliweb/sikesra#34.",
  };
}
