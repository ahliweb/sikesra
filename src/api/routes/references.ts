/**
 * Controlled reference-data routes.
 * Issue: ahliweb/sikesra#70
 *
 * GET /api/v1/references/religions
 */

import { Hono } from "hono";
import type { AuthVariables } from "../middleware/abac.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { sikesraReligionReferenceService } from "../../backend/services/religion-reference-service.mjs";

type Variables = AuthVariables;
type ReligionReferenceOption = {
  value: string;
  label: string;
  active: boolean;
  referenceId: string;
};
type ReligionReferenceAccessResult =
  | {
      ok: true;
      options: ReligionReferenceOption[];
      auditAction: string | null;
    }
  | {
      ok: false;
      status: 403;
      code: string;
      message: string;
      options: [];
      auditAction: null;
    };

const references = new Hono<{ Variables: Variables }>();

export async function listReligionReferenceOptions(input: {
  includeInactive?: boolean;
  permissions?: string[];
}): Promise<ReligionReferenceAccessResult> {
  const result = await sikesraReligionReferenceService.listAuthorizedRuntimeOptions({
    includeInactive: input.includeInactive === true,
    permissions: input.permissions ?? [],
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 403,
      code: result.code,
      message: result.message,
      options: [],
      auditAction: null,
    };
  }

  return {
    ok: true,
    options: result.options as ReligionReferenceOption[],
    auditAction: result.auditAction,
  };
}

references.get("/religions", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
  const includeInactive = c.req.query("includeInactive") === "true";
  const permissions = (c.get("userPermissions") as string[] | undefined) ?? [];

  const result = await listReligionReferenceOptions({ includeInactive, permissions });

  if (!result.ok) {
    return c.json(
      {
        success: false,
        error: { code: result.code, message: result.message },
        meta: { requestId },
      },
      result.status,
    );
  }

  return c.json(
    {
      success: true,
      data: result.options,
      meta: {
        requestId,
        auditAction: result.auditAction,
      },
    },
    200,
  );
});

export { references };
