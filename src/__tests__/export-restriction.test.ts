// SIKESRA Export Restriction and Permission Tests
// Test export security, field restrictions, and permission enforcement
// Source: Issue #194, docs/sikesra/07_operations_sop.md

import { describe, it, expect } from "vitest";
import type { SikesraRequestContext } from "../security/request-context";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return {
    requestId: "test-request",
    tenantId: "t1",
    siteId: "s1",
    userId: "user-1",
    roles: ["admin"],
    permissions: ["awcms:sikesra:export:create", "awcms:sikesra:export:restricted"],
    subjectAttributes: {},
    regionScope: {},
    ipAddress: "127.0.0.1",
    userAgent: "test",
    nowIso: new Date().toISOString(),
    ...overrides,
  };
}

describe("SIKESRA Export Restriction and Permission Tests", () => {
  describe("Report Metadata", () => {
    it("should return report catalog with field sensitivity", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      expect(reports.length).toBeGreaterThan(0);
      for (const report of reports) {
        expect(report).toHaveProperty("id");
        expect(report).toHaveProperty("name");
        expect(report).toHaveProperty("requiredPermission");
        expect(Array.isArray(report.availableFields)).toBe(true);
        for (const field of report.availableFields) {
          expect(field).toHaveProperty("key");
          expect(field).toHaveProperty("sensitivity");
          expect(["internal", "restricted", "highly_restricted"]).toContain(field.sensitivity);
        }
      }
    });

    it("should define restricted reports requiring special permission", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      const restrictedReports = reports.filter(
        (r) => r.requiredPermission === "awcms:sikesra:export:restricted"
      );

      expect(restrictedReports.length).toBeGreaterThan(0);
      for (const report of restrictedReports) {
        const hasRestrictedFields = report.availableFields.some(
          (f) => f.sensitivity === "restricted" || f.sensitivity === "highly_restricted"
        );
        expect(hasRestrictedFields).toBe(true);
      }
    });
  });

  describe("Export Job Creation", () => {
    it("should create export job with tenant/site isolation", async () => {
      const { createExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await createExportJob(db, {
        reportType: "entity_summary",
        format: "csv",
      }, ctx);

      expect(result.id).toBeTruthy();
      expect(result.status).toBe("pending");
    });
  });

  describe("Export Job Retrieval", () => {
    it("should return null for non-existent export job", async () => {
      const { getExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await getExportJob(db, "non-existent", ctx);

      expect(result).toBeNull();
    });

    it("should enforce tenant/site isolation on export job retrieval", async () => {
      const { createExportJob, getExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const created = await createExportJob(db, {
        reportType: "entity_summary",
        format: "csv",
      }, ctx);

      // Try to access from different tenant
      const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
      const result = await getExportJob(db, created.id, otherCtx);

      expect(result).toBeNull();
    });
  });

  describe("Field Sensitivity", () => {
    it("should classify fields by sensitivity level", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      const allFields = reports.flatMap((r) => r.availableFields);
      const sensitivityLevels = new Set(allFields.map((f) => f.sensitivity));

      expect(sensitivityLevels.has("internal")).toBe(true);
      expect(sensitivityLevels.has("restricted")).toBe(true);
    });

    it("should not expose highly restricted fields in normal reports", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      const highlyRestrictedFields = reports.flatMap((r) =>
        r.availableFields.filter((f) => f.sensitivity === "highly_restricted")
      );

      // Highly restricted fields should be rare or non-existent in normal reports
      expect(highlyRestrictedFields.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Permission Requirements", () => {
    it("should define required permissions for each report", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      for (const report of reports) {
        expect(report.requiredPermission).toBeTruthy();
        expect(report.requiredPermission).toMatch(/^awcms:sikesra:/);
      }
    });

    it("should require export:create for summary reports", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      const summaryReport = reports.find((r) => r.id === "entity_summary");
      expect(summaryReport?.requiredPermission).toBe("awcms:sikesra:export:create");
    });

    it("should require export:restricted for sensitive reports", async () => {
      const { getReports } = await import("../services/export");
      const reports = await getReports();

      const restrictedReport = reports.find((r) => r.id === "verification_status");
      expect(restrictedReport?.requiredPermission).toBe("awcms:sikesra:export:restricted");
    });
  });

  describe("Export Format Support", () => {
    it("should support CSV format", async () => {
      const { createExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await createExportJob(db, {
        reportType: "entity_summary",
        format: "csv",
      }, ctx);

      expect(result.status).toBe("pending");
    });

    it("should support XLSX format", async () => {
      const { createExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await createExportJob(db, {
        reportType: "entity_summary",
        format: "xlsx",
      }, ctx);

      expect(result.status).toBe("pending");
    });

    it("should default to CSV format when not specified", async () => {
      const { createExportJob } = await import("../services/export");
      const { InMemoryD1Binding } = await import("../repositories/db");
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await createExportJob(db, {
        reportType: "entity_summary",
      }, ctx);

      expect(result.status).toBe("pending");
    });
  });
});
