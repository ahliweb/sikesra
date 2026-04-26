import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ALLOWED_DOCUMENT_EXTENSIONS,
  SIKESRA_DOCUMENT_TYPE_DEFINITIONS,
  SIKESRA_VERIFICATION_DECISIONS,
  createSikesraDocumentListItem,
  createSikesraDocumentListModel,
  createSikesraDocumentUploadCardModel,
  createSikesraNeedRevisionUxModel,
  createSikesraVerificationDecisionModel,
  createSikesraVerificationReviewModel,
} from "../../src/plugins/sikesra-admin/review-workflows.mjs";

test("SIKESRA document types cover required PRD document options", () => {
  const keys = SIKESRA_DOCUMENT_TYPE_DEFINITIONS.map((item) => item.key);
  assert.ok(keys.includes("sk_kepengurusan"));
  assert.ok(keys.includes("kartu_keluarga"));
  assert.ok(keys.includes("dokumen_lain"));
  assert.ok(SIKESRA_ALLOWED_DOCUMENT_EXTENSIONS.includes(".pdf"));
});

test("SIKESRA document upload card shows preview only with matching permission", () => {
  const restricted = createSikesraDocumentUploadCardModel({
    documentType: "kartu_keluarga",
    grantedPermissions: ["sikesra.documents.write"],
  });
  const allowed = createSikesraDocumentUploadCardModel({
    documentType: "kartu_keluarga",
    grantedPermissions: ["sikesra.documents.write", "sikesra.documents.restricted_preview"],
  });

  assert.equal(restricted.preview.allowed, false);
  assert.equal(allowed.preview.allowed, true);
  assert.equal(restricted.fields.documentNumber.sensitiveDisplay.classification, "highly_restricted");
});

test("SIKESRA document upload card normalizes progress and replacement behavior", () => {
  const model = createSikesraDocumentUploadCardModel({
    documentType: "foto_bangunan",
    progressPercent: 43.7,
    uploadState: "uploading",
    grantedPermissions: ["sikesra.documents.write", "sikesra.documents.preview"],
  });

  assert.equal(model.progress.percent, 44);
  assert.equal(model.progress.state, "uploading");
  assert.equal(model.replacement.allowed, true);
});

test("SIKESRA document list marks superseded replacement state", () => {
  const item = createSikesraDocumentListItem({
    id: "doc-1",
    documentType: "sk_pendirian",
    status: "superseded",
    supersededBy: "doc-2",
    grantedPermissions: ["sikesra.documents.write", "sikesra.documents.preview"],
  });
  assert.equal(item.isSuperseded, true);
  assert.equal(item.supersededBy, "doc-2");
});

test("SIKESRA document list model exposes empty state", () => {
  const model = createSikesraDocumentListModel({ items: [], grantedPermissions: [] });
  assert.match(model.emptyState, /Belum ada dokumen/i);
});

test("SIKESRA verification review model is permission-aware and audit-ready", () => {
  const restricted = createSikesraVerificationReviewModel({
    grantedPermissions: ["sikesra.verification.read"],
  });
  const verifier = createSikesraVerificationReviewModel({
    grantedPermissions: ["sikesra.verification.read", "sikesra.verification.write"],
    minimumFieldComplete: true,
    documentComplete: false,
    regionInScope: true,
  });

  assert.equal(restricted.canReview, false);
  assert.equal(verifier.canReview, true);
  assert.ok(verifier.decisions.every((decision) => decision.auditAction));
});

test("SIKESRA verification decision model enforces need_revision requirements", () => {
  const invalid = createSikesraVerificationDecisionModel("need_revision", {});
  const valid = createSikesraVerificationDecisionModel("need_revision", {
    note: "Perbaiki nomor dokumen dan unggah KK terbaru.",
    fieldRef: "document_number",
    priority: "high",
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.validationErrors.length >= 3);
  assert.equal(valid.valid, true);
});

test("SIKESRA verification decision model requires confirmation for verified", () => {
  const invalid = createSikesraVerificationDecisionModel("verified", { confirmation: false });
  const valid = createSikesraVerificationDecisionModel("verified", { confirmation: true });
  assert.equal(invalid.valid, false);
  assert.equal(valid.valid, true);
});

test("SIKESRA verification decision model requires reason for rejection", () => {
  const invalid = createSikesraVerificationDecisionModel("rejected", {});
  const valid = createSikesraVerificationDecisionModel("rejected", { reason: "Dokumen tidak sah." });
  assert.equal(invalid.valid, false);
  assert.equal(valid.valid, true);
});

test("SIKESRA need_revision UX shows banner, highlights, and resubmit affordance", () => {
  const model = createSikesraNeedRevisionUxModel({
    status: "need_revision",
    grantedPermissions: ["sikesra.registry.write"],
    notes: [
      {
        fieldRef: "nik",
        sectionRef: "primary_identity",
        note: "Periksa kembali NIK.",
        priority: "high",
      },
    ],
  });

  assert.equal(model.banner.visible, true);
  assert.deepEqual(model.highlightedFields, ["nik"]);
  assert.deepEqual(model.highlightedSections, ["primary_identity"]);
  assert.equal(model.resubmit.allowed, true);
});

test("SIKESRA verification decisions cover all three required PRD actions", () => {
  const keys = SIKESRA_VERIFICATION_DECISIONS.map((item) => item.key);
  assert.deepEqual(keys, ["verified", "need_revision", "rejected"]);
});
