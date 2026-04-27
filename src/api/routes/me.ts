/**
 * GET /api/v1/me
 * Returns the current authenticated user's profile, roles, and permissions.
 * Issue: ahliweb/sikesra#65
 */

import { Hono } from "hono";
import { requireAuth } from "../middleware/abac.js";
import { getRolesForUser } from "../../modules/roles/index.js";
import { getPool } from "../../db/client.js";
import type { AuthVariables } from "../middleware/abac.js";

type Variables = AuthVariables;

const me = new Hono<{ Variables: Variables }>();

me.get("/", requireAuth(), async (c) => {
  const userId = c.get("userId");
  const requestId = c.get("requestId");

  const pool = getPool();

  // Fetch user row (no password_hash in response).
  const users = await pool<
    { id: string; email: string; status: string; created_at: string }[]
  >`
    select id, email, status, created_at
    from public.users
    where id = ${userId} and deleted_at is null
    limit 1
  `;

  if (!users[0]) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "User not found." },
        meta: { requestId },
      },
      404,
    );
  }

  const roles = await getRolesForUser(userId);
  const permissions = c.get("userPermissions") ?? [];

  return c.json({
    success: true,
    data: {
      user: users[0],
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions,
    },
    meta: { requestId },
  });
});

export { me };
