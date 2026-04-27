/**
 * User management routes.
 * Issue: ahliweb/sikesra#65
 *
 * GET  /api/v1/users        — requires users.read
 * POST /api/v1/users        — requires users.create
 */

import { Hono } from "hono";
import { requirePermission } from "../middleware/abac.js";
import { writeAuditLog } from "../../modules/audit/index.js";
import { getPool } from "../../db/client.js";
import type { AuthVariables } from "../middleware/abac.js";

type Variables = AuthVariables;

const users = new Hono<{ Variables: Variables }>();

// ── GET /api/v1/users ─────────────────────────────────────────────────────────

users.get("/", requirePermission("users.read"), async (c) => {
  const requestId = c.get("requestId");
  const pool = getPool();

  const rows = await pool<
    { id: string; email: string; status: string; created_at: string }[]
  >`
    select id, email, status, created_at
    from public.users
    where deleted_at is null
    order by created_at desc
  `;

  return c.json({ success: true, data: rows, meta: { requestId } });
});

// ── POST /api/v1/users ────────────────────────────────────────────────────────

users.post("/", requirePermission("users.create"), async (c) => {
  const requestId = c.get("requestId");
  const actorId = c.get("userId");
  const body = await c.req.json<{ email: string; password_hash: string }>();

  if (!body.email || !body.password_hash) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "email and password_hash are required." },
        meta: { requestId },
      },
      422,
    );
  }

  const pool = getPool();
  const created = await pool<{ id: string; email: string; status: string; created_at: string }[]>`
    insert into public.users (email, password_hash, created_by, updated_by)
    values (${body.email}, ${body.password_hash}, ${actorId}, ${actorId})
    returning id, email, status, created_at
  `;

  await writeAuditLog({
    actorId,
    action: "user.create",
    resourceType: "user",
    resourceId: created[0]!.id,
    payloadSafe: { email: body.email },
  });

  return c.json({ success: true, data: created[0], meta: { requestId } }, 201);
});

export { users };
