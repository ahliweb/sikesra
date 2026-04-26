import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_EXPORT_FORMATS,
  SIKESRA_IMPORT_ROW_STATUSES,
  SIKESRA_IMPORT_STEPS,
  SIKESRA_REPORT_DEFINITIONS,
  createSikesraImportStagingRowModel,
  createSikesraImportWorkflowModel,
  createSikesraReportsExportModel,
} from "../../src/plugins/sikesra-admin/import-export-workflows.mjs";

test("SIKESRA import workflow exposes all required staging steps", () => {
  const keys = SIKESRA_IMPORT_STEPS.map((item) => item.key);
  assert.deepEqual(keys, [
    "upload_excel",
    "select_sheet",
    "map_columns",
    "validate_rows",
    "review_staging",
    "promote_master",
  ]);
});

test("SIKESRA import workflow is permission-aware and blocks promote when invalid rows exist", () => {
  const model = createSikesraImportWorkflowModel({
    grantedPermissions: ["sikesra.import.manage"],
    currentStep: "review_staging",
    validationSummary: { validCount: 10, invalidCount: 2, needsReviewCount: 1 },
  });

  assert.equal(model.canRender, true);
  assert.equal(model.actions.promote.allowed, false);
  assert.equal(model.actions.promote.blockedReason, "invalid_rows_present");
});

test("SIKESRA import workflow masks staging religion and sensitive names without permissions", () => {
  const row = createSikesraImportStagingRowModel({
    rowNumber: 3,
    status: "needs_review",
    religionValue: "Islam",
    vulnerablePersonName: "Budi Santoso",
    grantedPermissions: [],
  });

  assert.equal(row.status, "needs_review");
  assert.equal(row.religionValue.mode, "masked");
  assert.equal(row.vulnerablePersonName.mode, "masked");
});

test("SIKESRA import workflow reveals staging cells only with explicit permissions", () => {
  const row = createSikesraImportStagingRowModel({
    rowNumber: 5,
    status: "valid",
    religionValue: "Kristen",
    vulnerablePersonName: "Siti Aminah",
    grantedPermissions: ["sikesra.registry.religion.read", "sikesra.registry.sensitive.read"],
  });

  assert.equal(row.religionValue.mode, "full");
  assert.equal(row.vulnerablePersonName.mode, "full");
  assert.equal(row.canPromote, true);
});

test("SIKESRA import row statuses cover valid invalid review and promoted states", () => {
  assert.deepEqual(SIKESRA_IMPORT_ROW_STATUSES, [
    "valid",
    "invalid",
    "needs_review",
    "promoted",
  ]);
});

test("SIKESRA reports definitions cover aggregate and sensitive report types", () => {
  const keys = SIKESRA_REPORT_DEFINITIONS.map((item) => item.key);
  assert.ok(keys.includes("module_recap"));
  assert.ok(keys.includes("anak_yatim_by_school_level"));
  assert.ok(keys.includes("disabilitas_by_type_severity"));
  assert.ok(keys.includes("need_revision_rejected"));
});

test("SIKESRA reports export supports csv and xlsx only", () => {
  assert.deepEqual(SIKESRA_EXPORT_FORMATS, ["csv", "xlsx"]);
});

test("SIKESRA viewer role receives aggregate-only report availability", () => {
  const model = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.dashboard.read"],
    selectedReportKey: "module_recap",
  });

  assert.equal(model.isViewerOnly, true);
  assert.ok(model.reports.every((item) => item.available === item.aggregateOnly));
});

test("SIKESRA sensitive export requires explicit permission and confirmation", () => {
  const withoutPermission = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export"],
    selectedReportKey: "disabilitas_by_type_severity",
    confirmSensitiveExport: true,
  });
  const withoutConfirmation = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export", "sikesra.reports.sensitive_export"],
    selectedReportKey: "disabilitas_by_type_severity",
    confirmSensitiveExport: false,
  });
  const allowed = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export", "sikesra.reports.sensitive_export"],
    selectedReportKey: "disabilitas_by_type_severity",
    confirmSensitiveExport: true,
  });

  assert.equal(withoutPermission.exportAction.allowed, false);
  assert.equal(withoutPermission.exportAction.blockedReason, "sensitive_permission_required");
  assert.equal(withoutConfirmation.exportAction.allowed, false);
  assert.equal(withoutConfirmation.exportAction.blockedReason, "confirmation_required");
  assert.equal(allowed.exportAction.allowed, true);
});

test("SIKESRA religion aggregate report remains available without sensitive export permission", () => {
  const model = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export"],
    selectedReportKey: "lembaga_keagamaan_by_agama",
  });

  assert.equal(model.privacy.religionAggregate, true);
  assert.equal(model.exportAction.allowed, true);
});
