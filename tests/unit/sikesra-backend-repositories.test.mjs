import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraReligionReferenceRepository } from "../../src/backend/repositories/religion-reference-repository.mjs";

test("SIKESRA religion reference repository exposes persistence-ready seam metadata", () => {
  const repository = createSikesraReligionReferenceRepository();

  assert.equal(repository.seam.status, "repository_backend_seam_ready");
  assert.equal(repository.seam.followUpIssue, "ahliweb/sikesra#49");
  assert.equal(repository.seam.sourceIssue, "ahliweb/sikesra#56");
  assert.equal(repository.seam.storage, "repository_seed_repository_with_persistence_contract");
  assert.equal(repository.persistenceMigration?.name, "001_create_religion_reference_tables");
});

test("SIKESRA religion reference repository lists canonical seed references", () => {
  const repository = createSikesraReligionReferenceRepository();
  const references = repository.list();

  assert.deepEqual(references.map((item) => item.code), [
    "islam",
    "kristen",
    "katolik",
    "hindu",
    "buddha",
    "konghucu",
    "kepercayaan",
  ]);
});

test("SIKESRA religion reference repository finds values by reviewed aliases", () => {
  const repository = createSikesraReligionReferenceRepository();
  const reference = repository.findByAny("Konghuchu");

  assert.equal(reference?.code, "konghucu");
  assert.equal(repository.findByAny("Agama Tidak Dikenal"), null);
});
