export const SIKESRA_RELIGION_REPORT_EXPORT_ACCESS = Object.freeze({
  exportPermission: "sikesra.reports.export",
  sensitiveExportPermission: "sikesra.reports.sensitive_export",
  auditAction: "sikesra.reports.export",
});

export function evaluateReligionReportExportAccess(input = {}) {
  const permissionSet = new Set(input.permissions ?? []);
  const requestedScope = normalizeReligionReportScope(input.requestedScope);

  if (!permissionSet.has(SIKESRA_RELIGION_REPORT_EXPORT_ACCESS.exportPermission)) {
    return {
      allowed: false,
      code: "RELIGION_REPORT_EXPORT_FORBIDDEN",
      message: "Export atau report agama memerlukan izin sikesra.reports.export.",
      requestedScope,
      effectiveScope: null,
      downgradedToAggregate: false,
      auditAction: null,
      includesIndividualReligion: false,
    };
  }

  const canExportSensitive = permissionSet.has(
    SIKESRA_RELIGION_REPORT_EXPORT_ACCESS.sensitiveExportPermission,
  );
  const effectiveScope =
    requestedScope === "individual_level" && canExportSensitive
      ? "individual_level"
      : "aggregate_only";

  return {
    allowed: true,
    code: null,
    message:
      requestedScope === "individual_level" && !canExportSensitive
        ? "Permintaan data agama individual diturunkan ke agregat karena izin sensitif tidak tersedia."
        : null,
    requestedScope,
    effectiveScope,
    downgradedToAggregate:
      requestedScope === "individual_level" && effectiveScope === "aggregate_only",
    auditAction: SIKESRA_RELIGION_REPORT_EXPORT_ACCESS.auditAction,
    includesIndividualReligion: effectiveScope === "individual_level",
  };
}

export function buildReligionReportExportAuditPayload(input = {}) {
  const decision = evaluateReligionReportExportAccess(input);

  return Object.freeze({
    reportKey: String(input.reportKey ?? "unknown").trim() || "unknown",
    exportFormat: String(input.exportFormat ?? "csv").trim().toLowerCase() || "csv",
    requestedScope: decision.requestedScope,
    effectiveScope: decision.effectiveScope,
    downgradedToAggregate: decision.downgradedToAggregate,
    includesIndividualReligion: decision.includesIndividualReligion,
  });
}

function normalizeReligionReportScope(value) {
  const normalized = String(value ?? "aggregate_only")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  return normalized === "individual_level" ? "individual_level" : "aggregate_only";
}
