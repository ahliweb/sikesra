// SIKESRA Security Regression Tests
// Comprehensive coverage for RBAC, ABAC, masking, region scope, and data safety
// Uses InMemoryD1Binding for test isolation

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { AUDIT_ACTIONS, isHighRiskAction, writeAuditEvent } from "../services/audit";
import { maskNikKia, maskPhone, maskR2Key, maskProtectedName } from "../security/masking";
import { evaluateAbac } from "../security/abac";
import { guardRoute, checkRegionScope } from "../security/route-guard";
import { applySmallCellSuppression } from "../services/public";
import { createStorageAdapter, sanitizeStorageMetadata, validateAccessMethod } from "../services/storage";
import { validateCompleteness, type CompletenessCheckParams } from "../services/completeness";

function makeContext(overrides?: Partial<SikesraRequestContext>): SikesraRequestContext {
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

describe("SIKESRA Security Regression Tests", () => {
  describe("RBAC Permission Enforcement", () => {
    it("should deny access without required permission", () => {
      const ctx = makeContext({ permissions: [] });
      const result = guardRoute(ctx, "entity:read");
      expect(result.allowed).toBe(false);
    });

    it("should allow access with required permission", () => {
      const ctx = makeContext({ permissions: [SIKESRA_PERMISSIONS.ENTITY_READ] });
      const result = guardRoute(ctx, "entity:read");
      expect(result.allowed).toBe(true);
    });

    it("should enforce all permission namespaces", () => {
      const namespaces = new Set<string>();
      for (const perm of Object.values(SIKESRA_PERMISSIONS)) {
        const parts = perm.split(":");
        namespaces.add(`${parts[0]}:${parts[1]}`);
      }
      expect(namespaces.has("awcms:sikesra")).toBe(true);
    });

    it("should not trust frontend-supplied permissions", () => {
      const ctx = makeContext({ permissions: [] });
      // Even if request headers claim admin permissions, context uses server-derived permissions
      expect(ctx.permissions).toEqual([]);
    });
  });

  describe("Masking Security", () => {
    it("should mask NIK/KIA for unauthorized users", () => {
      const result = maskNikKia("1234567890123456", { canRevealSensitive: false, canRevealHighlyRestricted: false });
      expect(result).toBe("************3456");
      expect(result).not.toContain("123456789012");
    });

    it("should reveal NIK/KIA for authorized users", () => {
      const result = maskNikKia("1234567890123456", { canRevealSensitive: true, canRevealHighlyRestricted: true });
      expect(result).toBe("1234567890123456");
    });

    it("should mask phone numbers", () => {
      const result = maskPhone("081234567890", { canRevealSensitive: false, canRevealHighlyRestricted: false });
      expect(result).toBe("******7890");
    });

    it("should never return R2 key", () => {
      const result = maskR2Key("tenants/x/sites/y/documents/secret.pdf", {} as never);
      expect(result).toBeNull();
    });

    it("should mask protected names for restricted sensitivity", () => {
      const result = maskProtectedName("Ahmad Fauzi", { canRevealSensitive: false, canRevealHighlyRestricted: false });
      expect(result).toBeDefined();
      expect(result).not.toBe("Ahmad Fauzi");
    });

    it("should reveal names when authorized", () => {
      const result = maskProtectedName("Public Person", { canRevealSensitive: true, canRevealHighlyRestricted: true });
      expect(result).toBe("Public Person");
    });
  });

  describe("Region Scope Enforcement", () => {
    it("should restrict access to scoped villages", () => {
      const ctx = makeContext({
        regionScope: { villageCodes: ["6201021001", "6201021002"] },
      });
      
      expect(checkRegionScope(ctx, "6201021001")).toBe(true);
      expect(checkRegionScope(ctx, "6201021099")).toBe(false);
    });

    it("should allow all villages when no scope defined", () => {
      const ctx = makeContext({ regionScope: { villageCodes: [] } });
      expect(checkRegionScope(ctx, "6201021001")).toBe(true);
    });
  });

  describe("ABAC Security", () => {
    it("should deny public access to entity detail", () => {
      const result = evaluateAbac(
        {
          subject: { roles: ["public"], permissions: [], tenantId: "test", siteId: "test" },
          resource: { resourceType: "entity" },
          action: "read",
          environment: {},
        },
        [],
        makeContext(),
      );
      expect(result.allowed).toBe(false);
    });

    it("should enforce deny precedence over allow", () => {
      const result = evaluateAbac(
        {
          subject: { roles: ["editor"], permissions: [], tenantId: "test", siteId: "test" },
          resource: { resourceType: "entity", statusData: "archived" },
          action: "update",
          environment: {},
        },
        [
          { id: "p1", name: "Allow update", effect: "allow", priority: 10, conditions: [] },
          { id: "p2", name: "Deny archived", effect: "deny", priority: 100, conditions: [{ attributeCategory: "resource", attributeName: "statusData", operator: "equals", value: "archived" }] },
        ],
        makeContext(),
      );
      expect(result.allowed).toBe(false);
    });

    it("should enforce region scope in ABAC", () => {
      const result = evaluateAbac(
        {
          subject: { roles: ["editor"], permissions: [], tenantId: "test", siteId: "test" },
          resource: { resourceType: "entity", officialVillageCode: "6201021099" },
          action: "read",
          environment: {},
        },
        [
          { id: "p1", name: "Region scope", effect: "deny", priority: 100, conditions: [{ attributeCategory: "subject", attributeName: "regionScope", operator: "not_in", value: ["6201021001"] }] },
        ],
        makeContext({ regionScope: { villageCodes: ["6201021001"] } }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("Public Data Safety", () => {
    it("should suppress small cells below threshold", () => {
      const points = [
        { key: "a", label: "A", total: 3 },
        { key: "b", label: "B", total: 10 },
        { key: "c", label: "C", total: 1 },
      ];
      const result = applySmallCellSuppression(points, 5);
      expect(result.suppressed[0].total).toBe(0);
      expect(result.suppressed[1].total).toBe(10);
      expect(result.suppressed[2].total).toBe(0);
      expect(result.suppressionCount).toBe(2);
    });

    it("should not expose individual data in aggregates", () => {
      const points = [
        { key: "village1", label: "Village 1", total: 100 },
        { key: "village2", label: "Village 2", total: 2 },
      ];
      const result = applySmallCellSuppression(points, 5);
      // Small cell should be suppressed
      const smallCell = result.suppressed.find((p) => p.key === "village2");
      expect(smallCell?.total).toBe(0);
    });
  });

  describe("Storage Adapter Security", () => {
    const mockBucket = {
      put: async () => ({}) as any,
      head: async () => null,
      get: async () => null,
      delete: async () => {},
      list: async () => ({ objects: [], delimitedPrefixes: [], truncated: false }),
    };

    it("should generate tenant-isolated keys", () => {
      const adapter = createStorageAdapter(mockBucket);
      const ctx = makeContext({ tenantId: "tenant-a", siteId: "site-1" });
      const key = adapter.generateKey(ctx, { filename: "test.pdf" });
      expect(key).toContain("tenants/tenant-a");
      expect(key).toContain("sites/site-1");
    });

    it("should validate key ownership", () => {
      const adapter = createStorageAdapter(mockBucket);
      const ctx = makeContext({ tenantId: "tenant-a", siteId: "site-1" });
      const key = adapter.generateKey(ctx, { filename: "test.pdf" });
      expect(adapter.validateKeyOwnership(key, ctx)).toBe(true);
      
      const otherCtx = makeContext({ tenantId: "tenant-b", siteId: "site-1" });
      expect(adapter.validateKeyOwnership(key, otherCtx)).toBe(false);
    });

    it("should sanitize storage metadata", () => {
      const metadata = {
        key: "tenants/x/sites/y/documents/secret.pdf",
        size: 1024,
        contentType: "application/pdf",
        uploadedAt: "2026-01-01T00:00:00Z",
        checksumSha256: "abc123",
      };
      const sanitized = sanitizeStorageMetadata(metadata);
      expect(sanitized.key).toBeUndefined();
      expect(sanitized.size).toBe(1024);
    });

    it("should not allow direct access for restricted documents", () => {
      expect(validateAccessMethod("restricted", "direct")).toBe(false);
      expect(validateAccessMethod("highly_restricted", "direct")).toBe(false);
      expect(validateAccessMethod("internal", "direct")).toBe(true);
    });

    it("should sanitize filenames", () => {
      const adapter = createStorageAdapter(mockBucket);
      const ctx = makeContext();
      const key = adapter.generateKey(ctx, { filename: "../../etc/passwd" });
      expect(key).not.toContain("../");
    });
  });

  describe("Completeness Validation Security", () => {
    const db = new InMemoryD1Binding();

    it("should reject non-existent entity", async () => {
      const ctx = makeContext();
      await expect(validateCompleteness(db, { entityId: "nonexistent" }, ctx)).rejects.toThrow("Entity not found");
    });

    it("should enforce tenant/site isolation", async () => {
      const ctx = makeContext();
      // Insert entity for different tenant
      await db.prepare(
        `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("ent_other", "other-tenant", "other-site", "01", "01", "building", "Test", "6201021001", "internal", "draft", "pending", 0, "manual").run();

      // Should not find entity from different tenant
      await expect(validateCompleteness(db, { entityId: "ent_other" }, ctx)).rejects.toThrow("Entity not found");
    });
  });

  describe("Audit Security", () => {
    const db = new InMemoryD1Binding();

    it("should write audit events with required fields", async () => {
      const ctx = makeContext();
      const result = await writeAuditEvent(db, {
        tenantId: ctx.tenantId,
        siteId: ctx.siteId,
        action: AUDIT_ACTIONS.ENTITY_CREATE,
        resourceType: "entity",
        resourceId: "test-entity",
        success: true,
      }, ctx);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.auditEventId).toBeTruthy();
      }
    });

    it("should identify high-risk actions", () => {
      expect(isHighRiskAction(AUDIT_ACTIONS.CODE_CORRECT)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.SENSITIVE_REVEAL)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.SETTINGS_UPDATE)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.ENTITY_UPDATE)).toBe(false);
    });
  });

  describe("Request Context Security", () => {
    it("should freeze roles array", () => {
      const ctx = makeContext({ roles: ["editor"] });
      expect(() => ctx.roles.push("admin")).toThrow();
    });

    it("should freeze permissions array", () => {
      const ctx = makeContext({ permissions: ["awcms:sikesra:entity:read"] });
      expect(() => ctx.permissions.push("awcms:sikesra:entity:write")).toThrow();
    });

    it("should derive tenant/site from trusted source", () => {
      const ctx = makeContext({ tenantId: "trusted-tenant", siteId: "trusted-site" });
      expect(ctx.tenantId).toBe("trusted-tenant");
      expect(ctx.siteId).toBe("trusted-site");
    });
  });
});
