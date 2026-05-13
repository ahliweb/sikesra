// Permission Registry API Tests
// Verify permission registry endpoint returns correct data
// Source: Issue #204

import { describe, it, expect } from "vitest";
import { getPermissionRegistry, getPermissionsByResourceGroup, getHighRiskPermissions, getStandardPermissions } from "../security/permission-registry";
import { SIKESRA_PERMISSIONS, SIKESRA_PERMISSION_LIST } from "../security/permissions";

describe("Permission Registry API", () => {
  describe("getPermissionRegistry()", () => {
    it("should return registry with pluginId 'sikesra'", () => {
      const registry = getPermissionRegistry();
      expect(registry.pluginId).toBe("sikesra");
    });

    it("should return all 38 permissions", () => {
      const registry = getPermissionRegistry();
      expect(registry.permissions).toHaveLength(38);
    });

    it("should include all permissions from SIKESRA_PERMISSION_LIST", () => {
      const registry = getPermissionRegistry();
      const registryIds = registry.permissions.map((p) => p.id);
      
      for (const permission of SIKESRA_PERMISSION_LIST) {
        expect(registryIds).toContain(permission);
      }
    });

    it("should include displayName for each permission", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        expect(permission.displayName).toBeDefined();
        expect(permission.displayName.length).toBeGreaterThan(0);
      }
    });

    it("should include description for each permission", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        expect(permission.description).toBeDefined();
        expect(permission.description.length).toBeGreaterThan(0);
      }
    });

    it("should include resourceGroup for each permission", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        expect(permission.resourceGroup).toBeDefined();
        expect(permission.resourceGroup.length).toBeGreaterThan(0);
      }
    });

    it("should include riskLevel for each permission", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        expect(permission.riskLevel).toBeDefined();
        expect(["standard", "high"]).toContain(permission.riskLevel);
      }
    });
  });

  describe("getPermissionsByResourceGroup()", () => {
    it("should return grouped permissions", () => {
      const grouped = getPermissionsByResourceGroup();
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });

    it("should include expected resource groups", () => {
      const grouped = getPermissionsByResourceGroup();
      const expectedGroups = ["dashboard", "entity", "verification", "document", "import", "export", "region", "audit", "settings"];
      
      for (const group of expectedGroups) {
        expect(grouped[group]).toBeDefined();
        expect(grouped[group].length).toBeGreaterThan(0);
      }
    });

    it("should group entity permissions correctly", () => {
      const grouped = getPermissionsByResourceGroup();
      const entityPermissions = grouped["entity"];
      
      expect(entityPermissions).toBeDefined();
      expect(entityPermissions).toHaveLength(5);
      expect(entityPermissions.map((p) => p.id)).toContain(SIKESRA_PERMISSIONS.ENTITY_READ);
      expect(entityPermissions.map((p) => p.id)).toContain(SIKESRA_PERMISSIONS.ENTITY_CREATE);
      expect(entityPermissions.map((p) => p.id)).toContain(SIKESRA_PERMISSIONS.ENTITY_UPDATE);
      expect(entityPermissions.map((p) => p.id)).toContain(SIKESRA_PERMISSIONS.ENTITY_DELETE);
      expect(entityPermissions.map((p) => p.id)).toContain(SIKESRA_PERMISSIONS.ENTITY_RESTORE);
    });

    it("should mark delete/update entity as high risk", () => {
      const grouped = getPermissionsByResourceGroup();
      const entityPermissions = grouped["entity"];
      
      const deletePerm = entityPermissions.find((p) => p.id === SIKESRA_PERMISSIONS.ENTITY_DELETE);
      const restorePerm = entityPermissions.find((p) => p.id === SIKESRA_PERMISSIONS.ENTITY_RESTORE);
      
      expect(deletePerm?.riskLevel).toBe("high");
      expect(restorePerm?.riskLevel).toBe("high");
    });
  });

  describe("getHighRiskPermissions()", () => {
    it("should return only high risk permissions", () => {
      const highRisk = getHighRiskPermissions();
      
      for (const permission of highRisk) {
        expect(permission.riskLevel).toBe("high");
      }
    });

    it("should include expected high risk permissions", () => {
      const highRisk = getHighRiskPermissions();
      const highRiskIds = highRisk.map((p) => p.id);
      
      expect(highRiskIds).toContain(SIKESRA_PERMISSIONS.ENTITY_DELETE);
      expect(highRiskIds).toContain(SIKESRA_PERMISSIONS.ENTITY_RESTORE);
      expect(highRiskIds).toContain(SIKESRA_PERMISSIONS.VERIFICATION_VERIFY);
      expect(highRiskIds).toContain(SIKESRA_PERMISSIONS.EXPORT_RESTRICTED);
      expect(highRiskIds).toContain(SIKESRA_PERMISSIONS.SENSITIVE_REVEAL);
    });

    it("should have more than 10 high risk permissions", () => {
      const highRisk = getHighRiskPermissions();
      expect(highRisk.length).toBeGreaterThan(10);
    });
  });

  describe("getStandardPermissions()", () => {
    it("should return only standard risk permissions", () => {
      const standard = getStandardPermissions();
      
      for (const permission of standard) {
        expect(permission.riskLevel).toBe("standard");
      }
    });

    it("should include expected standard permissions", () => {
      const standard = getStandardPermissions();
      const standardIds = standard.map((p) => p.id);
      
      expect(standardIds).toContain(SIKESRA_PERMISSIONS.DASHBOARD_READ);
      expect(standardIds).toContain(SIKESRA_PERMISSIONS.ENTITY_READ);
      expect(standardIds).toContain(SIKESRA_PERMISSIONS.ENTITY_CREATE);
      expect(standardIds).toContain(SIKESRA_PERMISSIONS.SETTINGS_READ);
      expect(standardIds).toContain(SIKESRA_PERMISSIONS.AUDIT_READ);
    });
  });

  describe("Permission namespace consistency", () => {
    it("should use awcms:sikesra: prefix for all permissions", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        expect(permission.id).toMatch(/^awcms:sikesra:/);
      }
    });

    it("should have unique permission IDs", () => {
      const registry = getPermissionRegistry();
      const ids = registry.permissions.map((p) => p.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have consistent resource:action format", () => {
      const registry = getPermissionRegistry();
      
      for (const permission of registry.permissions) {
        const parts = permission.id.split(":");
        expect(parts).toHaveLength(4);
        expect(parts[0]).toBe("awcms");
        expect(parts[1]).toBe("sikesra");
        expect(parts[2].length).toBeGreaterThan(0);
        expect(parts[3].length).toBeGreaterThan(0);
      }
    });
  });
});
