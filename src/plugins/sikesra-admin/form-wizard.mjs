export const SIKESRA_FORM_MODES = ["create", "edit_draft", "edit_need_revision", "read_only", "verify"];

export const SIKESRA_FORM_SECTIONS = [
  section("code_category", "Kode dan Kategori", "Menentukan kode, jenis bantuan, dan kategori data SIKESRA."),
  section("region_address", "Wilayah dan Alamat", "Mengisi cakupan wilayah dan alamat sesuai data resmi."),
  section("primary_identity", "Identitas Utama", "Mengisi identitas utama dengan perlindungan data sensitif."),
  section("module_detail", "Detail Khusus Modul", "Mengisi informasi khusus sesuai modul penerima manfaat."),
  section("related_personnel", "Personil Terkait", "Mengisi wali, pendamping, petugas, atau pihak terkait."),
  section("documents", "Dokumen", "Melengkapi dokumen pendukung melalui alur yang diaudit."),
  section("status_notes", "Status dan Catatan", "Mengisi status, catatan perbaikan, dan konteks verifikasi."),
  section("review_submit", "Ringkasan Sebelum Submit", "Meninjau kelengkapan sebelum pengajuan atau verifikasi."),
];

export const SIKESRA_FORM_INLINE_MESSAGES = {
  required: "Wajib diisi.",
  invalid_format: "Format data belum sesuai.",
  sensitive_masked: "Data sensitif disamarkan. Gunakan aksi buka data hanya jika berwenang.",
  region_required: "Wilayah wajib dipilih sesuai cakupan kewenangan.",
  document_required: "Dokumen pendukung wajib dilengkapi.",
  unsaved_changes: "Ada perubahan yang belum disimpan. Simpan draf sebelum meninggalkan halaman.",
};

export function createSikesraFormWizardState(input = {}) {
  const mode = normalizeMode(input.mode);
  const values = input.values && typeof input.values === "object" ? input.values : {};
  const activeSectionId = input.activeSectionId ?? SIKESRA_FORM_SECTIONS[0].id;
  const sections = SIKESRA_FORM_SECTIONS.map((definition, index) => createSectionState(definition, index, values, mode));
  const visibleSections = sections.filter((item) => item.visible);
  const activeIndex = Math.max(
    0,
    visibleSections.findIndex((item) => item.id === activeSectionId),
  );
  const completedCount = visibleSections.filter((item) => item.complete).length;
  const progressPercent = visibleSections.length === 0 ? 0 : Math.round((completedCount / visibleSections.length) * 100);

  return {
    mode,
    readOnly: mode === "read_only" || mode === "verify",
    verifyMode: mode === "verify",
    canSubmit: !["read_only"].includes(mode) && visibleSections.every((item) => item.complete || item.optional),
    hasUnsavedChanges: input.hasUnsavedChanges === true,
    unsavedChangesWarning: input.hasUnsavedChanges === true ? SIKESRA_FORM_INLINE_MESSAGES.unsaved_changes : null,
    sections: visibleSections,
    activeSection: visibleSections[activeIndex] ?? null,
    progress: {
      completed: completedCount,
      total: visibleSections.length,
      percent: progressPercent,
      label: `${completedCount} dari ${visibleSections.length} bagian lengkap`,
    },
  };
}

export function createSikesraInlineValidation(field, reason = "required") {
  const fieldLabel = typeof field === "string" && field.trim() ? field.trim() : "Kolom";
  const message = SIKESRA_FORM_INLINE_MESSAGES[reason] ?? SIKESRA_FORM_INLINE_MESSAGES.invalid_format;

  return {
    field: fieldLabel,
    reason,
    message: `${fieldLabel}: ${message}`,
  };
}

function createSectionState(definition, index, values, mode) {
  const visible = isSectionVisible(definition.id, values, mode);
  const complete = isSectionComplete(definition.id, values);
  const optional = definition.optional === true || (definition.id === "documents" && mode === "create");

  return {
    ...definition,
    order: index + 1,
    visible,
    complete,
    optional,
    state: complete ? "complete" : optional ? "optional" : "incomplete",
  };
}

function isSectionVisible(sectionId, values, mode) {
  if (sectionId === "status_notes") return mode !== "create" || Boolean(values.showStatusNotes);
  if (sectionId === "review_submit") return mode !== "read_only";
  return true;
}

function isSectionComplete(sectionId, values) {
  const completeness = values.completeness && typeof values.completeness === "object" ? values.completeness : {};
  return completeness[sectionId] === true;
}

function normalizeMode(mode) {
  const normalized = String(mode ?? "create").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_FORM_MODES.includes(normalized) ? normalized : "create";
}

function section(id, label, description, options = {}) {
  return Object.freeze({ id, label, description, optional: options.optional === true });
}
