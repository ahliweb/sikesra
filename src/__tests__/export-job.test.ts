// SIKESRA Export Job Tests
// Verify export job creation, file generation, download flow, and audit
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { createExportJob, getExportJob, getReports, type ExportCreateInput } from "../services/export";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: `req_${Date.now()}`,
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "test-user",
    roles: ["admin"],
    permissions: Object.values(SIKESRA_PERMISSIONS),
    regionScope: { villageCodes: [] },
    ...overrides,
  });
}

async function seedExportTestData(db: InMemoryD1Binding) {
  // Seed entities
  for (let i = 0; i < 5; i++) {
    await db.prepare(
      `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `entity-${i}`,
      "test-tenant",
      "test-site",
      "01",
      "01",
      "person",
      `Test Person ${i}`,
      "6201021005",
      "public_safe",
      i < 3 ? "active" : "draft",
      i < 3 ? "verified" : "pending",
      80,
      "manual",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  }
}

// Mock R2 bucket for testing
function createMockR2Bucket(): any {
  const storage = new Map<string, any>();
  return {
    put: async (key: string, value: any, options?: any) => {
      storage.set(key, { value, options });
    },
    get: async (key: string) => {
      const item = storage.get(key);
      return item ? { body: item.value } : null;
    },
    head: async (key: string) => {
      const item = storage.get(key);
      return item ? { size: item.value.length } : null;
    },
    delete: async (key: string) => {
      storage.delete(key);
    },
  };
}

describe("SIKESRA Export Job Tests", () => {
  describe("Report Metadata", () => {
    it("should return available reports", async () => {
      const reports = await getReports();

      expect(reports.length).toBeGreaterThan(0);
      expect(reports.some(r => r.id === "entity_summary")).toBe(true);
      expect(reports.some(r => r.id === "verification_status")).toBe(true);
    });

    it("should include field sensitivity information", async () => {
      const reports = await getReports();

      for (const report of reports) {
        expect(report.availableFields.length).toBeGreaterThan(0);
        for (const field of report.availableFields) {
          expect(field.key).toBeDefined();
          expect(field.label).toBeDefined();
          expect(field.sensitivity).toBeDefined();
        }
      }
    });

    it("should include required permission for each report", async () => {
      const reports = await getReports();

      for (const report of reports) {
        expect(report.requiredPermission).toBeDefined();
        expect(report.requiredPermission).toMatch(/^awcms:sikesra:/);
      }
    });
  });

  describe("Export Job Creation", () => {
    it("should create export job with pending status", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const result = await createExportJob(db, input, ctx);

      expect(result.id).toBeTruthy();
      expect(result.status).toBe("pending");
    });

    it("should create export job with reason", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_detail_restricted",
        format: "xlsx",
        reason: "Monthly reporting requirement",
      };

      const result = await createExportJob(db, input, ctx);

      expect(result.id).toBeTruthy();
      expect(result.status).toBe("pending");
    });

    it("should audit export job creation", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const result = await createExportJob(db, input, ctx);

      // Check audit log
      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'export_job' AND resource_id = ?`
      ).bind(result.id).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBe(1);
    });

    it("should audit restricted export with reason", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_detail_restricted",
        format: "xlsx",
        reason: "Compliance audit requirement",
      };

      const result = await createExportJob(db, input, ctx);

      // Check audit log
      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'export_job' AND resource_id = ?`
      ).bind(result.id).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBe(1);
    });
  });

  describe("Export Job Retrieval", () => {
    it("should retrieve export job by ID", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);
      const job = await getExportJob(db, created.id, ctx);

      expect(job).not.toBeNull();
      expect(job?.id).toBe(created.id);
      expect(job?.reportType).toBe("entity_summary");
      expect(job?.status).toBe("pending");
      expect(job?.format).toBe("csv");
    });

    it("should return null for nonexistent job ID", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const job = await getExportJob(db, "nonexistent", ctx);

      expect(job).toBeNull();
    });

    it("should enforce tenant/site isolation on job retrieval", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);

      // Try to access from different tenant context
      const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
      const job = await getExportJob(db, created.id, otherCtx);

      expect(job).toBeNull();
    });
  });

  describe("Export Job Status Flow", () => {
    it("should track job status from pending to ready", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);

      // Initial status should be pending
      const initialJob = await getExportJob(db, created.id, ctx);
      expect(initialJob?.status).toBe("pending");

      // Generate file
      const { generateExportFile } = await import("../services/export");
      const result = await generateExportFile(db, r2, created.id, ctx);

      // Status should be ready
      const finalJob = await getExportJob(db, created.id, ctx);
      expect(finalJob?.status).toBe("ready");
      expect(finalJob?.totalRows).toBe(5);
    });

    it("should fail gracefully for invalid report type", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "nonexistent_report",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);

      // Generate file should handle unknown report type
      const { generateExportFile } = await import("../services/export");
      await expect(generateExportFile(db, r2, created.id, ctx)).resolves.toBeDefined();
    });
  });

  describe("Export Format Support", () => {
    it("should support CSV format", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);
      const { generateExportFile } = await import("../services/export");
      const result = await generateExportFile(db, r2, created.id, ctx);

      expect(result.r2Key).toContain(".csv");
    });

    it("should support XLSX format", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "xlsx",
      };

      const created = await createExportJob(db, input, ctx);
      const { generateExportFile } = await import("../services/export");
      const result = await generateExportFile(db, r2, created.id, ctx);

      expect(result.r2Key).toContain(".xlsx");
    });

    it("should default to CSV format when not specified", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
      };

      const created = await createExportJob(db, input, ctx);
      const job = await getExportJob(db, created.id, ctx);

      expect(job?.format).toBe("csv");
    });
  });

  describe("Export Download Flow", () => {
    it("should download export file and audit download", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);
      const { generateExportFile, downloadExportFile } = await import("../services/export");
      await generateExportFile(db, r2, created.id, ctx);

      const download = await downloadExportFile(db, r2, created.id, ctx);

      expect(download.filename).toContain("entity_summary");
      expect(download.filename).toContain(".csv");
      expect(download.mimeType).toBe("text/csv");

      // Check download was audited
      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'export_job' AND resource_id = ? AND action LIKE '%download%'`
      ).bind(created.id).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBe(1);
    });

    it("should fail download for pending job", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const input: ExportCreateInput = {
        reportType: "entity_summary",
        format: "csv",
      };

      const created = await createExportJob(db, input, ctx);
      const { downloadExportFile } = await import("../services/export");

      await expect(downloadExportFile(db, r2, created.id, ctx)).rejects.toThrow("EXPORT_JOB_NOT_READY");
    });

    it("should fail download for nonexistent job", async () => {
      const db = new InMemoryD1Binding();
      await seedExportTestData(db);
      const ctx = makeContext();
      const r2 = createMockR2Bucket();

      const { downloadExportFile } = await import("../services/export");

      await expect(downloadExportFile(db, r2, "nonexistent", ctx)).rejects.toThrow("EXPORT_JOB_NOT_FOUND");
    });
  });
});
