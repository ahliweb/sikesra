import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";

export const SIKESRA_RELIGION_REFERENCE_SOURCE = {
  status: "planned_backend_reference",
  followUpIssue: "ahliweb/sikesra#49",
  operatorLabel: "Referensi Agama",
  note: "Gunakan data referensi terkontrol dari backend saat tersedia; daftar lokal ini adalah kontrak UI sementara.",
};

export const SIKESRA_RELIGION_OPTIONS = Object.freeze([
  religion("islam", "Islam", ["moslem", "muslim"]),
  religion("kristen", "Kristen", ["kristen protestan", "protestan", "protestant"]),
  religion("katolik", "Katolik", ["katholik", "katholic", "katolic"]),
  religion("hindu", "Hindu"),
  religion("buddha", "Buddha", ["budha", "buddhist"]),
  religion("konghucu", "Konghucu", ["kong hu cu", "konghuchu", "khonghucu", "confucian"]),
  religion("kepercayaan", "Kepercayaan Terhadap Tuhan YME", ["kepercayaan", "penghayat kepercayaan"]),
]);

export const SIKESRA_AGAMA_FIELD_CONTEXTS = Object.freeze({
  person: "Agama",
  child: "Agama Anak",
  elderly: "Agama Lansia",
  guardian: "Agama Wali/Pengasuh",
  caregiver: "Agama Pendamping/Penanggung Jawab",
  teacher: "Agama Guru",
  manager: "Agama Pengurus",
  institution: "Agama Lembaga",
});

export const SIKESRA_AGAMA_SELECT_USAGES = Object.freeze(["form", "filter", "report", "import_mapping"]);

export function createSikesraAgamaSelectModel(input = {}) {
  const subject = normalizeSubject(input.subject);
  const usage = normalizeUsage(input.usage);
  const required = input.required === true;
  const readOnly = input.readOnly === true;
  const disabled = input.disabled === true || readOnly;
  const individualLevel = input.individualLevel !== false && subject !== "institution" && usage !== "report";
  const canViewIndividualReligion = input.canViewIndividualReligion === true || !individualLevel;
  const selected = normalizeSikesraReligionValue(input.value);
  const options = selectOptions({ includeInactive: input.includeInactive === true });
  const validation = required && !selected.value ? { reason: "required", message: `${SIKESRA_AGAMA_FIELD_CONTEXTS[subject]}: Wajib dipilih.` } : null;
  const sensitiveDisplay = createSikesraSensitiveFieldProps({
    fieldType: "religion",
    classification: individualLevel ? "restricted" : "restricted",
    value: selected.label,
    canReveal: canViewIndividualReligion,
    revealRequested: canViewIndividualReligion,
    context: SIKESRA_AGAMA_FIELD_CONTEXTS[subject],
  });

  return {
    component: "AgamaSelect",
    label: SIKESRA_AGAMA_FIELD_CONTEXTS[subject],
    helperText: individualLevel
      ? "Gunakan referensi agama terkontrol. Data agama individu termasuk data pribadi dan mengikuti izin akses."
      : "Gunakan referensi agama terkontrol untuk pelaporan dan filter agregat.",
    subject,
    usage,
    required,
    optional: !required,
    disabled,
    readOnly,
    freeTextAllowed: false,
    individualLevel,
    permissionAware: individualLevel,
    value: selected.value,
    displayValue: canViewIndividualReligion ? selected.label : sensitiveDisplay.displayValue,
    options: canViewIndividualReligion ? options : [],
    validation,
    importMappingSupported: true,
    exportRequirement: individualLevel ? "Export data agama individu memerlukan izin eksplisit dan audit log." : "Gunakan agregasi untuk dashboard dan laporan umum.",
    auditAction: individualLevel ? "sikesra.religion.view" : null,
    referenceSource: SIKESRA_RELIGION_REFERENCE_SOURCE,
  };
}

export function normalizeSikesraReligionValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return { value: "", label: "" };

  const match = SIKESRA_RELIGION_OPTIONS.find(
    (option) => option.value === normalized || option.aliases.some((alias) => normalizeText(alias) === normalized),
  );

  return match ? { value: match.value, label: match.label } : { value: "", label: "" };
}

export function mapSikesraReligionImportValue(value) {
  const normalizedInput = normalizeText(value);
  const mapped = normalizeSikesraReligionValue(value);

  if (!normalizedInput) {
    return { ok: false, value: "", label: "", normalizedInput, message: "Nilai agama kosong." };
  }

  if (!mapped.value) {
    return {
      ok: false,
      value: "",
      label: "",
      normalizedInput,
      message: "Nilai agama tidak ditemukan dalam referensi terkontrol.",
    };
  }

  return {
    ok: true,
    value: mapped.value,
    label: mapped.label,
    normalizedInput,
    message: "Nilai agama berhasil dipetakan ke referensi terkontrol.",
  };
}

function selectOptions({ includeInactive }) {
  return SIKESRA_RELIGION_OPTIONS.filter((option) => includeInactive || option.active).map((option) => ({
    value: option.value,
    label: option.label,
    active: option.active,
  }));
}

function normalizeSubject(subject) {
  const key = String(subject ?? "person").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return Object.hasOwn(SIKESRA_AGAMA_FIELD_CONTEXTS, key) ? key : "person";
}

function normalizeUsage(usage) {
  const key = String(usage ?? "form").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_AGAMA_SELECT_USAGES.includes(key) ? key : "form";
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function religion(value, label, aliases = [], active = true) {
  return Object.freeze({ value, label, aliases: Object.freeze(aliases), active });
}
