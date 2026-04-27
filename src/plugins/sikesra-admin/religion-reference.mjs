import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";
import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
  mapSikesraReligionReferenceImport,
  normalizeReferenceText,
  toSikesraReligionOption,
} from "../../backend/reference-data/religion-reference.mjs";

export const SIKESRA_RELIGION_REFERENCE_SOURCE = {
  status: SIKESRA_RELIGION_REFERENCE_SEAM.status,
  followUpIssue: "ahliweb/sikesra#49",
  operatorLabel: "Referensi Agama",
  sourceIssue: SIKESRA_RELIGION_REFERENCE_SEAM.sourceIssue,
  storage: SIKESRA_RELIGION_REFERENCE_SEAM.storage,
  note: "Gunakan referensi agama dari seam backend repository; persistence runtime masih mengikuti follow-up issue.",
};

export const SIKESRA_RELIGION_OPTIONS = Object.freeze(listSikesraReligionReferences().map((reference) => toSikesraReligionOption(reference)));

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
  const match = findSikesraReligionReference(value);

  return match ? { value: match.code, label: match.displayName } : { value: "", label: "" };
}

export function mapSikesraReligionImportValue(value) {
  const mapped = mapSikesraReligionReferenceImport(value);

  return {
    ok: mapped.ok,
    value: mapped.reference?.code ?? "",
    label: mapped.reference?.displayName ?? "",
    normalizedInput: mapped.normalizedInput,
    message: mapped.message,
  };
}

function selectOptions({ includeInactive }) {
  return listSikesraReligionReferences({ includeInactive }).map((reference) => toSikesraReligionOption(reference));
}

function normalizeSubject(subject) {
  const key = String(subject ?? "person").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return Object.hasOwn(SIKESRA_AGAMA_FIELD_CONTEXTS, key) ? key : "person";
}

function normalizeUsage(usage) {
  const key = String(usage ?? "form").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_AGAMA_SELECT_USAGES.includes(key) ? key : "form";
}

export { normalizeReferenceText as normalizeSikesraReligionText };
