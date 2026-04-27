import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraReligionReferenceRepository } from "../../src/backend/repositories/religion-reference-repository.mjs";

test("SIKESRA religion reference repository exposes persistence-ready seam metadata", () => {
  const repository = createSikesraReligionReferenceRepository();

  assert.equal(repository.seam.status, "repository_backend_seam_ready");
  assert.equal(repository.seam.followUpIssue, "ahliweb/sikesra#49");
  assert.equal(repository.seam.sourceIssue, "ahliweb/sikesra#69");
  assert.equal(repository.seam.storage, "runtime_postgresql_preferred_with_seed_fallback");
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

test("SIKESRA religion reference repository runtime helpers fall back safely when runtime is unavailable", async () => {
  const repository = createSikesraReligionReferenceRepository();

  const references = await repository.listRuntime();
  const reference = await repository.findByAnyRuntime("Katholik");

  assert.equal(references[0]?.code, "islam");
  assert.equal(reference?.code, "katolik");
});

test("SIKESRA religion reference repository lifecycle updates require a runtime DB", async () => {
  const repository = createSikesraReligionReferenceRepository();

  await assert.rejects(
    repository.updateLifecycle({ referenceId: "agama_islam", isActive: false }),
    /RELIGION_REFERENCE_RUNTIME_UNAVAILABLE/
  );
});
