/**
 * Pure ABAC policy engine — no TypeScript, no imports.
 * Used by: src/api/middleware/abac.ts (re-exports), tests/unit/sikesra-abac-policy.test.mjs
 * Issue: ahliweb/sikesra#65
 */

export const PERMISSION_KEYS = /** @type {const} */ ([
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "roles.manage",
  "files.upload",
  "files.read",
  "files.delete",
  "content.read",
  "content.create",
  "content.update",
  "content.publish",
  "audit.read",
  "settings.manage",
  "notifications.send",
  "notifications.read",
  "notifications.manage_templates",
  "notifications.read_delivery_logs",
  "integrations.mailketing.manage",
  "integrations.starsender.manage",
]);

/** Roles that are required to have 2FA enabled. */
export const ROLES_REQUIRING_2FA = /** @type {const} */ ([
  "super_admin",
  "admin",
  "auditor",
]);

/**
 * Evaluate whether the given ABAC context should be allowed.
 *
 * @param {{
 *   userId: string,
 *   role: string,
 *   permissions: string[],
 *   requiredPermission: string,
 *   resourceType?: string,
 *   resourceId?: string,
 *   siteId?: string,
 *   ownedBy?: string,
 *   status?: string,
 *   sensitivity?: string,
 *   channel?: string,
 * }} ctx
 * @returns {{ allowed: boolean, reason: string }}
 */
export function evaluatePolicy(ctx) {
  // Rule 1 — permission key check.
  if (!ctx.permissions.includes(ctx.requiredPermission)) {
    return { allowed: false, reason: `Missing permission: ${ctx.requiredPermission}` };
  }

  // Rule 2 — viewer cannot access sensitive/restricted resources.
  if (
    (ctx.sensitivity === "sensitive" || ctx.sensitivity === "restricted") &&
    ctx.role === "viewer"
  ) {
    return { allowed: false, reason: `Role 'viewer' cannot access ${ctx.sensitivity} resources` };
  }

  // Rule 3 — CLI channel blocked for sensitive/restricted data.
  if (
    ctx.channel === "cli" &&
    (ctx.sensitivity === "sensitive" || ctx.sensitivity === "restricted")
  ) {
    return { allowed: false, reason: "CLI channel is not permitted to access sensitive/restricted resources" };
  }

  // Rule 4 — ownership guard.
  const isAdmin = ctx.role === "super_admin" || ctx.role === "admin";
  if (ctx.ownedBy !== undefined && ctx.ownedBy !== ctx.userId && !isAdmin) {
    return { allowed: false, reason: "Access denied: you do not own this resource" };
  }

  return { allowed: true, reason: "ok" };
}
