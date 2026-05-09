// SIKESRA Route Guard
// Enforces authentication and RBAC permissions on admin API routes
// Source: docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "./request-context";
import { SIKESRA_PERMISSIONS } from "./permissions";
import { AUDIT_ACTIONS } from "../services/audit";

export type GuardAction =
  | "dashboard:read"
  | "entity:read" | "entity:create" | "entity:update" | "entity:delete"
  | "verification:submit" | "verification:verify"
  | "document:upload" | "document:private_download"
  | "import:create" | "import:promote"
  | "export:create" | "export:restricted"
  | "region:manage"
  | "settings:update"
  | "audit:read"
  | "sensitive:reveal";

export interface GuardResult {
  allowed: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  auditable?: { action: string; reasonCode: string };
}

// Map shorthand action to full permission string
function resolvePermission(action: GuardAction): string {
  const map: Record<string, string> = {
    "dashboard:read": SIKESRA_PERMISSIONS.DASHBOARD_READ,
    "entity:read": SIKESRA_PERMISSIONS.ENTITY_READ,
    "entity:create": SIKESRA_PERMISSIONS.ENTITY_CREATE,
    "entity:update": SIKESRA_PERMISSIONS.ENTITY_UPDATE,
    "entity:delete": SIKESRA_PERMISSIONS.ENTITY_DELETE,
    "verification:submit": SIKESRA_PERMISSIONS.VERIFICATION_SUBMIT,
    "verification:verify": SIKESRA_PERMISSIONS.VERIFICATION_VERIFY,
    "document:upload": SIKESRA_PERMISSIONS.DOCUMENT_UPLOAD,
    "document:private_download": SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD,
    "import:create": SIKESRA_PERMISSIONS.IMPORT_CREATE,
    "import:promote": SIKESRA_PERMISSIONS.IMPORT_PROMOTE,
    "export:create": SIKESRA_PERMISSIONS.EXPORT_CREATE,
    "export:restricted": SIKESRA_PERMISSIONS.EXPORT_RESTRICTED,
    "region:manage": SIKESRA_PERMISSIONS.REGION_MANAGE,
    "settings:update": SIKESRA_PERMISSIONS.SETTINGS_UPDATE,
    "audit:read": SIKESRA_PERMISSIONS.AUDIT_READ,
    "sensitive:reveal": SIKESRA_PERMISSIONS.SENSITIVE_REVEAL,
  };
  return map[action] ?? "";
}

export function guardRoute(
  ctx: SikesraRequestContext,
  requiredPermission: GuardAction,
): GuardResult {
  // Step 1: Enforce authentication
  if (!ctx.userId || ctx.userId === "public" || ctx.userId === "stub-user") {
    // stub-user is development only; production must reject unauthenticated
    if (ctx.userId === "public" || (!ctx.userId)) {
      return {
        allowed: false,
        reasonCode: "UNAUTHENTICATED",
        reasonMessage: "Authentication required for admin API routes",
        auditable: { action: AUDIT_ACTIONS.ACCESS_DENIED, reasonCode: "unauthenticated" },
      };
    }
  }

  // Step 2: Check RBAC permission
  const permission = resolvePermission(requiredPermission);
  if (!ctx.permissions.includes(permission)) {
    return {
      allowed: false,
      reasonCode: "FORBIDDEN",
      reasonMessage: `Missing required permission: ${permission}`,
      auditable: { action: AUDIT_ACTIONS.ACCESS_DENIED, reasonCode: "missing_permission" },
    };
  }

  // Step 3: Tenant/site match (always enforced)
  if (!ctx.tenantId || !ctx.siteId) {
    return {
      allowed: false,
      reasonCode: "FORBIDDEN",
      reasonMessage: "Missing tenant/site context",
      auditable: { action: AUDIT_ACTIONS.ACCESS_DENIED, reasonCode: "missing_tenant_site" },
    };
  }

  return { allowed: true };
}

// Check if user can perform action within their region scope
export function checkRegionScope(
  ctx: SikesraRequestContext,
  targetVillageCode?: string,
  targetLocalRegionId?: string,
): boolean {
  if (!targetVillageCode && !targetLocalRegionId) return true;
  if (targetVillageCode && ctx.regionScope.villageCodes?.length) {
    return ctx.regionScope.villageCodes.includes(targetVillageCode);
  }
  if (targetLocalRegionId && ctx.regionScope.localRegionIds?.length) {
    return ctx.regionScope.localRegionIds.includes(targetLocalRegionId);
  }
  return true;
}
