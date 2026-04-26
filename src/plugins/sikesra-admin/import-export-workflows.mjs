import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";

export const SIKESRA_IMPORT_STEPS = Object.freeze([
  step("upload_excel", "Unggah Excel"),
  step("select_sheet", "Pilih Sheet"),
  step("map_columns", "Pemetaan Kolom"),
  step("validate_rows", "Validasi Data"),
  step("review_staging", "Tinjau Staging"),
  step("promote_master", "Promosikan ke Master"),
]);

export const SIKESRA_IMPORT_ROW_STATUSES = Object.freeze([
  "valid",
  "invalid",
  "needs_review",
  "promoted",
]);

export const SIKESRA_IMPORT_REQUIRED_AUDIT_ACTIONS = Object.freeze({
  upload: "sikesra.import.upload",
  validate: "sikesra.import.validate",
  promote: "sikesra.import.promote",
});

export function createSikesraImportWorkflowModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canManageImport = permissionSet.has("sikesra.import.manage");
  const currentStep = normalizeImportStep(input.currentStep);
  const summary = normalizeValidationSummary(input.validationSummary);

  return {
    implementationIssue: "ahliweb/sikesra#31",
    canRender: canManageImport,
    steps: SIKESRA_IMPORT_STEPS.map((item) => ({
      ...item,
      active: item.key === currentStep,
      completed: SIKESRA_IMPORT_STEPS.findIndex((step) => step.key === item.key)
        < SIKESRA_IMPORT_STEPS.findIndex((step) => step.key === currentStep),
    })),
    upload: {
      acceptedFileTypes: [".xlsx", ".xls", ".csv"],
      maxFileSizeLabel: input.maxFileSizeLabel ?? "Maksimal 10 MB per file",
      invalidFileMessage: "File tidak valid. Gunakan Excel atau CSV sesuai template yang ditinjau.",
      auditAction: canManageImport ? SIKESRA_IMPORT_REQUIRED_AUDIT_ACTIONS.upload : null,
    },
    sheetSelection: {
      availableSheets: input.availableSheets ?? [],
      selectedSheet: input.selectedSheet ?? null,
      helperText: "Pilih sheet yang akan digunakan sebagai sumber staging import.",
    },
    mapping: {
      columns: input.mappingColumns ?? [],
      helperText: "Pemetaan kolom wajib selesai sebelum validasi dijalankan.",
      religionMappingNote: "Kolom agama harus dipetakan ke referensi terkontrol SIKESRA.",
      lansiaMappingNote: "Kolom Lansia Terlantar harus ditinjau agar tidak melewati staging dan validasi wilayah/sensitivitas.",
    },
    validationSummary: summary,
    stagingRows: (input.stagingRows ?? []).map((row) => createSikesraImportStagingRowModel({
      ...row,
      grantedPermissions: input.grantedPermissions,
    })),
    actions: {
      validate: {
        allowed: canManageImport,
        auditAction: canManageImport ? SIKESRA_IMPORT_REQUIRED_AUDIT_ACTIONS.validate : null,
      },
      promote: {
        allowed: canManageImport && summary.invalidCount === 0,
        blockedReason: summary.invalidCount > 0 ? "invalid_rows_present" : null,
        auditAction: canManageImport ? SIKESRA_IMPORT_REQUIRED_AUDIT_ACTIONS.promote : null,
      },
    },
    backendDependency: "import_batches and import_staging_rows backend support required",
  };
}

export function createSikesraImportStagingRowModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const status = normalizeImportRowStatus(input.status);

  return {
    rowNumber: input.rowNumber ?? null,
    moduleKey: input.moduleKey ?? null,
    status,
    idSikesraPreview: input.idSikesraPreview ?? null,
    regionLabel: input.regionLabel ?? null,
    religionValue: maskSensitiveImportCell(
      "religion",
      input.religionValue,
      permissionSet.has("sikesra.registry.religion.read")
    ),
    vulnerablePersonName: maskSensitiveImportCell(
      "child_name",
      input.vulnerablePersonName,
      permissionSet.has("sikesra.registry.sensitive.read")
    ),
    errors: input.errors ?? [],
    editable: status !== "promoted",
    canPromote: status === "valid",
  };
}

export const SIKESRA_REPORT_DEFINITIONS = Object.freeze([
  report("module_recap", "Rekap per Modul", { aggregateOnly: true }),
  report("region_recap", "Rekap per Wilayah", { aggregateOnly: true }),
  report("verification_status", "Status Verifikasi", { aggregateOnly: true }),
  report("document_completeness", "Kelengkapan Dokumen", { aggregateOnly: true }),
  report("rumah_ibadah_by_type", "Rumah Ibadah per Jenis", { aggregateOnly: true }),
  report("lembaga_keagamaan_by_agama", "Lembaga Keagamaan per Agama", { aggregateOnly: true, religionAggregate: true }),
  report("anak_yatim_by_school_level", "Anak Yatim per Jenjang Sekolah", { aggregateOnly: false, sensitive: true, vulnerablePerson: true }),
  report("disabilitas_by_type_severity", "Disabilitas per Jenis/Severity", { aggregateOnly: false, sensitive: true, vulnerablePerson: true }),
  report("need_revision_rejected", "Data Butuh Perbaikan/Ditolak", { aggregateOnly: false, sensitive: true }),
]);

export const SIKESRA_EXPORT_FORMATS = Object.freeze(["csv", "xlsx"]);

export function createSikesraReportsExportModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const selectedReport = getReportDefinition(input.selectedReportKey);
  const format = normalizeExportFormat(input.exportFormat);
  const canExport = permissionSet.has("sikesra.reports.export");
  const isViewerOnly = permissionSet.has("sikesra.dashboard.read") && !canExport;
  const sensitiveRequested = input.includeSensitiveData === true;
  const sensitiveAllowed = canExport && permissionSet.has("sikesra.reports.sensitive_export");
  const confirmationChecked = input.confirmSensitiveExport === true;

  return {
    implementationIssue: "ahliweb/sikesra#32",
    canRender: permissionSet.has("sikesra.reports.export") || permissionSet.has("sikesra.dashboard.read"),
    isViewerOnly,
    reports: SIKESRA_REPORT_DEFINITIONS.map((item) => ({
      ...item,
      available: isViewerOnly ? item.aggregateOnly : true,
    })),
    selectedReport,
    exportFormat: format,
    availableFormats: SIKESRA_EXPORT_FORMATS,
    filters: {
      moduleKey: input.moduleKey ?? null,
      regionScope: input.regionScope ?? null,
      verificationStatus: input.verificationStatus ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    },
    confirmation: {
      required: Boolean(selectedReport.sensitive || sensitiveRequested),
      checked: confirmationChecked,
      warning: "Export data sensitif hanya untuk kebutuhan resmi yang sah, mengikuti kebijakan privasi, least privilege, dan audit logging.",
    },
    exportAction: {
      allowed:
        canExport
        && (!selectedReport.sensitive || sensitiveAllowed)
        && (!(selectedReport.sensitive || sensitiveRequested) || confirmationChecked),
      blockedReason: resolveExportBlockedReason({
        canExport,
        selectedReport,
        sensitiveAllowed,
        confirmationChecked,
      }),
      auditAction: canExport ? "sikesra.reports.export" : null,
    },
    privacy: {
      aggregateOnly: selectedReport.aggregateOnly,
      sensitive: selectedReport.sensitive,
      vulnerablePerson: selectedReport.vulnerablePerson,
      religionAggregate: selectedReport.religionAggregate,
    },
    backendDependency: "backend export endpoints and audit persistence required",
  };
}

function maskSensitiveImportCell(fieldType, value, canReveal) {
  return createSikesraSensitiveFieldProps({
    fieldType,
    classification: "restricted",
    value: value ?? "",
    canReveal,
    revealRequested: canReveal,
    context: "Staging Import",
  });
}

function normalizeValidationSummary(summary = {}) {
  return {
    validCount: Number(summary.validCount ?? 0),
    invalidCount: Number(summary.invalidCount ?? 0),
    needsReviewCount: Number(summary.needsReviewCount ?? 0),
  };
}

function normalizeImportStep(value) {
  const normalized = String(value ?? "upload_excel").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_IMPORT_STEPS.some((item) => item.key === normalized) ? normalized : "upload_excel";
}

function normalizeImportRowStatus(value) {
  const normalized = String(value ?? "needs_review").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_IMPORT_ROW_STATUSES.includes(normalized) ? normalized : "needs_review";
}

function normalizeExportFormat(value) {
  const normalized = String(value ?? "csv").trim().toLowerCase();
  return SIKESRA_EXPORT_FORMATS.includes(normalized) ? normalized : "csv";
}

function resolveExportBlockedReason({ canExport, selectedReport, sensitiveAllowed, confirmationChecked }) {
  if (!canExport) return "permission_required";
  if (selectedReport.sensitive && !sensitiveAllowed) return "sensitive_permission_required";
  if (selectedReport.sensitive && !confirmationChecked) return "confirmation_required";
  return null;
}

function getReportDefinition(key) {
  return SIKESRA_REPORT_DEFINITIONS.find((item) => item.key === key)
    ?? SIKESRA_REPORT_DEFINITIONS[0];
}

function step(key, label) {
  return Object.freeze({ key, label });
}

function report(key, label, options = {}) {
  return Object.freeze({
    key,
    label,
    aggregateOnly: options.aggregateOnly === true,
    sensitive: options.sensitive === true,
    vulnerablePerson: options.vulnerablePerson === true,
    religionAggregate: options.religionAggregate === true,
  });
}
