// SIKESRA Plugin State Tests
// Verify inactive plugin 404 behavior and activation gates
// Source: docs/sikesra/02_architecture.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { getPublicMetadata, getPublicSummary } from "../services/public";

function makePublicContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: `req_${Date.now()}`,
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "public",
    roles: ["public"],
    permissions: [],
    subjectAttributes: {},
    regionScope: {},
    ...overrides,
  });
}

async function seedPluginState(db: InMemoryD1Binding, isActive: boolean) {
  await db.prepare(
    `INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_enabled, public_title, public_description, data_scope_note, small_cell_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("settings-1", "test-tenant", "test-site", isActive ? 1 : 0, "SIKESRA Public", "Public data", "Aggregate only", 5, new Date().toISOString(), new Date().toISOString()).run();
}

async function seedPublicTestData(db: InMemoryD1Binding) {
  // Seed object types
  await db.prepare(
    `INSERT INTO awcms_sikesra_object_types (id, tenant_id, site_id, code, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("type-1", "test-tenant", "test-site", "01", "Keluarga Penerima Manfaat", 1, new Date().toISOString(), new Date().toISOString()).run();

  // Seed regions
  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("district-1", "test-tenant", "test-site", "620102", "District Test", "district", new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("village-1", "test-tenant", "test-site", "6201021005", "Village Test", "village", new Date().toISOString(), new Date().toISOString()).run();

  // Seed entities
  for (let i = 0; i < 10; i++) {
    await db.prepare(
      `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, sikesra_id, object_type_code, official_village_code, status_data, status_verification, sensitivity_level, religion_attribute, desil_attribute, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `entity-${i}`,
      "test-tenant",
      "test-site",
      `KPM-00${i}`,
      "01",
      "6201021005",
      "active",
      "verified",
      "public_safe",
      "Islam",
      "3",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  }
}

describe("SIKESRA Plugin State Tests", () => {
  describe("Inactive Plugin Behavior", () => {
    it("should return safe empty response when plugin is inactive", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, false);
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      expect(result.kpis.totalEntities).toBe(0);
      expect(result.kpis.verifiedEntities).toBe(0);
      expect(result.kpis.activeVillages).toBe(0);
      expect(result.charts.byObjectType).toEqual([]);
      expect(result.charts.byRegion).toEqual([]);
    });

    it("should not expose entity data when plugin is inactive", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, false);
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      // Should return zeros, not actual data
      expect(result.kpis.totalEntities).toBe(0);
      expect(result.charts.byObjectType.length).toBe(0);
    });

    it("should return safe metadata when plugin is inactive", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, false);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      expect(result.enabled).toBe(false);
      expect(result.title).toBeDefined();
    });
  });

  describe("Active Plugin Behavior", () => {
    it("should return data when plugin is active", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, true);
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      expect(result.kpis.totalEntities).toBeGreaterThan(0);
      expect(result.kpis.verifiedEntities).toBeGreaterThan(0);
      expect(result.charts.byObjectType.length).toBeGreaterThan(0);
    });

    it("should return enabled metadata when plugin is active", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, true);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      expect(result.enabled).toBe(true);
    });
  });

  describe("Public Data Safety", () => {
    it("should never expose individual names in public summary", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, true);
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      const allLabels = [
        ...result.charts.byObjectType.map((p) => p.label),
        ...result.charts.byRegion.map((p) => p.label),
      ];

      for (const label of allLabels) {
        expect(label).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      }
    });

    it("should never expose NIK/KIA in public metadata", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, true);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      expect(result.title).not.toMatch(/nik|kia|hash/i);
      expect(result.description).not.toMatch(/nik|kia|hash/i);
    });

    it("should include caveat in public summary", async () => {
      const db = new InMemoryD1Binding();
      await seedPluginState(db, true);
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      expect(result.caveat).toContain("agregat");
    });
  });
});
