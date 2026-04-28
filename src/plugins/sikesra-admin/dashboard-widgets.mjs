/**
 * SIKESRA Dashboard Widget Models
 *
 * Framework-neutral view models for the SIKESRA MVP dashboard.
 * Implements: ahliweb/sikesra#17
 *
 * Design constraints:
 * - No NIK/KIA, child personal data, disability personal data, or document
 *   previews are ever included in dashboard widget metadata.
 * - All widgets are permission-gated; callers must filter by granted permissions.
 * - Region scope is a first-class filter input, not an afterthought.
 * - Aggregates only — individual-level data never appears in widget payloads.
 * - Religion distribution data requires explicit `sikesra.dashboard.religion_aggregate.read`
 *   permission and must be suppressed otherwise (privacy-by-default).
 */

// ---------------------------------------------------------------------------
// Module keys — canonical identifiers used in stat cards and API params
// ---------------------------------------------------------------------------

export const SIKESRA_MODULE_KEYS = [
  "rumah_ibadah",
  "lembaga_keagamaan",
  "lembaga_pendidikan_keagamaan",
  "lembaga_kesejahteraan_sosial",
  "guru_agama",
  "anak_yatim",
  "disabilitas",
  "lansia_terlantar",
];

export const SIKESRA_MODULE_LABELS = {
  rumah_ibadah: "Rumah Ibadah",
  lembaga_keagamaan: "Lembaga Keagamaan",
  lembaga_pendidikan_keagamaan: "Lembaga Pendidikan Keagamaan",
  lembaga_kesejahteraan_sosial: "Lembaga Kesejahteraan Sosial",
  guru_agama: "Guru Agama",
  anak_yatim: "Anak Yatim/Piatu",
  disabilitas: "Penyandang Disabilitas",
  lansia_terlantar: "Lansia Terlantar",
};

// Modules that handle vulnerable-person data — stricter privacy defaults apply.
export const SIKESRA_VULNERABLE_PERSON_MODULES = new Set([
  "anak_yatim",
  "disabilitas",
  "lansia_terlantar",
]);

// ---------------------------------------------------------------------------
// Dashboard filter model
// ---------------------------------------------------------------------------

/**
 * Canonical filter shape for dashboard API requests.
 * All fields are optional; defaults represent "no filter applied".
 *
 * @typedef {Object} SikesraDashboardFilter
 * @property {string|null} wilayah_kecamatan - Kecamatan code or null
 * @property {string|null} wilayah_desa - Desa/kelurahan code or null
 * @property {string|null} module_key - One of SIKESRA_MODULE_KEYS or null
 * @property {string|null} data_status - e.g. "active"|"inactive"|"pending"|null
 * @property {string|null} period_year - Four-digit year string or null
 */

export function createSikesraDashboardFilter(overrides = {}) {
  return {
    wilayah_kecamatan: null,
    wilayah_desa: null,
    module_key: null,
    data_status: null,
    period_year: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Stat card model
// ---------------------------------------------------------------------------

/**
 * Creates a stat-card view model for a single SIKESRA module.
 *
 * @param {string} moduleKey - One of SIKESRA_MODULE_KEYS
 * @param {Object} [opts]
 * @param {number|null} [opts.total] - Aggregate count; null means not yet loaded
 * @param {string|null} [opts.trend] - "up"|"down"|"stable"|null
 * @param {string|null} [opts.regionScope] - Display label of active region scope
 * @param {boolean} [opts.isVulnerablePerson] - Override; defaults from module key
 * @returns {Object} Stat card view model
 */
export function createSikesraStatCard(moduleKey, opts = {}) {
  const isVulnerable =
    opts.isVulnerablePerson !== undefined
      ? opts.isVulnerablePerson
      : SIKESRA_VULNERABLE_PERSON_MODULES.has(moduleKey);

  return {
    moduleKey,
    label: SIKESRA_MODULE_LABELS[moduleKey] ?? moduleKey,
    total: opts.total ?? null,
    trend: opts.trend ?? null,
    regionScope: opts.regionScope ?? null,
    isVulnerablePerson: isVulnerable,
    // Clicking routes to registry list pre-filtered for this module.
    routeTarget: `/registry?module=${moduleKey}`,
    // Stat cards never contain individual-level fields.
    containsPersonalData: false,
  };
}

/**
 * Returns the full set of stat card stubs for all SIKESRA modules.
 * Totals start as null (loading state) and are filled in by the API layer.
 *
 * @param {string|null} regionScope
 * @returns {Object[]}
 */
export function createSikesraStatCards(regionScope = null) {
  return SIKESRA_MODULE_KEYS.map((key) =>
    createSikesraStatCard(key, { regionScope })
  );
}

// ---------------------------------------------------------------------------
// Verification status distribution widget
// ---------------------------------------------------------------------------

export const SIKESRA_VERIFICATION_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Diajukan" },
  { key: "under_review", label: "Sedang Ditinjau" },
  { key: "need_revision", label: "Perlu Perbaikan" },
  { key: "verified", label: "Terverifikasi" },
  { key: "rejected", label: "Ditolak" },
];

/**
 * Creates a verification-status distribution widget model.
 *
 * @param {Object} [counts] - Map of status key → count; missing keys default to null.
 * @param {string|null} [moduleKey] - If provided, scopes display label.
 * @returns {Object}
 */
export function createVerificationStatusWidget(counts = {}, moduleKey = null) {
  return {
    widgetType: "verification_status_distribution",
    moduleKey,
    moduleLabel: moduleKey ? (SIKESRA_MODULE_LABELS[moduleKey] ?? moduleKey) : null,
    statuses: SIKESRA_VERIFICATION_STATUSES.map(({ key, label }) => ({
      key,
      label,
      count: counts[key] ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Region recap widget (per-kecamatan/desa counts)
// ---------------------------------------------------------------------------

/**
 * Creates a region recap row model used in the kecamatan/desa recap table widget.
 *
 * @param {Object} opts
 * @param {string} opts.regionCode
 * @param {string} opts.regionLabel
 * @param {string} opts.regionLevel - "kecamatan"|"desa"
 * @param {number|null} [opts.totalData]
 * @param {number|null} [opts.totalVerified]
 * @param {number|null} [opts.totalIncomplete]
 * @returns {Object}
 */
export function createRegionRecapRow(opts) {
  return {
    regionCode: opts.regionCode,
    regionLabel: opts.regionLabel,
    regionLevel: opts.regionLevel,
    totalData: opts.totalData ?? null,
    totalVerified: opts.totalVerified ?? null,
    totalIncomplete: opts.totalIncomplete ?? null,
    // No individual-level fields here.
    containsPersonalData: false,
  };
}

// ---------------------------------------------------------------------------
// Attention widgets (dokumen belum lengkap / data perlu perbaikan)
// ---------------------------------------------------------------------------

/**
 * Creates a module-level attention summary entry (not individual records).
 *
 * @param {string} moduleKey
 * @param {number|null} incompleteDocuments
 * @param {number|null} needRevision
 * @returns {Object}
 */
export function createAttentionSummaryEntry(
  moduleKey,
  incompleteDocuments = null,
  needRevision = null
) {
  return {
    widgetType: "attention_summary_entry",
    moduleKey,
    moduleLabel: SIKESRA_MODULE_LABELS[moduleKey] ?? moduleKey,
    incompleteDocuments,
    needRevision,
    routeTarget: `/registry?module=${moduleKey}&attention=true`,
    containsPersonalData: false,
  };
}

// ---------------------------------------------------------------------------
// Recent activity timeline widget
// ---------------------------------------------------------------------------

/**
 * Activity event types that are safe to surface in the dashboard timeline.
 * Individual-level data changes (e.g. field diffs) are intentionally excluded;
 * only operation-level events are surfaced here.
 */
export const SIKESRA_SAFE_ACTIVITY_EVENT_TYPES = [
  "record_created",
  "record_submitted",
  "record_verified",
  "record_need_revision",
  "record_rejected",
  "document_uploaded",
  "import_completed",
  "report_exported",
];

/**
 * Creates a single recent activity timeline item.
 * Individual personal data (name, NIK, etc.) must NOT be passed here.
 *
 * @param {Object} opts
 * @param {string} opts.eventType - Must be one of SIKESRA_SAFE_ACTIVITY_EVENT_TYPES
 * @param {string} opts.moduleKey
 * @param {string} opts.entityId - Opaque public ID (ID SIKESRA), not NIK
 * @param {string} opts.actorRole - Role label, not actor name
 * @param {string} opts.occurredAt - ISO 8601 timestamp string
 * @param {string|null} [opts.regionLabel]
 * @returns {Object}
 */
export function createActivityTimelineItem(opts) {
  if (!SIKESRA_SAFE_ACTIVITY_EVENT_TYPES.includes(opts.eventType)) {
    throw new Error(
      `Unsafe activity event type: "${opts.eventType}". Only aggregate/operation events are allowed on the dashboard timeline.`
    );
  }
  return {
    widgetType: "activity_timeline_item",
    eventType: opts.eventType,
    moduleKey: opts.moduleKey,
    moduleLabel: SIKESRA_MODULE_LABELS[opts.moduleKey] ?? opts.moduleKey,
    entityId: opts.entityId,
    actorRole: opts.actorRole,
    occurredAt: opts.occurredAt,
    regionLabel: opts.regionLabel ?? null,
    // Personal data is never included in timeline items.
    containsPersonalData: false,
  };
}

// ---------------------------------------------------------------------------
// Dashboard layout model — assembles all widget slots
// ---------------------------------------------------------------------------

/**
 * Dashboard role visibility contexts.
 * Controls which widget sections are rendered per role.
 */
export const SIKESRA_DASHBOARD_ROLE_CONTEXTS = {
  pimpinan: {
    showStatCards: true,
    showVerificationDistribution: true,
    showRegionRecap: true,
    showAttentionSummary: false, // Pimpinan sees aggregate only
    showActivityTimeline: true,
    showReligionDistribution: false, // Requires explicit elevated permission
  },
  admin: {
    showStatCards: true,
    showVerificationDistribution: true,
    showRegionRecap: true,
    showAttentionSummary: true,
    showActivityTimeline: true,
    showReligionDistribution: false,
  },
  verifier: {
    showStatCards: true,
    showVerificationDistribution: true,
    showRegionRecap: false,
    showAttentionSummary: true,
    showActivityTimeline: true,
    showReligionDistribution: false,
  },
  operator: {
    showStatCards: true,
    showVerificationDistribution: false,
    showRegionRecap: false,
    showAttentionSummary: true,
    showActivityTimeline: false,
    showReligionDistribution: false,
  },
};

export const SIKESRA_DASHBOARD_QUICK_ACTIONS = [
  {
    key: "create_page",
    label: "Halaman Baru",
    routeTarget: "/pages/new",
    icon: "file-plus",
    requiredPermissions: ["emdash.pages.write"],
  },
  {
    key: "create_post",
    label: "Post Baru",
    routeTarget: "/posts/new",
    icon: "square-pen",
    requiredPermissions: ["emdash.posts.write"],
  },
  {
    key: "upload_media",
    label: "Unggah Media",
    routeTarget: "/media/upload",
    icon: "image-up",
    requiredPermissions: ["emdash.media.upload"],
  },
];

export function createSikesraDashboardQuickActions(grantedPermissions = []) {
  const permissionSet = new Set(grantedPermissions ?? []);

  return SIKESRA_DASHBOARD_QUICK_ACTIONS.filter((action) =>
    action.requiredPermissions.every((permissionCode) => permissionSet.has(permissionCode))
  );
}

/**
 * Creates the full dashboard layout model for a given role context and permissions.
 *
 * @param {Object} opts
 * @param {string} opts.roleContext - One of the keys in SIKESRA_DASHBOARD_ROLE_CONTEXTS
 * @param {string[]} opts.grantedPermissions
 * @param {Object} opts.filter - SikesraDashboardFilter
 * @returns {Object} Dashboard layout view model
 */
export function createSikesraDashboardLayout(opts) {
  const role = opts.roleContext ?? "operator";
  const visibility =
    SIKESRA_DASHBOARD_ROLE_CONTEXTS[role] ??
    SIKESRA_DASHBOARD_ROLE_CONTEXTS.operator;

  const permissions = new Set(opts.grantedPermissions ?? []);
  const canReadDashboard = permissions.has("sikesra.dashboard.read");

  // Religion aggregate display requires both role visibility AND explicit permission.
  const showReligionDistribution =
    visibility.showReligionDistribution &&
    permissions.has("sikesra.dashboard.religion_aggregate.read");
  const quickActions = createSikesraDashboardQuickActions(opts.grantedPermissions ?? []);

  return {
    roleContext: role,
    filter: opts.filter ?? createSikesraDashboardFilter(),
    canRender: canReadDashboard,
    visibility: {
      ...visibility,
      showReligionDistribution,
    },
    // Widget slot stubs — actual data is fetched by API layer, not this model.
    quickActions,
    statCards: canReadDashboard ? createSikesraStatCards(opts.filter?.wilayah_kecamatan ?? null) : [],
    verificationDistribution: visibility.showVerificationDistribution
      ? createVerificationStatusWidget()
      : null,
    attentionSummary: visibility.showAttentionSummary
      ? SIKESRA_MODULE_KEYS.map((k) => createAttentionSummaryEntry(k))
      : [],
    recentActivity: [],
    // Backend reference: ahliweb/sikesra#49 (religion reference required before
    // religion distribution widget can be populated).
    religionDistribution: showReligionDistribution ? { plannedBackendRef: "ahliweb/sikesra#49" } : null,
  };
}
