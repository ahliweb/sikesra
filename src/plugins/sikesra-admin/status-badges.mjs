export const SIKESRA_STATUS_BADGE_DEFINITIONS = {
  draft: badge("draft", "Draft", "data", "neutral", "Data masih berupa draf dan belum diajukan."),
  submitted: badge("submitted", "Diajukan", "data", "info", "Data sudah diajukan untuk diproses."),
  verified: badge("verified", "Terverifikasi", "verification", "success", "Data sudah diverifikasi."),
  need_revision: badge("need_revision", "Perlu Perbaikan", "verification", "warning", "Data perlu diperbaiki sebelum dapat disetujui."),
  rejected: badge("rejected", "Ditolak", "verification", "danger", "Data ditolak dalam proses verifikasi."),
  active: badge("active", "Aktif", "data", "success", "Data aktif dan dapat digunakan."),
  archived: badge("archived", "Diarsipkan", "data", "muted", "Data telah diarsipkan."),
  pending: badge("pending", "Menunggu", "document", "warning", "Status masih menunggu kelengkapan atau pemeriksaan."),
  incomplete: badge("incomplete", "Belum Lengkap", "document", "danger", "Data atau dokumen belum lengkap."),
  restricted: badge("restricted", "Terbatas", "sensitivity", "privacy", "Data terbatas dan harus dibuka sesuai izin."),
  highly_restricted: badge(
    "highly_restricted",
    "Sangat Terbatas",
    "sensitivity",
    "critical",
    "Data sangat terbatas dan memerlukan perlindungan tambahan.",
  ),
};

export const SIKESRA_STATUS_BADGE_CLASS_BY_TONE = {
  neutral: "sikesra-badge sikesra-badge--neutral",
  info: "sikesra-badge sikesra-badge--info",
  success: "sikesra-badge sikesra-badge--success",
  warning: "sikesra-badge sikesra-badge--warning",
  danger: "sikesra-badge sikesra-badge--danger",
  muted: "sikesra-badge sikesra-badge--muted",
  privacy: "sikesra-badge sikesra-badge--privacy",
  critical: "sikesra-badge sikesra-badge--critical",
};

export function getSikesraStatusBadge(status) {
  const key = normalizeStatus(status);
  const definition = SIKESRA_STATUS_BADGE_DEFINITIONS[key];
  if (!definition) return SIKESRA_STATUS_BADGE_DEFINITIONS.pending;

  return definition;
}

export function createSikesraStatusBadgeProps(status, options = {}) {
  const definition = getSikesraStatusBadge(status);
  const context = typeof options.context === "string" && options.context.trim() ? options.context.trim() : "Status SIKESRA";

  return {
    status: definition.status,
    label: definition.label,
    category: definition.category,
    tone: definition.tone,
    className: SIKESRA_STATUS_BADGE_CLASS_BY_TONE[definition.tone],
    title: definition.description,
    ariaLabel: `${context}: ${definition.label}`,
    textOnly: definition.label,
  };
}

export function listSikesraStatusBadgeDefinitions(category) {
  const definitions = Object.values(SIKESRA_STATUS_BADGE_DEFINITIONS);
  if (!category) return definitions;
  return definitions.filter((definition) => definition.category === category);
}

function normalizeStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function badge(status, label, category, tone, description) {
  return Object.freeze({ status, label, category, tone, description });
}
