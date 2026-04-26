import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";

export const SIKESRA_DOCUMENT_TYPE_DEFINITIONS = Object.freeze([
  documentType("sk_kepengurusan", "SK Kepengurusan"),
  documentType("sk_pendirian", "SK Pendirian"),
  documentType("badan_hukum", "Badan Hukum"),
  documentType("id_masjid", "ID Masjid"),
  documentType("foto_bangunan", "Foto Bangunan"),
  documentType("dokumentasi_kegiatan", "Dokumentasi Kegiatan"),
  documentType("kartu_keluarga", "Kartu Keluarga", {
    classification: "highly_restricted",
    sensitive: true,
    previewPermission: "sikesra.documents.restricted_preview",
  }),
  documentType("dokumen_lain", "Dokumen Lain"),
]);

export const SIKESRA_ALLOWED_DOCUMENT_EXTENSIONS = Object.freeze([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

export const SIKESRA_DOCUMENT_UPLOAD_STATES = Object.freeze([
  "idle",
  "queued",
  "uploading",
  "uploaded",
  "failed",
  "superseded",
]);

export function createSikesraDocumentUploadCardModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const selectedType = getDocumentTypeDefinition(input.documentType);
  const progressPercent = clampPercent(input.progressPercent);
  const canUpload = permissionSet.has("sikesra.documents.write");
  const canPreview = hasDocumentPreviewPermission(permissionSet, selectedType);

  return {
    title: "Unggah Dokumen",
    implementationIssue: "ahliweb/sikesra#28",
    canUpload,
    fileRules: {
      allowedExtensions: SIKESRA_ALLOWED_DOCUMENT_EXTENSIONS,
      maxSizeLabel: input.maxSizeLabel ?? "Maksimal 10 MB per file",
      helperText: "Periksa ukuran file dan jenis dokumen sebelum mengunggah.",
    },
    fields: {
      documentType: {
        label: "Jenis Dokumen",
        options: SIKESRA_DOCUMENT_TYPE_DEFINITIONS.map((item) => ({
          value: item.key,
          label: item.label,
          restricted: item.sensitive,
        })),
        value: selectedType.key,
      },
      documentNumber: {
        label: "Nomor Dokumen",
        sensitiveDisplay: createSikesraSensitiveFieldProps({
          fieldType: "document_number",
          classification: selectedType.classification,
          value: input.documentNumber ?? "",
          canReveal: permissionSet.has("sikesra.documents.metadata.read"),
          revealRequested: permissionSet.has("sikesra.documents.metadata.read"),
          context: "Nomor Dokumen",
        }),
      },
      issuer: { label: "Penerbit", value: input.issuer ?? "" },
      issuedDate: { label: "Tanggal Terbit", value: input.issuedDate ?? null },
      expiryDate: { label: "Tanggal Kedaluwarsa", value: input.expiryDate ?? null },
      notes: { label: "Catatan", value: input.notes ?? "" },
      status: { label: "Status Dokumen", value: input.status ?? "draft" },
    },
    progress: {
      state: normalizeUploadState(input.uploadState),
      percent: progressPercent,
      label: progressPercent === null ? "Belum ada unggahan berjalan" : `${progressPercent}% selesai`,
    },
    preview: {
      allowed: canPreview,
      auditAction: canPreview ? "sikesra.documents.preview" : null,
      blockedReason: canPreview ? null : "permission_required",
    },
    replacement: {
      allowed: permissionSet.has("sikesra.documents.write"),
      replacementLabel: "Mengganti dokumen akan menandai dokumen lama sebagai superseded.",
      auditAction: permissionSet.has("sikesra.documents.write") ? "sikesra.documents.replace" : null,
    },
  };
}

export function createSikesraDocumentListItem(input = {}) {
  const definition = getDocumentTypeDefinition(input.documentType);
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canPreview = hasDocumentPreviewPermission(permissionSet, definition);

  return {
    id: input.id ?? null,
    documentType: definition.key,
    documentLabel: definition.label,
    sensitive: definition.sensitive,
    status: normalizeUploadState(input.status),
    supersededBy: input.supersededBy ?? null,
    isSuperseded: normalizeUploadState(input.status) === "superseded" || Boolean(input.supersededBy),
    fileName: input.fileName ?? null,
    fileSizeLabel: input.fileSizeLabel ?? null,
    uploadedAt: input.uploadedAt ?? null,
    issuer: input.issuer ?? null,
    previewAllowed: canPreview,
    previewAuditAction: canPreview ? "sikesra.documents.preview" : null,
    replaceAllowed: permissionSet.has("sikesra.documents.write"),
    replaceAuditAction: permissionSet.has("sikesra.documents.write") ? "sikesra.documents.replace" : null,
  };
}

export function createSikesraDocumentListModel(input = {}) {
  const items = (input.items ?? []).map((item) => createSikesraDocumentListItem({
    ...item,
    grantedPermissions: input.grantedPermissions,
  }));

  return {
    implementationIssue: "ahliweb/sikesra#28",
    items,
    emptyState: items.length === 0 ? "Belum ada dokumen yang diunggah." : null,
    backendDependency: "storage/upload backend metadata table and route required",
  };
}

export const SIKESRA_VERIFICATION_DECISIONS = Object.freeze([
  { key: "verified", label: "Verifikasi", requiresConfirmation: true },
  { key: "need_revision", label: "Butuh Perbaikan", requiresConfirmation: false },
  { key: "rejected", label: "Tolak", requiresConfirmation: false },
]);

export function createSikesraVerificationReviewModel(input = {}) {
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canReview = permissionSet.has("sikesra.verification.write");

  return {
    implementationIssue: "ahliweb/sikesra#29",
    canRender: permissionSet.has("sikesra.verification.read"),
    canReview,
    summary: {
      moduleLabel: input.moduleLabel ?? null,
      idSikesra: input.idSikesra ?? null,
      verificationStatus: input.verificationStatus ?? "submitted",
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    },
    lastChanges: input.lastChanges ?? [],
    completeness: {
      minimumFieldComplete: input.minimumFieldComplete ?? false,
      documentComplete: input.documentComplete ?? false,
      missingSections: input.missingSections ?? [],
    },
    regionValidation: {
      inScope: input.regionInScope !== false,
      note: input.regionInScope === false
        ? "Wilayah data berada di luar cakupan verifikasi pengguna ini."
        : "Wilayah data sesuai cakupan verifikasi.",
    },
    notes: {
      petugas: input.petugasNotes ?? [],
      verifier: input.verifierNotes ?? [],
    },
    decisions: SIKESRA_VERIFICATION_DECISIONS.map((decision) => ({
      ...decision,
      enabled: canReview,
      auditAction: canReview ? `sikesra.verification.${decision.key}` : null,
    })),
  };
}

export function createSikesraVerificationDecisionModel(decisionKey, input = {}) {
  const decision = SIKESRA_VERIFICATION_DECISIONS.find((item) => item.key === decisionKey);
  if (!decision) {
    throw new Error(`Unknown verification decision: "${decisionKey}"`);
  }

  const reason = input.reason ?? "";
  const note = input.note ?? "";
  const fieldRef = input.fieldRef ?? null;
  const sectionRef = input.sectionRef ?? null;
  const priority = input.priority ?? null;
  const dueDate = input.dueDate ?? null;
  const confirmation = input.confirmation === true;

  const validationErrors = [];
  if (decision.key === "verified" && !confirmation) {
    validationErrors.push("Verifikasi memerlukan konfirmasi sebelum dilanjutkan.");
  }
  if (decision.key === "rejected" && !reason.trim()) {
    validationErrors.push("Penolakan wajib menyertakan alasan.");
  }
  if (decision.key === "need_revision") {
    if (!note.trim()) validationErrors.push("Butuh Perbaikan wajib menyertakan catatan verifikator.");
    if (!fieldRef && !sectionRef) validationErrors.push("Butuh Perbaikan wajib mengacu pada field atau section terkait.");
    if (!priority) validationErrors.push("Butuh Perbaikan wajib memiliki prioritas.");
  }

  return {
    key: decision.key,
    label: decision.label,
    fieldRef,
    sectionRef,
    note,
    reason,
    priority,
    dueDate,
    confirmationRequired: decision.requiresConfirmation,
    confirmation,
    valid: validationErrors.length === 0,
    validationErrors,
    auditAction: `sikesra.verification.${decision.key}`,
  };
}

export function createSikesraNeedRevisionUxModel(input = {}) {
  const notes = input.notes ?? [];
  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canResubmit = permissionSet.has("sikesra.registry.write");

  return {
    implementationIssue: "ahliweb/sikesra#30",
    banner: {
      visible: input.status === "need_revision",
      title: "Data Memerlukan Perbaikan",
      message: "Periksa catatan verifikator di bagian yang ditandai, perbarui data, lalu ajukan kembali.",
    },
    highlightedSections: collectUnique(notes.map((item) => item.sectionRef).filter(Boolean)),
    highlightedFields: collectUnique(notes.map((item) => item.fieldRef).filter(Boolean)),
    inlineNotes: notes.map((item) => ({
      fieldRef: item.fieldRef ?? null,
      sectionRef: item.sectionRef ?? null,
      note: item.note ?? "",
      priority: item.priority ?? null,
      dueDate: item.dueDate ?? null,
      createdAt: item.createdAt ?? null,
      createdByRole: item.createdByRole ?? "Verifikator",
    })),
    verificationHistory: input.verificationHistory ?? [],
    resubmit: {
      allowed: canResubmit,
      auditAction: canResubmit ? "sikesra.verification.resubmit" : null,
      buttonLabel: "Ajukan Ulang untuk Verifikasi",
    },
  };
}

function documentType(key, label, options = {}) {
  return Object.freeze({
    key,
    label,
    classification: options.classification ?? "restricted",
    sensitive: options.sensitive === true,
    previewPermission: options.previewPermission ?? "sikesra.documents.preview",
  });
}

function getDocumentTypeDefinition(key) {
  return SIKESRA_DOCUMENT_TYPE_DEFINITIONS.find((item) => item.key === key)
    ?? SIKESRA_DOCUMENT_TYPE_DEFINITIONS.find((item) => item.key === "dokumen_lain");
}

function normalizeUploadState(value) {
  const normalized = String(value ?? "idle").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_DOCUMENT_UPLOAD_STATES.includes(normalized) ? normalized : "idle";
}

function clampPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function hasDocumentPreviewPermission(permissionSet, definition) {
  return permissionSet.has(definition.previewPermission) || permissionSet.has("sikesra.documents.preview_all");
}

function collectUnique(values) {
  return [...new Set(values)];
}
