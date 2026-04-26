export const SIKESRA_SENSITIVE_CLASSIFICATIONS = {
  restricted: {
    classification: "restricted",
    label: "Terbatas",
    warning: "Data ini bersifat terbatas. Buka hanya jika diperlukan untuk tugas resmi.",
    requiresStepUp: false,
  },
  highly_restricted: {
    classification: "highly_restricted",
    label: "Sangat Terbatas",
    warning: "Data ini sangat terbatas. Pembukaan penuh memerlukan izin dan autentikasi tambahan.",
    requiresStepUp: true,
  },
};

export const SIKESRA_SENSITIVE_FIELD_TYPES = {
  nik: { label: "NIK", mask: maskIdentifier },
  kia: { label: "KIA", mask: maskIdentifier },
  no_kk: { label: "No. KK", mask: maskIdentifier },
  phone: { label: "Kontak", mask: maskPhone },
  child_name: { label: "Nama Anak", mask: maskName },
  disability_note: { label: "Catatan Disabilitas", mask: maskText },
  health_note: { label: "Catatan Kesehatan", mask: maskText },
  religion: { label: "Agama", mask: maskText },
  document_number: { label: "Nomor Dokumen", mask: maskIdentifier },
};

export function createSikesraSensitiveFieldProps(input = {}) {
  const value = normalizeValue(input.value);
  const field = getSensitiveFieldType(input.fieldType);
  const classification = getSensitiveClassification(input.classification);
  const revealRequested = input.revealRequested === true;
  const canReveal = input.canReveal === true;
  const stepUpSatisfied = input.stepUpSatisfied === true;
  const fullAllowed = canReveal && revealRequested && (!classification.requiresStepUp || stepUpSatisfied);
  const mode = fullAllowed ? "full" : value ? "masked" : "hidden";
  const displayValue = mode === "full" ? value : mode === "masked" ? field.mask(value) : "Tidak tersedia";
  const revealBlockedReason = getRevealBlockedReason({ canReveal, revealRequested, classification, stepUpSatisfied });
  const copyAllowed = fullAllowed && input.canCopy === true;
  const context = typeof input.context === "string" && input.context.trim() ? input.context.trim() : field.label;

  return {
    fieldType: field.type,
    fieldLabel: field.label,
    classification: classification.classification,
    classificationLabel: classification.label,
    mode,
    displayValue,
    warning: classification.warning,
    ariaLabel: `${context}: ${mode === "full" ? "ditampilkan penuh" : mode === "masked" ? "disamarkan" : "disembunyikan"}`,
    canReveal: canReveal && !fullAllowed,
    canCopy: copyAllowed,
    revealRequested,
    stepUpRequired: classification.requiresStepUp,
    stepUpSatisfied,
    revealBlockedReason,
    auditAction: fullAllowed ? "sikesra.sensitive_field.reveal" : null,
  };
}

export function maskSikesraSensitiveValue(value, fieldType = "nik") {
  const field = getSensitiveFieldType(fieldType);
  return field.mask(normalizeValue(value));
}

function getSensitiveFieldType(fieldType) {
  const type = String(fieldType ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const definition = SIKESRA_SENSITIVE_FIELD_TYPES[type] ?? SIKESRA_SENSITIVE_FIELD_TYPES.nik;
  return { ...definition, type: definition === SIKESRA_SENSITIVE_FIELD_TYPES.nik && type !== "nik" ? "nik" : type || "nik" };
}

function getSensitiveClassification(classification) {
  const key = String(classification ?? "restricted").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_SENSITIVE_CLASSIFICATIONS[key] ?? SIKESRA_SENSITIVE_CLASSIFICATIONS.restricted;
}

function getRevealBlockedReason({ canReveal, revealRequested, classification, stepUpSatisfied }) {
  if (!revealRequested) return null;
  if (!canReveal) return "permission_required";
  if (classification.requiresStepUp && !stepUpSatisfied) return "step_up_required";
  return null;
}

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function maskIdentifier(value) {
  if (!value) return "";
  const visible = value.slice(-4);
  return `${"*".repeat(Math.max(value.length - visible.length, 4))}${visible}`;
}

function maskPhone(value) {
  if (!value) return "";
  const visible = value.slice(-3);
  return `${"*".repeat(Math.max(value.length - visible.length, 4))}${visible}`;
}

function maskName(value) {
  if (!value) return "";
  const [firstWord = ""] = value.split(/\s+/);
  return `${firstWord.slice(0, 1) || "*"}${"*".repeat(Math.max(firstWord.length - 1, 3))}`;
}

function maskText(value) {
  if (!value) return "";
  return "Disamarkan";
}
