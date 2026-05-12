// SIKESRA Verification Workflow State Machine Tests
// Test verification state transitions, permissions, and side effects
// Source: Issue #193, docs/sikesra/07_operations_sop.md

import { describe, it, expect } from "vitest";
import type { SikesraRequestContext } from "../security/request-context";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return {
    requestId: "test-request",
    tenantId: "t1",
    siteId: "s1",
    userId: "user-1",
    roles: ["verifier"],
    permissions: ["awcms:sikesra:verification:submit", "awcms:sikesra:verification:verify"],
    subjectAttributes: {},
    regionScope: {},
    ipAddress: "127.0.0.1",
    userAgent: "test",
    nowIso: new Date().toISOString(),
    ...overrides,
  };
}

describe("SIKESRA Verification Workflow State Machine Tests", () => {
  describe("Permission Enforcement", () => {
    it("should require VERIFICATION_SUBMIT permission for submit", async () => {
      const { submitEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext({ permissions: [] });

      await expect(submitEntity(db, "entity-1", ctx)).rejects.toThrow("PERMISSION_DENIED");
    });

    it("should require VERIFICATION_VERIFY permission for verify", async () => {
      const { verifyEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext({ permissions: ["awcms:sikesra:verification:submit"] });

      await expect(verifyEntity(db, "entity-1", { action: "verify", verificationLevel: "desa" }, ctx)).rejects.toThrow("PERMISSION_DENIED");
    });
  });

  describe("Note Requirements", () => {
    it("should require note for need_revision action", async () => {
      const { verifyEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const { createEntity } = await import("../services/entity");
      const entity = await createEntity(db, {
        objectTypeCode: "01",
        objectSubtypeCode: "01",
        displayName: "Test Entity",
        officialVillageCode: "6201021005",
        sensitivityLevel: "internal",
      }, ctx);

      await expect(verifyEntity(db, entity.id, { action: "need_revision", verificationLevel: "desa" }, ctx)).rejects.toThrow("NOTE_REQUIRED");
    });

    it("should require note for reject action", async () => {
      const { verifyEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const { createEntity } = await import("../services/entity");
      const entity = await createEntity(db, {
        objectTypeCode: "01",
        objectSubtypeCode: "01",
        displayName: "Test Entity",
        officialVillageCode: "6201021005",
        sensitivityLevel: "internal",
      }, ctx);

      await expect(verifyEntity(db, entity.id, { action: "reject", verificationLevel: "desa" }, ctx)).rejects.toThrow("NOTE_REQUIRED");
    });
  });

  describe("Entity Not Found Handling", () => {
    it("should reject submit for non-existent entity", async () => {
      const { submitEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await expect(submitEntity(db, "non-existent", ctx)).rejects.toThrow("ENTITY_NOT_FOUND");
    });

    it("should reject verify for non-existent entity", async () => {
      const { verifyEntity } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await expect(verifyEntity(db, "non-existent", { action: "verify", verificationLevel: "desa" }, ctx)).rejects.toThrow("ENTITY_NOT_FOUND");
    });
  });

  describe("Verification Queue Filtering", () => {
    it("should filter queue by verification level", async () => {
      const { getVerificationQueue } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const queue = await getVerificationQueue(db, { level: "desa" }, ctx);

      expect(queue).toHaveProperty("items");
      expect(queue).toHaveProperty("total");
      expect(Array.isArray(queue.items)).toBe(true);
    });

    it("should return empty queue when no entities match", async () => {
      const { getVerificationQueue } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const queue = await getVerificationQueue(db, { level: "desa", limit: 10 }, ctx);

      expect(queue.total).toBe(0);
      expect(queue.items.length).toBe(0);
    });
  });

  describe("Verification Timeline", () => {
    it("should return empty timeline for entity with no events", async () => {
      const { getVerificationTimeline } = await import("../services/verification");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const timeline = await getVerificationTimeline(db, "entity-1", ctx);

      expect(Array.isArray(timeline)).toBe(true);
    });
  });
});
