/**
 * Session loader middleware.
 * Issue: ahliweb/sikesra#66
 *
 * Extracts the Bearer JWT from Authorization header, verifies it,
 * and populates c.set("userId"), c.set("userRole"), c.set("userPermissions").
 *
 * Partial (pending2fa) tokens are ignored by this middleware so protected
 * routes remain inaccessible until 2FA is complete.
 */

import type { Context, Next } from "hono";
import { verifyToken, extractBearerToken } from "../../modules/session/index.js";
import { getEnv } from "../config/env.js";
import { getPermissionsForRoles, getRolesForUser } from "../../modules/roles/index.js";

export async function sessionLoader(c: Context, next: Next): Promise<Response | void> {
  const token = extractBearerToken(c.req.header("Authorization"));
  if (!token) {
    await next();
    return;
  }

  const env = getEnv();
  const payload = verifyToken(token, env.JWT_SECRET);
  if (!payload) {
    await next();
    return;
  }

  if (payload.pending2fa) {
    await next();
    return;
  }

  c.set("userId" as never, payload.sub);
  c.set("userRole" as never, payload.role);

  // Load permissions from DB (could be cached in production).
  try {
    const roles = await getRolesForUser(payload.sub);
    const roleIds = roles.map((r) => r.id);
    const permissions = await getPermissionsForRoles(roleIds);
    c.set("userPermissions" as never, permissions);
  } catch {
    // Non-fatal: permissions default to empty.
    c.set("userPermissions" as never, []);
  }

  await next();
}
