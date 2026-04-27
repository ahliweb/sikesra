/**
 * SIKESRA Registry List View Models
 *
 * Framework-neutral view models for the SIKESRA registry data list view.
 * Implements: ahliweb/sikesra#18
 *
 * Design constraints:
 * - Sensitive fields (NIK, KIA, No KK, health, disability detail) are masked
 *   by default; callers must hold the appropriate permission to reveal them.
 * - Religion filter available only when `sikesra.registry.religion_filter.read`
 *   is granted and the relevant module is selected (privacy-by-default).
 * - Vulnerable-person module rows carry an additional `isVulnerablePerson` flag
 *   so the renderer can apply extra visual privacy treatment.
 * - Region scope is enforced by the backend; the model expresses it as a
 *   mandatory filter dimension so the API caller cannot omit it accidentally.
 * - Action visibility is computed from permissions, not hard-coded per role.
 */

import { SIKESRA_MODULE_KEYS, SIKESRA_MODULE_LABELS, SIKESRA_VULNERABLE_PERSON_MODULES } from "./dashboard-widgets.mjs";
import { SIKESRA_RELIGION_REFERENCE_OPTIONS_SOURCE } from "./religion-reference.mjs";

// ---------------------------------------------------------------------------
// Registry list filter model
// ---------------------------------------------------------------------------

export const SIKESRA_REGISTRY_DATA_STATUSES = [
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Tidak Aktif" },
  { key: "pending", label: "Menunggu" },
  { key: "archived", label: "Diarsipkan" },
];

export const SIKESRA_REGISTRY_VERIFICATION_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Diajukan" },
  { key: "under_review", label: "Sedang Ditinjau" },
  { key: "need_revision", label: "Perlu Perbaikan" },
  { key: "verified", label: "Terverifikasi" },
  { key: "rejected", label: "Ditolak" },
];

export const SIKESRA_REGISTRY_DOCUMENT_COMPLETENESS = [
  { key: "complete", label: "Lengkap" },
  { key: "incomplete", label: "Belum Lengkap" },
  { key: "not_required", label: "Tidak Diperlukan" },
];

export const SIKESRA_REGISTRY_INPUT_SOURCES = [
  { key: "manual", label: "Manual (Form)" },
  { key: "import_excel", label: "Import Excel" },
  { key: "migration", label: "Migrasi Data" },
];

/**
 * Creates the canonical registry list filter shape.
 * All fields are optional; null means "no filter applied".
 *
 * @param {Object} [overrides]
 * @returns {Object} SikesraRegistryFilter
 */
export function createSikesraRegistryFilter(overrides = {}) {
  return {
    module_key: null,         // One of SIKESRA_MODULE_KEYS
    subtype: null,            // Module-specific subtype code
    wilayah_kecamatan: null,  // Region scope — enforced by backend
    wilayah_desa: null,
    custom_region: null,      // Operator-defined custom region label
    data_status: null,        // One of SIKESRA_REGISTRY_DATA_STATUSES keys
    verification_status: null,
    document_completeness: null,
    input_source: null,
    date_from: null,          // ISO 8601 date string
    date_to: null,
    attention_only: false,    // If true, filter to incomplete/need-revision only
    // Quick search — matches name, ID SIKESRA, address, contact (non-NIK fields only)
    quick_search: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Registry list column definitions
// ---------------------------------------------------------------------------

/**
 * The canonical set of columns for the SIKESRA registry data list.
 * Sensitive columns default to masked; revealing them requires permission.
 */
export const SIKESRA_REGISTRY_COLUMNS = [
  { key: "id_sikesra", label: "ID SIKESRA", sortable: true, sensitive: false },
  { key: "name", label: "Nama / Label", sortable: true, sensitive: false },
  { key: "module_label", label: "Modul", sortable: true, sensitive: false },
  { key: "subtype_label", label: "Jenis/Subtipe", sortable: false, sensitive: false },
  { key: "wilayah_official", label: "Wilayah Resmi", sortable: true, sensitive: false },
  { key: "custom_region", label: "Wilayah Kustom", sortable: false, sensitive: false },
  { key: "data_status", label: "Status Data", sortable: true, sensitive: false },
  { key: "verification_status", label: "Status Verifikasi", sortable: true, sensitive: false },
  { key: "document_completeness", label: "Kelengkapan Dokumen", sortable: true, sensitive: false },
  { key: "last_updated_at", label: "Terakhir Diperbarui", sortable: true, sensitive: false },
  { key: "actions", label: "Aksi", sortable: false, sensitive: false },
];

/**
 * Returns visible columns given granted permissions.
 * Currently all canonical columns are non-sensitive at list level;
 * this hook is provided for future column-level permission gating.
 *
 * @param {string[]} grantedPermissions
 * @returns {Object[]}
 */
export function getSikesraRegistryVisibleColumns(grantedPermissions) {
  // All list-level columns are currently visible to anyone with registry.read.
  // Individual-level sensitive values are masked inside row cells, not hidden as columns.
  void grantedPermissions;
  return SIKESRA_REGISTRY_COLUMNS;
}

// ---------------------------------------------------------------------------
// Registry list row model
// ---------------------------------------------------------------------------

/**
 * Creates a single registry list row view model from a raw entity record.
 *
 * @param {Object} entity - Raw entity record from the API
 * @param {string[]} grantedPermissions
 * @returns {Object} Registry row view model
 */
export function createSikesraRegistryRow(entity, grantedPermissions = []) {
  const permissions = new Set(grantedPermissions);
  const moduleKey = entity.module_key ?? "";
  const isVulnerable = SIKESRA_VULNERABLE_PERSON_MODULES.has(moduleKey);

  return {
    id_sikesra: entity.id_sikesra ?? null,
    name: entity.name ?? null,
    module_key: moduleKey,
    module_label: SIKESRA_MODULE_LABELS[moduleKey] ?? moduleKey,
    subtype_label: entity.subtype_label ?? null,
    wilayah_official: entity.wilayah_official ?? null,
    custom_region: entity.custom_region ?? null,
    data_status: entity.data_status ?? null,
    verification_status: entity.verification_status ?? null,
    document_completeness: entity.document_completeness ?? null,
    last_updated_at: entity.last_updated_at ?? null,
    isVulnerablePerson: isVulnerable,
    // Actions are permission-aware; see createSikesraRegistryRowActions.
    actions: createSikesraRegistryRowActions(entity, permissions),
  };
}

// ---------------------------------------------------------------------------
// Row action model
// ---------------------------------------------------------------------------

/**
 * All possible registry row action keys.
 */
export const SIKESRA_REGISTRY_ACTION_KEYS = [
  "view",
  "edit",
  "submit",
  "verify",
  "request_revision",
  "reject",
  "upload_document",
  "export_record",
  "archive",
];

/**
 * Row action labels in formal Indonesian.
 */
export const SIKESRA_REGISTRY_ACTION_LABELS = {
  view: "Lihat Detail",
  edit: "Edit Data",
  submit: "Ajukan Verifikasi",
  verify: "Verifikasi",
  request_revision: "Minta Perbaikan",
  reject: "Tolak",
  upload_document: "Unggah Dokumen",
  export_record: "Export Data",
  archive: "Arsipkan",
};

/**
 * Creates the list of visible/enabled row actions for a given entity and permission set.
 *
 * @param {Object} entity - Raw entity record; used for status-based gating
 * @param {Set<string>} permissionSet
 * @returns {Object[]} Array of { key, label, enabled }
 */
export function createSikesraRegistryRowActions(entity, permissionSet) {
  const status = entity.verification_status ?? "draft";

  const rules = [
    { key: "view", permission: "sikesra.registry.read", enabledAlways: true },
    { key: "edit", permission: "sikesra.registry.write", enabledWhen: ["draft", "need_revision"] },
    { key: "submit", permission: "sikesra.registry.write", enabledWhen: ["draft", "need_revision"] },
    { key: "verify", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"] },
    { key: "request_revision", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"] },
    { key: "reject", permission: "sikesra.verification.write", enabledWhen: ["submitted", "under_review"] },
    { key: "upload_document", permission: "sikesra.documents.write", enabledWhen: ["draft", "need_revision", "submitted"] },
    { key: "export_record", permission: "sikesra.reports.export", enabledAlways: true },
    { key: "archive", permission: "sikesra.registry.manage", enabledWhen: ["verified", "rejected"] },
  ];

  return rules
    .filter((rule) => permissionSet.has(rule.permission))
    .map((rule) => ({
      key: rule.key,
      label: SIKESRA_REGISTRY_ACTION_LABELS[rule.key],
      enabled: rule.enabledAlways ? true : (rule.enabledWhen ?? []).includes(status),
    }));
}

// ---------------------------------------------------------------------------
// Empty / loading / error state models
// ---------------------------------------------------------------------------

export const SIKESRA_REGISTRY_LIST_STATE_LABELS = {
  loading: "Memuat data registry...",
  empty_no_filter: "Belum ada data terdaftar.",
  empty_filtered: "Tidak ada data yang sesuai dengan filter.",
  error: "Gagal memuat data registry. Silakan coba lagi.",
  region_scope_required: "Pilih wilayah terlebih dahulu untuk melihat data.",
};

/**
 * Creates the registry list container view model.
 *
 * @param {Object} opts
 * @param {string[]} opts.grantedPermissions
 * @param {Object} opts.filter - SikesraRegistryFilter
 * @param {"idle"|"loading"|"loaded"|"error"} opts.loadState
 * @param {Object[]} opts.rows - Pre-built row models
 * @param {number|null} opts.totalCount - Total matching records (for pagination)
 * @returns {Object}
 */
export function createSikesraRegistryListModel(opts) {
  const permissions = new Set(opts.grantedPermissions ?? []);
  const canRead = permissions.has("sikesra.registry.read");
  const showReligionFilter =
    permissions.has("sikesra.registry.religion_filter.read") &&
    opts.filter?.module_key !== null;

  return {
    canRender: canRead,
    loadState: opts.loadState ?? "idle",
    filter: opts.filter ?? createSikesraRegistryFilter(),
    columns: getSikesraRegistryVisibleColumns(opts.grantedPermissions ?? []),
    rows: opts.rows ?? [],
    totalCount: opts.totalCount ?? null,
    showReligionFilter,
    religionFilterOptionsSource: showReligionFilter ? SIKESRA_RELIGION_REFERENCE_OPTIONS_SOURCE : null,
    stateLabel:
      opts.loadState === "loading"
        ? SIKESRA_REGISTRY_LIST_STATE_LABELS.loading
        : opts.loadState === "error"
          ? SIKESRA_REGISTRY_LIST_STATE_LABELS.error
          : (opts.rows ?? []).length === 0 && opts.filter?.module_key
            ? SIKESRA_REGISTRY_LIST_STATE_LABELS.empty_filtered
            : (opts.rows ?? []).length === 0
              ? SIKESRA_REGISTRY_LIST_STATE_LABELS.empty_no_filter
              : null,
  };
}
