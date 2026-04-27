import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_RELIGION_REFERENCE_ACCESS,
  createSikesraReligionReferenceService,
  evaluateReligionReferenceLifecycleAccess,
  evaluateReligionReferenceReadAccess,
} from "../../src/backend/services/religion-reference-service.mjs";

test("SIKESRA religion reference service exposes seam metadata", () => {
  const service = createSikesraReligionReferenceService();

  assert.equal(service.seam.status, "repository_backend_seam_ready");
  assert.equal(service.seam.followUpIssue, "ahliweb/sikesra#49");
  assert.equal(service.seam.sourceIssue, "ahliweb/sikesra#69");
  assert.equal(service.access.readInactivePermission, "sikesra.reference.manage");
  assert.equal(SIKESRA_RELIGION_REFERENCE_ACCESS.readInactiveAuditAction, "sikesra.reference.inactive_read");
  assert.equal(SIKESRA_RELIGION_REFERENCE_ACCESS.lifecycleUpdateAuditAction, "sikesra.reference.lifecycle_update");
});

test("SIKESRA religion reference read access requires reference.manage for inactive values", () => {
  const denied = evaluateReligionReferenceReadAccess({ includeInactive: true, permissions: [] });
  const allowed = evaluateReligionReferenceReadAccess({
    includeInactive: true,
    permissions: ["sikesra.reference.manage"],
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.code, "RELIGION_REFERENCE_INACTIVE_FORBIDDEN");
  assert.match(denied.message, /reference\.manage/i);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.auditAction, "sikesra.reference.inactive_read");
});

test("SIKESRA religion reference lifecycle access requires reference.manage", () => {
  const denied = evaluateReligionReferenceLifecycleAccess({ permissions: [] });
  const allowed = evaluateReligionReferenceLifecycleAccess({ permissions: ["sikesra.reference.manage"] });

  assert.equal(denied.allowed, false);
  assert.equal(denied.code, "RELIGION_REFERENCE_MANAGE_FORBIDDEN");
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.auditAction, "sikesra.reference.lifecycle_update");
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

test("SIKESRA religion reference service blocks unauthorized inactive runtime reads", async () => {
  const service = createSikesraReligionReferenceService();

  const denied = await service.listAuthorizedRuntimeOptions({ includeInactive: true, permissions: [] });
  const allowed = await service.listAuthorizedRuntimeOptions({
    includeInactive: true,
    permissions: ["sikesra.reference.manage"],
  });

  assert.equal(denied.ok, false);
  assert.equal(denied.code, "RELIGION_REFERENCE_INACTIVE_FORBIDDEN");
  assert.equal(allowed.ok, true);
  assert.equal(allowed.auditAction, "sikesra.reference.inactive_read");
  assert.ok(allowed.options.length >= 7);
});

test("SIKESRA religion reference service writes lifecycle audits through the managed service seam", async () => {
  const auditEntries = [];
  const service = createSikesraReligionReferenceService({
    repository: {
      seam: { status: "repository_backend_seam_ready", followUpIssue: "ahliweb/sikesra#49", sourceIssue: "ahliweb/sikesra#69" },
      list: () => [],
      listRuntime: async () => [],
      findByAny: () => null,
      findByAnyRuntime: async () => null,
      updateLifecycle: async () => ({
        id: "agama_islam",
        code: "islam",
        normalizedName: "islam",
        displayName: "Islam",
        active: false,
        previousActive: true,
        sortOrder: 1,
      }),
    },
    auditWriter: async (entry) => {
      auditEntries.push(entry);
    },
  });

  const result = await service.updateReferenceLifecycle({
    actorId: "user-1",
    permissions: ["sikesra.reference.manage"],
    referenceId: "agama_islam",
    isActive: false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.auditAction, "sikesra.reference.lifecycle_update");
  assert.deepEqual(result.reference, {
    value: "islam",
    label: "Islam",
    active: false,
    referenceId: "agama_islam",
  });
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].action, "sikesra.reference.lifecycle_update");
  assert.deepEqual(auditEntries[0].payloadSafe, {
    code: "islam",
    displayName: "Islam",
    previousActive: true,
    nextActive: false,
  });
});

test("SIKESRA religion reference service blocks unauthorized lifecycle updates", async () => {
  const service = createSikesraReligionReferenceService({
    repository: {
      seam: { status: "repository_backend_seam_ready", followUpIssue: "ahliweb/sikesra#49", sourceIssue: "ahliweb/sikesra#69" },
      list: () => [],
      listRuntime: async () => [],
      findByAny: () => null,
      findByAnyRuntime: async () => null,
      updateLifecycle: async () => {
        throw new Error("should not be called");
      },
    },
    auditWriter: async () => {
      throw new Error("should not be called");
    },
  });

  const result = await service.updateReferenceLifecycle({
    actorId: "user-1",
    permissions: [],
    referenceId: "agama_islam",
    isActive: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "RELIGION_REFERENCE_MANAGE_FORBIDDEN");
});
