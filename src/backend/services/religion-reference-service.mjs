import {
  mapSikesraReligionReferenceImport,
  toSikesraReligionOption,
} from "../reference-data/religion-reference.mjs";
import { sikesraReligionReferenceRepository } from "../repositories/religion-reference-repository.mjs";

export function createSikesraReligionReferenceService() {
  return Object.freeze({
    seam: sikesraReligionReferenceRepository.seam,
    listOptions(input) {
      const references = sikesraReligionReferenceRepository.list({ includeInactive: input?.includeInactive === true });
      return references.map((reference) => toSikesraReligionOption(reference));
    },
    normalizeValue(value) {
      const reference = sikesraReligionReferenceRepository.findByAny(value);
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
