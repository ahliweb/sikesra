// SIKESRA Architecture Validation Tests
// Validates the core patterns: repository → service → route handler → envelope
// Uses InMemoryD1Binding for test isolation

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { listEntities, createEntity, getEntityDetail } from "../services/entity";
import { fail, ok } from "../api/envelope";
import { getOrCreateRequestId } from "../api/request-id";
import { maskNikKia, maskPhone, maskR2Key } from "../security/masking";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { AUDIT_ACTIONS, isHighRiskAction } from "../services/audit";
import { applySmallCellSuppression } from "../services/public";

function makeContext(overrides?: Partial<SikesraRequestContext>): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: getOrCreateRequestId(),
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "test-user",
    roles: ["admin"],
    permissions: Object.values(SIKESRA_PERMISSIONS),
    ...overrides,
  });
}

describe("SIKESRA Architecture Validation", () => {
  describe("API Utilities", () => {
    it("should generate request IDs", () => {
      const id = getOrCreateRequestId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("should produce ok envelope", () => {
      const res = ok("req-1", { items: [] });
      expect(res.ok).toBe(true);
      expect(res.requestId).toBe("req-1");
      expect(res.data).toEqual({ items: [] });
    });

    it("should produce fail envelope", () => {
      const res = fail("req-1", "NOT_FOUND", "Entity not found");
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("NOT_FOUND");
      expect(res.error.message).toBe("Entity not found");
    });
  });

  describe("Security Utilities", () => {
    it("should mask NIK/KIA when not authorized", () => {
      const result = maskNikKia("1234567890123456", { canRevealSensitive: false, canRevealHighlyRestricted: false });
      expect(result).toBe("************3456");
    });

    it("should not mask NIK/KIA when highly-restricted authorized", () => {
      const result = maskNikKia("1234567890123456", { canRevealSensitive: true, canRevealHighlyRestricted: true });
      expect(result).toBe("1234567890123456");
    });

    it("should mask phone", () => {
      const result = maskPhone("081234567890", { canRevealSensitive: false, canRevealHighlyRestricted: false });
      expect(result).toBe("******7890");
    });

    it("should never return R2 key", () => {
      expect(maskR2Key("tenants/x/sites/y/documents/secret.pdf", {} as never)).toBeNull();
    });

    it("should have all 33 permissions registered", () => {
      expect(Object.keys(SIKESRA_PERMISSIONS).length).toBe(33);
    });

    it("should identify high-risk audit actions", () => {
      expect(isHighRiskAction(AUDIT_ACTIONS.CODE_CORRECT)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.SENSITIVE_REVEAL)).toBe(true);
      expect(isHighRiskAction(AUDIT_ACTIONS.ENTITY_UPDATE)).toBe(false);
    });
  });

  describe("Public Data Safety", () => {
    it("should suppress small cells", () => {
      const points = [
        { key: "a", label: "A", total: 3 },
        { key: "b", label: "B", total: 10 },
        { key: "c", label: "C", total: 1 },
      ];
      const result = applySmallCellSuppression(points, 5);
      expect(result.suppressed[0].total).toBe(0); // 3 < 5
      expect(result.suppressed[1].total).toBe(10); // 10 >= 5
      expect(result.suppressed[2].total).toBe(0); // 1 < 5
      expect(result.suppressionCount).toBe(2);
    });
  });

  describe("Repository Layer", () => {
    const db = new InMemoryD1Binding();
    const ctx = makeContext();

    it("should return empty list for new database", async () => {
      const result = await listEntities(db, { perPage: 10 }, ctx);
      expect(result.items).toEqual([]);
      expect(result.meta.hasMore).toBe(false);
    });

    it("should create an entity", async () => {
      const entity = await createEntity(db, {
        objectTypeCode: "01",
        objectSubtypeCode: "01",
        displayName: "Test Masjid",
        officialVillageCode: "6201021005",
        sensitivityLevel: "internal",
      }, ctx);

      expect(entity.id).toBeTruthy();
      expect(entity.displayName).toBe("Test Masjid");
      expect(entity.statusData).toBe("draft");
      expect(entity.entityKind).toBe("building");
    });

    it("should return null for non-existent entity detail", async () => {
      const result = await getEntityDetail(db, "nonexistent", ctx);
      expect(result).toBeNull();
    });
  });

  describe("Request Context", () => {
    it("should build trusted context from inputs", () => {
      const ctx = makeContext();
      expect(ctx.tenantId).toBe("test-tenant");
      expect(ctx.siteId).toBe("test-site");
      expect(ctx.userId).toBe("test-user");
      expect(ctx.roles).toContain("admin");
      expect(ctx.nowIso).toBeTruthy();
    });

    it("should freeze roles and permissions copies", () => {
      const ctx = makeContext({ roles: ["editor"], permissions: ["awcms:sikesra:entity:read"] });
      ctx.roles.push("admin");
      expect(ctx.roles).toEqual(["editor"]);
    });
  });

  describe("ABAC Evaluator", () => {
    const ctx = makeContext();

    it("should deny public from entity detail", () => {
      const { evaluateAbac } = require("../security/abac");
      const result = evaluateAbac(
        {
          subject: { roles: ["public"], permissions: [], tenantId: "t1", siteId: "s1" },
          resource: { resourceType: "entity" },
          action: "read",
          environment: {},
        },
        [],
        ctx,
      );
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe("public_denied_entity_detail");
    });

    it("should allow when no policies and not public", () => {
      const { evaluateAbac } = require("../security/abac");
      const result = evaluateAbac(
        {
          subject: { roles: ["admin"], permissions: ["awcms:sikesra:entity:read"], tenantId: "default", siteId: "default" },
          resource: { resourceType: "entity" },
          action: "read",
          environment: {},
        },
        [],
        makeContext({ tenantId: "default", siteId: "default" }),
      );
      expect(result.allowed).toBe(true);
    });

    it("should enforce deny precedence", () => {
      const { evaluateAbac } = require("../security/abac");
      const result = evaluateAbac(
        {
          subject: { roles: ["editor"], permissions: [], tenantId: "default", siteId: "default" },
          resource: { resourceType: "entity", statusData: "archived" },
          action: "update",
          environment: {},
        },
        [
          {
            id: "p1", name: "Allow update", effect: "allow", priority: 10,
            conditions: [],
          },
          {
            id: "p2", name: "Deny archived", effect: "deny", priority: 100,
            conditions: [{ attributeCategory: "resource", attributeName: "statusData", operator: "equals", value: "archived" }],
          },
        ],
        makeContext({ tenantId: "default", siteId: "default" }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("Handler Sequence", () => {
    it("should build context from EmDash route context", () => {
      const { buildContextFromEmDash } = require("../routes/handler-utils");
      const ctx = buildContextFromEmDash({
        request: new Request("https://example.com"),
        input: {},
        requestMeta: { ip: "1.2.3.4", userAgent: "test" },
        site: { id: "site-1", tenantId: "tenant-1" },
  describe("Route Guard", () => {
    it("should deny unauthenticated public access", () => {
      const { guardRoute } = require("../security/route-guard");
      const ctx = makeContext({ userId: "public", roles: ["public"], permissions: [] });
      const result = guardRoute(ctx, "entity:read");
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe("UNAUTHENTICATED");
    });

    it("should deny without required permission", () => {
      const { guardRoute } = require("../security/route-guard");
      const ctx = makeContext({ roles: ["editor"], permissions: ["awcms:sikesra:entity:read"] });
      const result = guardRoute(ctx, "settings:update");
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe("FORBIDDEN");
    });

    it("should allow with correct permission", () => {
      const { guardRoute } = require("../security/route-guard");
      const ctx = makeContext({ permissions: ["awcms:sikesra:entity:read"] });
      const result = guardRoute(ctx, "entity:read");
      expect(result.allowed).toBe(true);
    });

    it("should check region scope for village access", () => {
      const { checkRegionScope } = require("../security/route-guard");
      const ctx = makeContext({ regionScope: { villageCodes: ["6201021005", "6201021006"] } });
      expect(checkRegionScope(ctx, "6201021005")).toBe(true);
      expect(checkRegionScope(ctx, "6201021007")).toBe(false);
    });
  });
});
      expect(ctx.tenantId).toBe("tenant-1");
      expect(ctx.siteId).toBe("site-1");
      expect(ctx.ipAddress).toBe("1.2.3.4");
      expect(ctx.requestId).toBeTruthy();
    });

    it("should handle errors gracefully via ABAC handler", async () => {
      const { handleAdminRequest } = require("../routes/handler-utils");
      const result = await handleAdminRequest(
        { request: new Request("https://example.com"), input: {}, site: { id: "s1" } },
        { resourceType: "entity" },
        "read",
        async () => { throw new Error("test error"); },
      );
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
