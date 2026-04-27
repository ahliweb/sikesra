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
    async listRuntimeOptions(input) {
      const references = await sikesraReligionReferenceRepository.listRuntime({ includeInactive: input?.includeInactive === true });
      return references.map((reference) => toSikesraReligionOption(reference));
    },
    normalizeValue(value) {
      const reference = sikesraReligionReferenceRepository.findByAny(value);
      return reference ? { value: reference.code, label: reference.displayName } : { value: "", label: "" };
    },
    async normalizeRuntimeValue(value) {
      const reference = await sikesraReligionReferenceRepository.findByAnyRuntime(value);
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
    async mapRuntimeImportValue(value) {
      const reference = await sikesraReligionReferenceRepository.findByAnyRuntime(value);
      const normalizedInput = String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");

      if (!normalizedInput) {
        return { ok: false, value: "", label: "", normalizedInput, message: "Nilai agama kosong." };
      }

      if (!reference) {
        return {
          ok: false,
          value: "",
          label: "",
          normalizedInput,
          message: "Nilai agama tidak ditemukan dalam referensi backend terkontrol.",
        };
      }

      return {
        ok: true,
        value: reference.code,
        label: reference.displayName,
        normalizedInput,
        message: "Nilai agama berhasil dipetakan ke referensi backend terkontrol.",
      };
    },
  });
}

export const sikesraReligionReferenceService = createSikesraReligionReferenceService();
