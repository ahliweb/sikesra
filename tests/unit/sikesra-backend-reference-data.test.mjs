import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
  mapSikesraReligionReferenceImport,
  toSikesraReligionOption,
} from "../../src/backend/reference-data/religion-reference.mjs";

test("SIKESRA backend religion reference seam is ready for future persistence attachment", () => {
  assert.equal(SIKESRA_RELIGION_REFERENCE_SEAM.status, "repository_backend_seam_ready");
  assert.equal(SIKESRA_RELIGION_REFERENCE_SEAM.followUpIssue, "ahliweb/sikesra#49");
  assert.equal(SIKESRA_RELIGION_REFERENCE_SEAM.sourceIssue, "ahliweb/sikesra#52");
});

test("SIKESRA backend religion reference seed exposes reviewed active values", () => {
  const references = listSikesraReligionReferences();
  const codes = references.map((item) => item.code);

  assert.deepEqual(codes, ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu", "kepercayaan"]);
  assert.ok(references.every((item) => item.active === true));
});

test("SIKESRA backend religion reference import mapping normalizes aliases", () => {
  const katolik = mapSikesraReligionReferenceImport("Katholik");
  const konghucu = mapSikesraReligionReferenceImport("Kong Hu Cu");
  const unknown = mapSikesraReligionReferenceImport("Agama Baru");

  assert.equal(katolik.ok, true);
  assert.equal(katolik.reference.code, "katolik");
  assert.equal(konghucu.ok, true);
  assert.equal(konghucu.reference.code, "konghucu");
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /tidak ditemukan/i);
});

test("SIKESRA backend religion reference lookup and option helper stay UI-compatible", () => {
  const reference = findSikesraReligionReference("Kristen Protestan");
  const option = toSikesraReligionOption(reference);

  assert.equal(reference.code, "kristen");
  assert.deepEqual(option, {
    value: "kristen",
    label: "Kristen",
    active: true,
    referenceId: "agama_kristen",
  });
});
