import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
  mapSikesraReligionReferenceImport,
  toSikesraReligionOption,
} from "../reference-data/religion-reference.mjs";

export function createSikesraReligionReferenceService() {
  return Object.freeze({
    seam: SIKESRA_RELIGION_REFERENCE_SEAM,
    listOptions(input) {
      const references = listSikesraReligionReferences({ includeInactive: input?.includeInactive === true });
      return references.map((reference) => toSikesraReligionOption(reference));
    },
    normalizeValue(value) {
      const reference = findSikesraReligionReference(value);
      return reference ? { value: reference.code, label: reference.displayName } : { value: "", label: "" };
    },
    mapImportValue(value) {
      const mapped = mapSikesraReligionReferenceImport(value);
      return {
        ok: mapped.ok,
        value: mapped.reference?.code ?? "",
        label: mapped.reference?.displayName ?? "",
        normalizedInput: mapped.normalizedInput,
        message: mapped.message,
      };
    },
  });
}

export const sikesraReligionReferenceService = createSikesraReligionReferenceService();
