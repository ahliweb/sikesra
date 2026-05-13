// SIKESRA ID Generation Tests
// Verify 20-digit ID format, sequence, validation, and correction
// Source: docs/sikesra/07_operations_sop.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildSikesraId20 } from "../repositories/code-repository";
import { generateSikesraId, correctSikesraId } from "../services/code";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: `req_${Date.now()}`,
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "test-user",
    roles: ["admin"],
    permissions: [SIKESRA_PERMISSIONS.CODE_GENERATE, SIKESRA_PERMISSIONS.CODE_CORRECT],
    regionScope: { villageCodes: [] },
    ...overrides,
  });
}

async function seedCodeTestData(db: InMemoryD1Binding) {
  // Seed entity without ID
  await db.prepare(
    `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("entity-no-id", "test-tenant", "test-site", "01", "01", "person", "Test Person", "6201021005", "public_safe", "draft", "pending", 80, "manual", new Date().toISOString(), new Date().toISOString()).run();

  // Seed entity with ID
  await db.prepare(
    `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("entity-with-id", "test-tenant", "test-site", "62010210050101000001", "01", "01", "person", "Test Person With ID", "6201021005", "public_safe", "active", "verified", 100, "manual", new Date().toISOString(), new Date().toISOString()).run();

  // Seed archived entity (status_data = archived, but NOT soft-deleted)
  await db.prepare(
    `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("entity-archived", "test-tenant", "test-site", "01", "01", "person", "Archived Person", "6201021005", "public_safe", "archived", "verified", 80, "manual", new Date().toISOString(), new Date().toISOString()).run();
}

describe("SIKESRA ID Generation Tests", () => {
  describe("buildSikesraId20 Format", () => {
    it("should generate exactly 20-digit ID", () => {
      const id = buildSikesraId20("6201021005", "01", "01", 1);
      expect(id).toHaveLength(20);
      expect(id).toMatch(/^\d{20}$/);
    });

    it("should follow format [village_10][type_2][subtype_2][sequence_6]", () => {
      const id = buildSikesraId20("6201021005", "01", "01", 1);
      expect(id.startsWith("6201021005")).toBe(true);
      expect(id.slice(10, 12)).toBe("01");
      expect(id.slice(12, 14)).toBe("01");
      expect(id.slice(14)).toBe("000001");
    });

    it("should pad sequence to 6 digits", () => {
      expect(buildSikesraId20("6201021005", "01", "01", 1).slice(14)).toBe("000001");
      expect(buildSikesraId20("6201021005", "01", "01", 42).slice(14)).toBe("000042");
      expect(buildSikesraId20("6201021005", "01", "01", 999999).slice(14)).toBe("999999");
    });

    it("should handle different village codes", () => {
      const id1 = buildSikesraId20("6201021005", "01", "01", 1);
      const id2 = buildSikesraId20("3201012025", "02", "01", 1);
      expect(id1.startsWith("6201021005")).toBe(true);
      expect(id2.startsWith("3201012025")).toBe(true);
    });

    it("should handle different type/subtype codes", () => {
      const id = buildSikesraId20("6201021005", "02", "03", 1);
      expect(id.slice(10, 12)).toBe("02");
      expect(id.slice(12, 14)).toBe("03");
    });
  });

  describe("ID Generation Validation", () => {
    it("should block generation without permission", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext({ permissions: [] });

      await expect(generateSikesraId(db, "entity-no-id", ctx)).rejects.toThrow("Missing permission");
    });

    it("should block generation for nonexistent entity", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(generateSikesraId(db, "nonexistent", ctx)).rejects.toThrow("Entity not found");
    });

    it("should block generation for entity that already has ID", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(generateSikesraId(db, "entity-with-id", ctx)).rejects.toThrow("Entity already has a SIKESRA ID");
    });

    it("should block generation for archived entity", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(generateSikesraId(db, "entity-archived", ctx)).rejects.toThrow("Cannot generate ID for archived entity");
    });

    it("should enforce tenant/site isolation", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);

      // Create entity for different tenant
      await db.prepare(
        `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("entity-other-tenant", "other-tenant", "other-site", "01", "01", "person", "Other Tenant", "6201021005", "public_safe", "draft", "pending", 80, "manual", new Date().toISOString(), new Date().toISOString()).run();

      const ctx = makeContext();

      await expect(generateSikesraId(db, "entity-other-tenant", ctx)).rejects.toThrow("Entity not found");
    });
  });

  describe("ID Correction", () => {
    it("should correct ID with reason and audit", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      const result = await correctSikesraId(db, "entity-with-id", "62010210050101000099", "Test correction reason for audit purposes", ctx);

      expect(result.oldId).toBe("62010210050101000001");
      expect(result.newId).toBe("62010210050101000099");

      // Verify entity was updated
      const updated = await db.prepare(
        `SELECT sikesra_id_20 FROM awcms_sikesra_entities WHERE id = ?`
      ).bind("entity-with-id").first<{ sikesra_id_20: string }>();

      expect(updated?.sikesra_id_20).toBe("62010210050101000099");
    });

    it("should block correction without permission", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext({ permissions: [SIKESRA_PERMISSIONS.CODE_GENERATE] });

      await expect(correctSikesraId(db, "entity-with-id", "62010210050101000099", "Test correction reason for audit purposes", ctx)).rejects.toThrow("Missing permission");
    });

    it("should block correction for nonexistent entity", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(correctSikesraId(db, "nonexistent", "62010210050101000099", "Test correction reason for audit purposes", ctx)).rejects.toThrow("Entity not found");
    });

    it("should block correction for entity without ID", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(correctSikesraId(db, "entity-no-id", "62010210050101000099", "Test correction reason for audit purposes", ctx)).rejects.toThrow("Entity does not have a SIKESRA ID to correct");
    });

    it("should block correction with invalid new ID length", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(correctSikesraId(db, "entity-with-id", "123", "Test correction reason for audit purposes", ctx)).rejects.toThrow("New ID must be exactly 20 characters");
    });

    it("should block correction with empty reason", async () => {
      const db = new InMemoryD1Binding();
      await seedCodeTestData(db);
      const ctx = makeContext();

      await expect(correctSikesraId(db, "entity-with-id", "62010210050101000099", "", ctx)).rejects.toThrow("Reason is required");
    });
  });

  describe("ID Format Invariants", () => {
    it("should produce valid 20-digit IDs for different village codes", () => {
      const id = buildSikesraId20("3201012025", "02", "03", 42);
      expect(id).toHaveLength(20);
      expect(id.startsWith("3201012025")).toBe(true);
      expect(id.slice(10, 12)).toBe("02");
      expect(id.slice(12, 14)).toBe("03");
      expect(id.slice(14)).toBe("000042");
    });

    it("should never produce non-numeric characters", () => {
      for (let seq = 1; seq <= 100; seq++) {
        const id = buildSikesraId20("6201021005", "01", "01", seq);
        expect(id).toMatch(/^\d{20}$/);
      }
    });

    it("should maintain consistent format across large sequences", () => {
      const id = buildSikesraId20("6201021005", "01", "01", 999999);
      expect(id).toHaveLength(20);
      expect(id.slice(14)).toBe("999999");
    });
  });
});
