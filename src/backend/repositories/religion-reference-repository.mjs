import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
} from "../reference-data/religion-reference.mjs";
import { SIKESRA_DB_MIGRATIONS } from "../../db/migrations/index.mjs";

export function createSikesraReligionReferenceRepository() {
  const persistenceMigration = SIKESRA_DB_MIGRATIONS.find((migration) => migration.name === "001_create_religion_reference_tables");

  return Object.freeze({
    seam: Object.freeze({
      ...SIKESRA_RELIGION_REFERENCE_SEAM,
      sourceIssue: "ahliweb/sikesra#56",
      storage: "repository_seed_repository_with_persistence_contract",
      note: "Repository backend referensi agama sekarang terhubung ke kontrak migrasi persistensi tanpa mengubah kontrak service pembaca.",
    }),
    persistenceMigration,
    list({ includeInactive = false } = {}) {
      return listSikesraReligionReferences({ includeInactive });
    },
    findByAny(value) {
      return findSikesraReligionReference(value);
    },
  });
}

export const sikesraReligionReferenceRepository = createSikesraReligionReferenceRepository();
