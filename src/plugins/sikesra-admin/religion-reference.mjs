import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";
import { sikesraReligionReferenceService } from "../../backend/services/religion-reference-service.mjs";

export const SIKESRA_RELIGION_REFERENCE_SOURCE = {
  status: sikesraReligionReferenceService.seam.status,
  followUpIssue: "ahliweb/sikesra#49",
  operatorLabel: "Referensi Agama",
  sourceIssue: sikesraReligionReferenceService.seam.sourceIssue,
  storage: sikesraReligionReferenceService.seam.storage,
  route: "/api/v1/references/religions",
  routeQuery: {
    includeInactive: "true|false",
  },
  routeUsage: "Gunakan route backend read-only ini untuk consumer async/runtime baru. Contract sinkron saat ini tetap memakai seed-backed service boundary sampai consumer follow-up diimplementasikan.",
  note: "Gunakan referensi agama melalui service boundary backend repository; handoff route runtime read-only sudah tersedia, sementara consumer sinkron masih mengikuti follow-up issue.",
};

export const SIKESRA_RELIGION_REFERENCE_LOAD_STRATEGY = Object.freeze({
  mode: "sync_seed_fallback",
  runtimeRoute: "/api/v1/references/religions",
  handoffState: "async_route_ready",
  fallbackBehavior: "Gunakan opsi sinkron seed-backed saat ini sampai consumer async berpindah ke route backend read-only yang telah ditinjau.",
});

export const SIKESRA_RELIGION_REFERENCE_OPTIONS_SOURCE = Object.freeze({
  kind: "reference_route_handoff",
  mode: SIKESRA_RELIGION_REFERENCE_LOAD_STRATEGY.mode,
  handoffState: SIKESRA_RELIGION_REFERENCE_LOAD_STRATEGY.handoffState,
  route: SIKESRA_RELIGION_REFERENCE_SOURCE.route,
  routeQuery: SIKESRA_RELIGION_REFERENCE_SOURCE.routeQuery,
  fallbackBehavior: SIKESRA_RELIGION_REFERENCE_LOAD_STRATEGY.fallbackBehavior,
});

export const SIKESRA_RELIGION_OPTIONS = Object.freeze(sikesraReligionReferenceService.listOptions());

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
    loadStrategy: SIKESRA_RELIGION_REFERENCE_LOAD_STRATEGY,
    optionsSource: SIKESRA_RELIGION_REFERENCE_OPTIONS_SOURCE,
    referenceSource: SIKESRA_RELIGION_REFERENCE_SOURCE,
  };
}

export function normalizeSikesraReligionValue(value) {
  return sikesraReligionReferenceService.normalizeValue(value);
}

export function mapSikesraReligionImportValue(value) {
  return sikesraReligionReferenceService.mapImportValue(value);
}

function selectOptions({ includeInactive }) {
  return sikesraReligionReferenceService.listOptions({ includeInactive });
}

function normalizeSubject(subject) {
  const key = String(subject ?? "person").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return Object.hasOwn(SIKESRA_AGAMA_FIELD_CONTEXTS, key) ? key : "person";
}

function normalizeUsage(usage) {
  const key = String(usage ?? "form").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return SIKESRA_AGAMA_SELECT_USAGES.includes(key) ? key : "form";
}
