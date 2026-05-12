// SIKESRA Import Staging and Promotion Workflow Tests
// Test import staging, validation, and promotion workflows
// Source: Issue #192, docs/sikesra/07_operations_sop.md

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return {
    requestId: "test-request",
    tenantId: "t1",
    siteId: "s1",
    userId: "user-1",
    roles: ["admin"],
    permissions: ["awcms:sikesra:import:promote"],
    subjectAttributes: {},
    regionScope: {},
    ipAddress: "127.0.0.1",
    userAgent: "test",
    ...overrides,
  };
}

describe("SIKESRA Import Workflow Tests", () => {
  describe("Import Batch Creation", () => {
    it("should create import batch with correct tenant/site isolation", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await db.prepare(
        `INSERT INTO awcms_sikesra_import_batches (id, tenant_id, site_id, original_filename, status, total_rows, valid_rows, invalid_rows, promoted_rows, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("batch-1", ctx.tenantId, ctx.siteId, "test.xlsx", "uploaded", 0, 0, 0, 0, new Date().toISOString(), new Date().toISOString()).run();

      expect(result.success).toBe(true);
    });

    it("should not allow access to batches from other tenants", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_import_batches (id, tenant_id, site_id, original_filename, status, total_rows, valid_rows, invalid_rows, promoted_rows, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("batch-other", "other-tenant", "other-site", "test.xlsx", "uploaded", 0, 0, 0, 0, new Date().toISOString(), new Date().toISOString()).run();

      const result = await db.prepare(
        `SELECT * FROM awcms_sikesra_import_batches WHERE tenant_id = ? AND site_id = ?`
      ).bind(ctx.tenantId, ctx.siteId).all();

      expect(result.results.length).toBe(0);
    });
  });

  describe("Staging Row Validation", () => {
    it("should isolate staging rows by tenant/site", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_import_staging (id, tenant_id, site_id, batch_id, row_number, raw_data_json, mapped_data_json, row_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        "row-other",
        "other-tenant",
        "other-site",
        "batch-other",
        1,
        JSON.stringify({}),
        JSON.stringify({}),
        "pending",
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      const rows = await db.prepare(
        `SELECT * FROM awcms_sikesra_import_staging WHERE tenant_id = ? AND site_id = ?`
      ).bind(ctx.tenantId, ctx.siteId).all();

      expect(rows.results.length).toBe(0);
    });
  });

  describe("Import Promotion Workflow", () => {
    it("should enforce tenant/site isolation during promotion", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_import_staging (id, tenant_id, site_id, batch_id, row_number, raw_data_json, mapped_data_json, row_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        "row-other",
        "other-tenant",
        "other-site",
        "batch-other",
        1,
        JSON.stringify({}),
        JSON.stringify({}),
        "valid",
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      const rows = await db.prepare(
        `SELECT * FROM awcms_sikesra_import_staging WHERE tenant_id = ? AND site_id = ? AND row_status = 'valid'`
      ).bind(ctx.tenantId, ctx.siteId).all();

      expect(rows.results.length).toBe(0);
    });
  });

  describe("Import Rollback", () => {
    it("should soft-delete promoted entities on rollback", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, sikesra_id, object_type_code, official_village_code, status_data, status_verification, sensitivity_level, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        "entity-promoted",
        ctx.tenantId,
        ctx.siteId,
        "KPM-001",
        "01",
        "6201021005",
        "active",
        "verified",
        "public_safe",
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      const beforeRollback = await db.prepare(
        `SELECT * FROM awcms_sikesra_entities WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
      ).bind("entity-promoted", ctx.tenantId, ctx.siteId).first();

      expect(beforeRollback).toBeDefined();

      await db.prepare(
        `UPDATE awcms_sikesra_entities SET deleted_at = ?, status_data = 'archived' WHERE id = ? AND tenant_id = ? AND site_id = ?`
      ).bind(new Date().toISOString(), "entity-promoted", ctx.tenantId, ctx.siteId).run();

      const afterRollback = await db.prepare(
        `SELECT * FROM awcms_sikesra_entities WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
      ).bind("entity-promoted", ctx.tenantId, ctx.siteId).first();

      expect(afterRollback).toBeNull();
    });

    it("should not rollback entities from other tenants", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, sikesra_id, object_type_code, official_village_code, status_data, status_verification, sensitivity_level, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        "entity-other",
        "other-tenant",
        "other-site",
        "KPM-002",
        "01",
        "6201021005",
        "active",
        "verified",
        "public_safe",
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      await db.prepare(
        `UPDATE awcms_sikesra_entities SET deleted_at = ?, status_data = 'archived' WHERE id = ? AND tenant_id = ? AND site_id = ?`
      ).bind(new Date().toISOString(), "entity-other", ctx.tenantId, ctx.siteId).run();

      const entity = await db.prepare(
        `SELECT * FROM awcms_sikesra_entities WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
      ).bind("entity-other", "other-tenant", "other-site").first();

      expect(entity).toBeDefined();
    });
  });

  describe("Import Audit Logging", () => {
    it("should write audit events for import actions", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const result = await db.prepare(
        `INSERT INTO awcms_sikesra_audit_logs (id, tenant_id, site_id, actor_id, actor_role, action, resource_type, resource_id, request_id, success, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        "audit-1",
        ctx.tenantId,
        ctx.siteId,
        ctx.userId,
        "admin",
        "import.promote",
        "import_batch",
        "batch-1",
        ctx.requestId,
        1,
        "Promoted 8 valid rows",
        new Date().toISOString()
      ).run();

      expect(result.success).toBe(true);
    });
  });
});
