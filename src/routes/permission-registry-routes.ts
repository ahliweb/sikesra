// Permission Registry Handler
// Exposes SIKESRA permission catalog for EmDash role management UI
// Source: Issue #204

import type { EmDashRouteContext } from "./handler-utils";
import { buildContextFromEmDash } from "./handler-utils";
import { getPermissionRegistry, getPermissionsByResourceGroup, getHighRiskPermissions, getStandardPermissions } from "../security/permission-registry";
import { getOrCreateRequestId } from "../api/request-id";
import { ok, fail } from "../api/envelope";

export async function permissionRegistryHandler(routeCtx: EmDashRouteContext) {
  const requestId = getOrCreateRequestId(routeCtx.request);
  try {
    const registry = getPermissionRegistry();
    const grouped = getPermissionsByResourceGroup();
    const highRisk = getHighRiskPermissions();
    const standard = getStandardPermissions();

    return ok(requestId, {
      pluginId: registry.pluginId,
      totalPermissions: registry.permissions.length,
      permissions: registry.permissions,
      groupedByResource: grouped,
      highRiskPermissions: highRisk,
      standardPermissions: standard,
      resourceGroups: Object.keys(grouped).sort(),
    });
  } catch (error) {
    return fail(requestId, "PERMISSION_REGISTRY_ERROR", error instanceof Error ? error.message : "Failed to load permission registry");
  }
}

export async function permissionDetailHandler(routeCtx: EmDashRouteContext) {
  const requestId = getOrCreateRequestId(routeCtx.request);
  try {
    const url = new URL(routeCtx.request.url);
    const permissionId = url.searchParams.get("permission");

    if (!permissionId) {
      return fail(requestId, "MISSING_PERMISSION_PARAM", "Query parameter 'permission' is required");
    }

    const registry = getPermissionRegistry();
    const permission = registry.permissions.find((p) => p.id === permissionId);

    if (!permission) {
      return fail(requestId, "PERMISSION_NOT_FOUND", `Permission '${permissionId}' not found`);
    }

    return ok(requestId, { permission });
  } catch (error) {
    return fail(requestId, "PERMISSION_DETAIL_ERROR", error instanceof Error ? error.message : "Failed to load permission detail");
  }
}

export async function permissionByGroupHandler(routeCtx: EmDashRouteContext) {
  const requestId = getOrCreateRequestId(routeCtx.request);
  try {
    const url = new URL(routeCtx.request.url);
    const group = url.searchParams.get("group");

    if (!group) {
      return fail(requestId, "MISSING_GROUP_PARAM", "Query parameter 'group' is required");
    }

    const grouped = getPermissionsByResourceGroup();
    const permissions = grouped[group];

    if (!permissions) {
      return fail(requestId, "GROUP_NOT_FOUND", `Resource group '${group}' not found. Available: ${Object.keys(grouped).join(", ")}`);
    }

    return ok(requestId, { group, permissions });
  } catch (error) {
    return fail(requestId, "PERMISSION_GROUP_ERROR", error instanceof Error ? error.message : "Failed to load permissions by group");
  }
}
