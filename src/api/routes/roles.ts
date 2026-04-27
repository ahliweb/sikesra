/**
 * Role management routes.
 * Issue: ahliweb/sikesra#65
 *
 * GET  /api/v1/roles        — requires roles.manage
 */

import { Hono } from "hono";
import { requirePermission } from "../middleware/abac.js";
import { listRoles } from "../../modules/roles/index.js";
import type { AuthVariables } from "../middleware/abac.js";

type Variables = AuthVariables;

const roles = new Hono<{ Variables: Variables }>();

roles.get("/", requirePermission("roles.manage"), async (c) => {
  const requestId = c.get("requestId");
  const data = await listRoles();
  return c.json({ success: true, data, meta: { requestId } });
});

export { roles };
