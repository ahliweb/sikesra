import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
} from "../reference-data/religion-reference.mjs";

export function createSikesraReligionReferenceRepository() {
  return Object.freeze({
    seam: Object.freeze({
      ...SIKESRA_RELIGION_REFERENCE_SEAM,
      sourceIssue: "ahliweb/sikesra#54",
      storage: "repository_seed_repository",
      note: "Repository backend referensi agama siap diganti ke persistence tanpa mengubah kontrak service pembaca.",
    }),
    list({ includeInactive = false } = {}) {
      return listSikesraReligionReferences({ includeInactive });
    },
    findByAny(value) {
      return findSikesraReligionReference(value);
    },
  });
}

export const sikesraReligionReferenceRepository = createSikesraReligionReferenceRepository();
