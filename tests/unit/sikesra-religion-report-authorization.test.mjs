import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_RELIGION_REPORT_EXPORT_ACCESS,
  buildReligionReportExportAuditPayload,
  evaluateReligionReportExportAccess,
} from "../../src/backend/services/religion-report-authorization-service.mjs";

test("religion report export access requires reports.export", () => {
  const result = evaluateReligionReportExportAccess({
    permissions: [],
    requestedScope: "aggregate_only",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, "RELIGION_REPORT_EXPORT_FORBIDDEN");
  assert.equal(result.auditAction, null);
});

test("religion report export access allows aggregate-only exports with reports.export", () => {
  const result = evaluateReligionReportExportAccess({
    permissions: ["sikesra.reports.export"],
    requestedScope: "aggregate_only",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.effectiveScope, "aggregate_only");
  assert.equal(result.includesIndividualReligion, false);
  assert.equal(result.auditAction, SIKESRA_RELIGION_REPORT_EXPORT_ACCESS.auditAction);
});

test("religion report export access downgrades individual-level requests without sensitive permission", () => {
  const result = evaluateReligionReportExportAccess({
    permissions: ["sikesra.reports.export"],
    requestedScope: "individual_level",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.requestedScope, "individual_level");
  assert.equal(result.effectiveScope, "aggregate_only");
  assert.equal(result.downgradedToAggregate, true);
  assert.equal(result.includesIndividualReligion, false);
  assert.match(result.message, /diturunkan ke agregat/i);
});

test("religion report export access allows individual-level scope with sensitive permission", () => {
  const result = evaluateReligionReportExportAccess({
    permissions: ["sikesra.reports.export", "sikesra.reports.sensitive_export"],
    requestedScope: "individual_level",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.effectiveScope, "individual_level");
  assert.equal(result.includesIndividualReligion, true);
  assert.equal(result.downgradedToAggregate, false);
});

test("religion report export audit payload stays scrubbed", () => {
  const payload = buildReligionReportExportAuditPayload({
    permissions: ["sikesra.reports.export"],
    reportKey: "lembaga_keagamaan_by_agama",
    exportFormat: "xlsx",
    requestedScope: "individual_level",
  });

  assert.deepEqual(payload, {
    reportKey: "lembaga_keagamaan_by_agama",
    exportFormat: "xlsx",
    requestedScope: "individual_level",
    effectiveScope: "aggregate_only",
    downgradedToAggregate: true,
    includesIndividualReligion: false,
  });
  assert.equal("rows" in payload, false);
  assert.equal("data" in payload, false);
});
