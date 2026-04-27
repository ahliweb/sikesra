/**
 * ABAC/RBAC authorization middleware and policy engine.
 * Issue: ahliweb/sikesra#65
 *
 * Pure policy logic lives in abac.policy.mjs (importable by .mjs unit tests).
 * This file adds TypeScript types and Hono middleware on top of that engine.
 *
 * Usage (Hono route):
 *   import { requirePermission } from "../middleware/abac.js";
 *   route.get("/", requirePermission("users.read"), handler);
 */

import type { Context, Next } from "hono";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// prettier-ignore
import { PERMISSION_KEYS as _PERMISSION_KEYS, ROLES_REQUIRING_2FA as _ROLES_REQUIRING_2FA, evaluatePolicy as _evaluatePolicy } from "./abac.policy.mjs";

// ── Typed constants ───────────────────────────────────────────────────────────

export const PERMISSION_KEYS = _PERMISSION_KEYS as readonly [
  "users.read", "users.create", "users.update", "users.delete",
  "roles.manage",
  "files.upload", "files.read", "files.delete",
  "content.read", "content.create", "content.update", "content.publish",
  "audit.read",
  "settings.manage",
  "notifications.send", "notifications.read",
  "notifications.manage_templates", "notifications.read_delivery_logs",
  "integrations.mailketing.manage", "integrations.starsender.manage",
];

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLES_REQUIRING_2FA = _ROLES_REQUIRING_2FA as readonly [
  "super_admin", "admin", "auditor",
];

export type DataSensitivity = "public" | "internal" | "sensitive" | "restricted";
export type RequestChannel = "web" | "api" | "internal" | "cli";
export type RoleName = (typeof ROLES_REQUIRING_2FA)[number] | string;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AbacContext {
  userId: string;
  role: RoleName;
  permissions: PermissionKey[];
  requiredPermission: PermissionKey;
  resourceType?: string;
  resourceId?: string;
  siteId?: string;
  ownedBy?: string;
  status?: string;
  sensitivity?: DataSensitivity;
  channel?: RequestChannel;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string;
}

// ── Policy engine (thin typed wrapper) ───────────────────────────────────────

export function evaluatePolicy(ctx: AbacContext): PolicyResult {
  return _evaluatePolicy(ctx) as PolicyResult;
}

// ── Hono context types ────────────────────────────────────────────────────────

export interface AuthVariables {
  requestId: string;
  userId: string;
  userRole: RoleName;
  userPermissions: PermissionKey[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authError(
  c: Context,
  status: 401 | 403,
  code: string,
  message: string,
) {
  const requestId =
    (c.get("requestId" as never) as string | undefined) ?? "unknown";
  return c.json(
    { success: false, error: { code, message }, meta: { requestId } },
    status,
  );
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function requireAuth() {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId" as never) as string | undefined;
    if (!userId) {
      return authError(c, 401, "UNAUTHENTICATED", "Authentication required.");
    }
    await next();
  };
}

export function requirePermission(
  permission: PermissionKey,
  opts?: Partial<Pick<AbacContext, "resourceType" | "sensitivity" | "channel">>,
) {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId" as never) as string | undefined;
    if (!userId) {
      return authError(c, 401, "UNAUTHENTICATED", "Authentication required.");
    }

    const role = (c.get("userRole" as never) as RoleName | undefined) ?? "viewer";
    const permissions =
      (c.get("userPermissions" as never) as PermissionKey[] | undefined) ?? [];

    const result = evaluatePolicy({
      userId,
      role,
      permissions,
      requiredPermission: permission,
      channel: opts?.channel ?? "api",
      resourceType: opts?.resourceType,
      sensitivity: opts?.sensitivity,
    });

    if (!result.allowed) {
      return authError(c, 403, "FORBIDDEN", `Access denied: ${result.reason}`);
    }

    await next();
  };
}
