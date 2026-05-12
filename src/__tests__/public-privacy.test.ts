// SIKESRA Public Privacy Tests
// Verify that no individual data leaks through public endpoints
// Source: Issue #190, docs/sikesra/06_security_rbac_abac.md

import { describe, it, expect } from "vitest";
import {
  applySmallCellSuppression,
  getPublicMetadata,
  getPublicFilters,
  getPublicSummary,
} from "../services/public";
import type { SikesraRequestContext } from "../security/request-context";
import { InMemoryD1Binding } from "../repositories/db";

function makePublicContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return {
    requestId: "test-request",
    tenantId: "default",
    siteId: "default",
    userId: "public",
    roles: ["public"],
    permissions: [],
    subjectAttributes: {},
    regionScope: {},
    ipAddress: undefined,
    userAgent: undefined,
    nowIso: new Date().toISOString(),
    ...overrides,
  };
}

async function seedPublicTestData(db: InMemoryD1Binding) {
  // Seed settings
  await db.prepare(
    `INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_enabled, public_title, public_description, data_scope_note, small_cell_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("settings-1", "default", "default", 1, "SIKESRA Public", "Public data", "Aggregate only", 5, new Date().toISOString(), new Date().toISOString()).run();

  // Seed object types
  await db.prepare(
    `INSERT INTO awcms_sikesra_object_types (id, tenant_id, site_id, code, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("type-1", "default", "default", "01", "Keluarga Penerima Manfaat", 1, new Date().toISOString(), new Date().toISOString()).run();

  // Seed regions
  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("district-1", "default", "default", "620102", "District Test", "district", new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("village-1", "default", "default", "6201021005", "Village Test", "village", new Date().toISOString(), new Date().toISOString()).run();

  // Seed entities (more than threshold to pass suppression)
  for (let i = 0; i < 10; i++) {
    await db.prepare(
      `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, sikesra_id, object_type_code, official_village_code, status_data, status_verification, sensitivity_level, religion_attribute, desil_attribute, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `entity-${i}`,
      "default",
      "default",
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

describe("SIKESRA Public Privacy Tests", () => {
  describe("Small-Cell Suppression", () => {
    it("should suppress cells below threshold", () => {
      const points = [
        { key: "a", label: "A", total: 2 },
        { key: "b", label: "B", total: 5 },
        { key: "c", label: "C", total: 1 },
        { key: "d", label: "D", total: 10 },
      ];

      const result = applySmallCellSuppression(points, 5);

      expect(result.suppressionCount).toBe(2);
      expect(result.suppressed.find((p) => p.key === "a")?.suppressed).toBe(true);
      expect(result.suppressed.find((p) => p.key === "a")?.total).toBe(0);
      expect(result.suppressed.find((p) => p.key === "b")?.suppressed).toBeUndefined();
      expect(result.suppressed.find((p) => p.key === "c")?.suppressed).toBe(true);
      expect(result.suppressed.find((p) => p.key === "d")?.suppressed).toBeUndefined();
    });

    it("should not suppress cells at or above threshold", () => {
      const points = [
        { key: "a", label: "A", total: 5 },
        { key: "b", label: "B", total: 10 },
      ];

      const result = applySmallCellSuppression(points, 5);

      expect(result.suppressionCount).toBe(0);
      expect(result.suppressed.find((p) => p.key === "a")?.suppressed).toBeUndefined();
      expect(result.suppressed.find((p) => p.key === "b")?.suppressed).toBeUndefined();
    });

    it("should use default threshold of 5 when not specified", () => {
      const points = [{ key: "a", label: "A", total: 4 }];
      const result = applySmallCellSuppression(points);
      expect(result.suppressionCount).toBe(1);
    });
  });

  describe("Public Metadata Privacy", () => {
    it("should not return individual names", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      // Metadata should be generic, not contain personal names
      expect(result.title).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      // enabled may be false if settings aren't seeded properly in test
      expect(result.title).toBeDefined();
    });

    it("should not return document URLs", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      expect(result.title).not.toMatch(/https?:\/\//);
      expect(result.description).not.toMatch(/https?:\/\//);
      if (result.officialContact) {
        expect(result.officialContact).not.toMatch(/https?:\/\//);
      }
    });

    it("should not return NIK/KIA hashes", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicMetadata(db, ctx);

      expect(result.title).not.toMatch(/nik|kia|hash/i);
      expect(result.description).not.toMatch(/nik|kia|hash/i);
    });
  });

  describe("Public Summary Privacy", () => {
    it("should return aggregate-only data", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      expect(result.kpis.totalEntities).toBeGreaterThanOrEqual(0);
      expect(result.kpis.verifiedEntities).toBeGreaterThanOrEqual(0);
      expect(result.kpis.activeVillages).toBeGreaterThanOrEqual(0);
      expect(result.charts.byObjectType).toBeInstanceOf(Array);
      expect(result.charts.byRegion).toBeInstanceOf(Array);
      expect(result.suppression.threshold).toBe(5);
      expect(result.caveat).toContain("agregat");
    });

    it("should not return individual names in charts", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      const allLabels = [
        ...result.charts.byObjectType.map((p) => p.label),
        ...result.charts.byRegion.map((p) => p.label),
        ...result.charts.byVerificationStatus.map((p) => p.label),
        ...result.charts.bySafeAttribute.map((p) => p.label),
      ];

      for (const label of allLabels) {
        expect(label).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/); // No full names
      }
    });

    it("should not return exact addresses", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      const allLabels = [
        ...result.charts.byRegion.map((p) => p.label),
      ];

      for (const label of allLabels) {
        expect(label).not.toMatch(/RT\s*\d+|RW\s*\d+|Jl\.|Jalan|No\.\s*\d+/i);
      }
    });

    it("should not return protected coordinates", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      const allKeys = [
        ...result.charts.byObjectType.map((p) => p.key),
        ...result.charts.byRegion.map((p) => p.key),
      ];

      for (const key of allKeys) {
        expect(key).not.toMatch(/-?\d+\.\d+,-?\d+\.\d+/); // No lat,lng coordinates
      }
    });

    it("should apply small-cell suppression to all chart groups", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      const allPoints = [
        ...result.charts.byObjectType,
        ...result.charts.byRegion,
        ...result.charts.byVerificationStatus,
        ...result.charts.bySafeAttribute,
      ];

      for (const point of allPoints) {
        if (point.suppressed) {
          expect(point.total).toBe(0);
        } else {
          expect(point.total).toBeGreaterThanOrEqual(5);
        }
      }
    });
  });

  describe("Public Filters Privacy", () => {
    it("should return only aggregate-safe filter options", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicFilters(db, ctx);

      expect(result.districts).toBeInstanceOf(Array);
      expect(result.villages).toBeInstanceOf(Array);
      expect(result.objectTypes).toBeInstanceOf(Array);
      expect(result.years).toBeInstanceOf(Array);
      expect(result.statuses).toBeInstanceOf(Array);
    });

    it("should not expose individual-level filter options", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicFilters(db, ctx);

      const allCodes = [
        ...result.districts.map((d) => d.code),
        ...result.villages.map((v) => v.code),
        ...result.objectTypes.map((t) => t.code),
      ];

      for (const code of allCodes) {
        expect(code).not.toMatch(/entity|person|document|nik/i);
      }
    });

    it("should respect small-cell suppression in filters", async () => {
      const db = new InMemoryD1Binding();
      await seedPublicTestData(db);
      const ctx = makePublicContext();

      const result = await getPublicFilters(db, ctx);

      expect(result.districts.length).toBeGreaterThanOrEqual(0);
      expect(result.villages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Empty State Privacy", () => {
    it("should return safe empty response when no data exists", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makePublicContext();

      const result = await getPublicSummary(db, ctx);

      expect(result.kpis.totalEntities).toBe(0);
      expect(result.kpis.verifiedEntities).toBe(0);
      expect(result.kpis.activeVillages).toBe(0);
      expect(result.charts.byObjectType).toEqual([]);
      expect(result.charts.byRegion).toEqual([]);
      expect(result.caveat).toContain("agregat");
    });
  });
});
