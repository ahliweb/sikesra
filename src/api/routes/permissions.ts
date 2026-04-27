/**
 * Permission registry routes.
 * Issue: ahliweb/sikesra#65
 *
 * GET  /api/v1/permissions  — requires roles.manage
 */

import { Hono } from "hono";
import { requirePermission } from "../middleware/abac.js";
import { listPermissions } from "../../modules/permissions/index.js";
import type { AuthVariables } from "../middleware/abac.js";

type Variables = AuthVariables;

const permissions = new Hono<{ Variables: Variables }>();

permissions.get("/", requirePermission("roles.manage"), async (c) => {
  const requestId = c.get("requestId");
  const data = await listPermissions();
  return c.json({ success: true, data, meta: { requestId } });
});

export { permissions };
