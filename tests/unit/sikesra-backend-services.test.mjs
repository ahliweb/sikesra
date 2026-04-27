import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraReligionReferenceService } from "../../src/backend/services/religion-reference-service.mjs";

test("SIKESRA religion reference service exposes seam metadata", () => {
  const service = createSikesraReligionReferenceService();

  assert.equal(service.seam.status, "repository_backend_seam_ready");
  assert.equal(service.seam.followUpIssue, "ahliweb/sikesra#49");
  assert.equal(service.seam.sourceIssue, "ahliweb/sikesra#69");
});

test("SIKESRA religion reference service lists canonical option values", () => {
  const service = createSikesraReligionReferenceService();
  const options = service.listOptions();

  assert.deepEqual(options.map((item) => item.value), ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu", "kepercayaan"]);
  assert.ok(options.every((item) => item.active === true));
});

test("SIKESRA religion reference service normalizes aliases and import values", () => {
  const service = createSikesraReligionReferenceService();

  assert.deepEqual(service.normalizeValue("Katholik"), { value: "katolik", label: "Katolik" });

  const mapped = service.mapImportValue("Kristen Protestan");
  const unknown = service.mapImportValue("Agama Tidak Dikenal");

  assert.equal(mapped.ok, true);
  assert.equal(mapped.value, "kristen");
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /tidak ditemukan/i);
});

test("SIKESRA religion reference service runtime helpers preserve fallback behavior", async () => {
  const service = createSikesraReligionReferenceService();

  const options = await service.listRuntimeOptions();
  const normalized = await service.normalizeRuntimeValue("Budha");
  const mapped = await service.mapRuntimeImportValue("Konghuchu");

  assert.equal(options[0]?.value, "islam");
  assert.deepEqual(normalized, { value: "buddha", label: "Buddha" });
  assert.equal(mapped.ok, true);
  assert.equal(mapped.value, "konghucu");
});
