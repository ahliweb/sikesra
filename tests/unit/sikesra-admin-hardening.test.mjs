import assert from "node:assert/strict";
import test from "node:test";

import { filterSikesraAdminPagesByPermissions } from "../../src/plugins/sikesra-admin/index.mjs";
import { createSikesraRegistryFilter } from "../../src/plugins/sikesra-admin/registry-list.mjs";
import { createSikesraModuleFormModel } from "../../src/plugins/sikesra-admin/module-forms.mjs";
import { createSikesraIdDisplayModel } from "../../src/plugins/sikesra-admin/id-sikesra.mjs";
import {
  createSikesraNeedRevisionUxModel,
  createSikesraVerificationDecisionModel,
} from "../../src/plugins/sikesra-admin/review-workflows.mjs";
import { createSikesraReportsExportModel } from "../../src/plugins/sikesra-admin/import-export-workflows.mjs";

test("SIKESRA menu visibility remains permission-aware by role metadata", () => {
  const verifierMenu = filterSikesraAdminPagesByPermissions([
    "sikesra.verification.read",
    "sikesra.documents.read",
  ]);
  const labels = verifierMenu.flatMap(flattenLabels);

  assert.ok(labels.includes("Verifikasi Data"));
  assert.ok(labels.includes("Dokumen Pendukung"));
  assert.ok(!labels.includes("Dashboard SIKESRA"));
  assert.ok(!labels.includes("Pengguna & Akses"));
});

test("SIKESRA registry filter and form validation flows keep Indonesian operator-facing defaults", () => {
  const filter = createSikesraRegistryFilter();
  const form = createSikesraModuleFormModel("rumah_ibadah", {
    mode: "create",
    values: {
      completeness: {
        code_category: true,
        region_address: false,
      },
    },
    grantedPermissions: ["sikesra.registry.read"],
  });

  assert.equal(filter.quick_search, null);
  assert.match(form.wizard.progress.label, /bagian lengkap/i);
});

test("SIKESRA hardening tests cover sensitive field masking without real personal data", () => {
  const form = createSikesraModuleFormModel("anak_yatim", {
    mode: "create",
    grantedPermissions: ["sikesra.registry.read"],
  });
  const nikField = form.fields.primary_identity.find((field) => field.key === "nik");

  assert.equal(nikField.sensitiveDisplay.mode, "masked");
  assert.notEqual(nikField.sensitiveDisplay.displayValue, "1234567890123456");
});

test("SIKESRA ID generation UI states remain stable for pending and invalid inputs", () => {
  const pending = createSikesraIdDisplayModel(null);
  const invalid = createSikesraIdDisplayModel("not-a-valid-id");

  assert.equal(pending.state.key, "pending_assignment");
  assert.equal(invalid.state.key, "invalid_format");
  assert.match(invalid.state.description, /20 digit/i);
});

test("SIKESRA need_revision note display keeps field and section mapping", () => {
  const model = createSikesraNeedRevisionUxModel({
    status: "need_revision",
    grantedPermissions: ["sikesra.registry.write"],
    notes: [
      {
        fieldRef: "nomor_dokumen",
        sectionRef: "documents",
        note: "Periksa nomor dokumen dan unggah berkas terbaru.",
        priority: "high",
      },
    ],
  });

  assert.equal(model.banner.visible, true);
  assert.deepEqual(model.highlightedFields, ["nomor_dokumen"]);
  assert.deepEqual(model.highlightedSections, ["documents"]);
  assert.match(model.inlineNotes[0].note, /unggah berkas terbaru/i);
});

test("SIKESRA export confirmation remains permission-aware for sensitive reports", () => {
  const denied = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export"],
    selectedReportKey: "anak_yatim_by_school_level",
    confirmSensitiveExport: true,
  });
  const allowed = createSikesraReportsExportModel({
    grantedPermissions: ["sikesra.reports.export", "sikesra.reports.sensitive_export"],
    selectedReportKey: "anak_yatim_by_school_level",
    confirmSensitiveExport: true,
  });

  assert.equal(denied.exportAction.allowed, false);
  assert.equal(denied.exportAction.blockedReason, "sensitive_permission_required");
  assert.equal(allowed.exportAction.allowed, true);
  assert.match(allowed.confirmation.warning, /kebijakan privasi/i);
});

test("SIKESRA verification warning copy remains explicit for critical decisions", () => {
  const verified = createSikesraVerificationDecisionModel("verified", { confirmation: false });
  const rejected = createSikesraVerificationDecisionModel("rejected", { reason: "" });

  assert.ok(verified.validationErrors.some((item) => /konfirmasi/i.test(item)));
  assert.ok(rejected.validationErrors.some((item) => /alasan/i.test(item)));
});

function flattenLabels(page) {
  return [page.label, ...(page.children ?? []).flatMap(flattenLabels)];
}
