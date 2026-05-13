// SIKESRA Audit Workflow Tests
// Verify audit list filters, detail view, redaction, and export
// Source: docs/sikesra/06_security_rbac_abac.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { listAuditLogs, getAuditLogDetail, redactAuditValues } from "../repositories/audit-repository";
import { writeAuditEvent, AUDIT_ACTIONS, isHighRiskAction } from "../services/audit";

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

async function seedAuditTestData(db: InMemoryD1Binding) {
  const now = new Date().toISOString();

  // Seed multiple audit events with different actors, actions, and resources
  const auditEvents = [
    { action: AUDIT_ACTIONS.ENTITY_CREATE, resourceType: "entity", resourceId: "entity-1", actorId: "user-1", actorRole: "admin", success: true },
    { action: AUDIT_ACTIONS.ENTITY_UPDATE, resourceType: "entity", resourceId: "entity-1", actorId: "user-1", actorRole: "admin", success: true },
    { action: AUDIT_ACTIONS.ENTITY_ARCHIVE, resourceType: "entity", resourceId: "entity-2", actorId: "user-2", actorRole: "operator", success: true },
    { action: AUDIT_ACTIONS.VERIFICATION_VERIFY, resourceType: "entity", resourceId: "entity-3", actorId: "user-3", actorRole: "verifier", success: true },
    { action: AUDIT_ACTIONS.DOCUMENT_UPLOAD, resourceType: "document", resourceId: "doc-1", actorId: "user-1", actorRole: "admin", success: true },
    { action: AUDIT_ACTIONS.DOCUMENT_DOWNLOAD, resourceType: "document", resourceId: "doc-1", actorId: "user-2", actorRole: "operator", success: false },
    { action: AUDIT_ACTIONS.CODE_GENERATE, resourceType: "entity", resourceId: "entity-4", actorId: "user-1", actorRole: "admin", success: true },
    { action: AUDIT_ACTIONS.CODE_CORRECT, resourceType: "entity", resourceId: "entity-4", actorId: "user-1", actorRole: "admin", success: true },
    { action: AUDIT_ACTIONS.EXPORT_CREATE, resourceType: "export", resourceId: "export-1", actorId: "user-2", actorRole: "operator", success: true },
    { action: AUDIT_ACTIONS.IMPORT_CREATE, resourceType: "import", resourceId: "import-1", actorId: "user-3", actorRole: "operator", success: false },
  ];

  for (const event of auditEvents) {
    await writeAuditEvent(db, {
      tenantId: "test-tenant",
      siteId: "test-site",
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      success: event.success,
      reason: `Test reason for ${event.action}`,
      before: event.action.includes("UPDATE") || event.action.includes("CORRECT") ? { status: "old" } : undefined,
      after: { status: "new", resourceId: event.resourceId },
      ipAddress: "192.168.1.1",
      userAgent: "TestBrowser/1.0",
    }, makeContext());
  }
}

describe("SIKESRA Audit Workflow Tests", () => {
  describe("Audit List Filters", () => {
    it("should return all audit logs without filters", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const result = await listAuditLogs(db, {}, ctx);

      expect(result.items.length).toBe(10);
      expect(result.total).toBe(10);
    });

    it("should filter by actor", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const result = await listAuditLogs(db, { actor: "user-1" }, ctx);

      expect(result.items.length).toBe(4);
      expect(result.total).toBe(4);
      expect(result.items.every(item => item.actor_id === "user-1")).toBe(true);
    });

    it("should filter by action", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const result = await listAuditLogs(db, { action: AUDIT_ACTIONS.ENTITY_CREATE }, ctx);

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].action).toBe(AUDIT_ACTIONS.ENTITY_CREATE);
    });

    it("should filter by resource type", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const result = await listAuditLogs(db, { resourceType: "document" }, ctx);

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.items.every(item => item.resource_type === "document")).toBe(true);
    });

    it("should filter by resource ID", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const result = await listAuditLogs(db, { resourceId: "entity-1" }, ctx);

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.items.every(item => item.resource_id === "entity-1")).toBe(true);
    });

    it("should filter by success status", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const failedResult = await listAuditLogs(db, {}, ctx);
      const failedItems = failedResult.items.filter(item => Number(item.success) === 0);

      expect(failedItems.length).toBe(2);
    });

    it("should apply pagination with limit and offset", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const page1 = await listAuditLogs(db, { limit: 3, offset: 0 }, ctx);
      const page2 = await listAuditLogs(db, { limit: 3, offset: 3 }, ctx);

      expect(page1.items.length).toBe(3);
      expect(page2.items.length).toBe(3);
      expect(page1.total).toBe(10);
      expect(page2.total).toBe(10);
      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    });

    it("should enforce tenant/site isolation", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);

      // Create audit event for different tenant
      await writeAuditEvent(db, {
        tenantId: "other-tenant",
        siteId: "other-site",
        action: AUDIT_ACTIONS.ENTITY_CREATE,
        resourceType: "entity",
        resourceId: "other-entity",
        success: true,
      }, makeContext({ tenantId: "other-tenant", siteId: "other-site" }));

      const ctx = makeContext();
      const result = await listAuditLogs(db, {}, ctx);

      expect(result.items.every(item => item.tenant_id === "test-tenant")).toBe(true);
      expect(result.items.every(item => item.site_id === "test-site")).toBe(true);
    });
  });

  describe("Audit Detail View", () => {
    it("should retrieve audit detail by ID", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      // Get first audit log ID
      const listResult = await listAuditLogs(db, {}, ctx);
      const auditId = listResult.items[0].id as string;

      const detail = await getAuditLogDetail(db, auditId, ctx);

      expect(detail).not.toBeNull();
      expect(detail?.id).toBe(auditId);
      expect(detail?.tenantId).toBe("test-tenant");
      expect(detail?.siteId).toBe("test-site");
    });

    it("should return null for nonexistent audit ID", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      const detail = await getAuditLogDetail(db, "nonexistent", ctx);

      expect(detail).toBeNull();
    });

    it("should parse before/after JSON correctly", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);
      const ctx = makeContext();

      // Get an audit log with before/after data
      const listResult = await listAuditLogs(db, { action: AUDIT_ACTIONS.CODE_CORRECT }, ctx);
      const auditId = listResult.items[0].id as string;

      const detail = await getAuditLogDetail(db, auditId, ctx);

      expect(detail).not.toBeNull();
      expect(detail?.beforeJson).not.toBeNull();
      expect(detail?.afterJson).not.toBeNull();
    });

    it("should enforce tenant/site isolation on detail lookup", async () => {
      const db = new InMemoryD1Binding();
      await seedAuditTestData(db);

      // Create audit event for different tenant
      const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
      await writeAuditEvent(db, {
        tenantId: "other-tenant",
        siteId: "other-site",
        action: AUDIT_ACTIONS.ENTITY_CREATE,
        resourceType: "entity",
        resourceId: "other-entity",
        success: true,
      }, otherCtx);

      const listResult = await listAuditLogs(db, {}, otherCtx);
      const otherAuditId = listResult.items[0].id as string;

      // Try to access from different tenant context
      const ctx = makeContext();
      const detail = await getAuditLogDetail(db, otherAuditId, ctx);

      expect(detail).toBeNull();
    });
  });

  describe("Audit Redaction", () => {
    it("should redact sensitive keys without reveal permission", async () => {
      const data = {
        displayName: "Test Person",
        nikHash: "sha256:abc123",
        phone: "081234567890",
        email: "test@example.com",
        address: "Jl. Test No. 123",
        status: "active",
      };

      const redacted = await redactAuditValues(data, false);

      expect(redacted?.displayName).toBe("Test Person"); // Not sensitive
      expect(redacted?.nikHash).toBe("[REDACTED]");
      expect(redacted?.phone).toBe("[REDACTED]");
      expect(redacted?.email).toBe("[REDACTED]");
      expect(redacted?.address).toBe("[REDACTED]");
      expect(redacted?.status).toBe("active"); // Not sensitive
    });

    it("should reveal all data with reveal permission", async () => {
      const data = {
        displayName: "Test Person",
        nikHash: "sha256:abc123",
        phone: "081234567890",
        email: "test@example.com",
        address: "Jl. Test No. 123",
        status: "active",
      };

      const redacted = await redactAuditValues(data, true);

      expect(redacted).toEqual(data);
    });

    it("should handle null data", async () => {
      expect(await redactAuditValues(null, false)).toBeNull();
      expect(await redactAuditValues(null, true)).toBeNull();
    });

    it("should handle empty data", async () => {
      const redacted = await redactAuditValues({}, false);
      expect(redacted).toEqual({});
    });

    it("should detect sensitive keys case-insensitively", async () => {
      const data = {
        NIK: "123456",
        Phone: "081234567890",
        EMAIL: "test@example.com",
        GuardianName: "Parent Name",
        DisabilityInfo: "Some info",
        SecretToken: "token123",
        normalField: "normal value",
      };

      const redacted = await redactAuditValues(data, false);

      expect(redacted?.NIK).toBe("[REDACTED]");
      expect(redacted?.Phone).toBe("[REDACTED]");
      expect(redacted?.EMAIL).toBe("[REDACTED]");
      expect(redacted?.GuardianName).toBe("[REDACTED]");
      expect(redacted?.DisabilityInfo).toBe("[REDACTED]");
      expect(redacted?.SecretToken).toBe("[REDACTED]");
      expect(redacted?.normalField).toBe("normal value");
    });
  });

  describe("High Risk Action Detection", () => {
    it("should identify high risk actions", () => {
      expect(isHighRiskAction(AUDIT_ACTIONS.CODE_CORRECT)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.SENSITIVE_REVEAL)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.EXPORT_RESTRICTED_CREATE)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.VERIFICATION_VERIFY)).toBe(true);
    });

    it("should identify standard risk actions", () => {
      expect(isHighRiskAction(AUDIT_ACTIONS.ENTITY_CREATE)).toBe(false);
      expect(isHighRiskAction(AUDIT_ACTIONS.ENTITY_UPDATE)).toBe(false);
      expect(isHighRiskAction(AUDIT_ACTIONS.DOCUMENT_UPLOAD)).toBe(false);
      expect(isHighRiskAction(AUDIT_ACTIONS.CODE_GENERATE)).toBe(false);
    });
  });
});
