/**
 * Controlled reference-data routes.
 * Issue: ahliweb/sikesra#70
 *
 * GET /api/v1/references/religions
 */

import { Hono } from "hono";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { sikesraReligionReferenceService } from "../../backend/services/religion-reference-service.mjs";

type Variables = { requestId: string };
type ReligionReferenceOption = {
  value: string;
  label: string;
  active: boolean;
  referenceId: string;
};

const references = new Hono<{ Variables: Variables }>();

export async function listReligionReferenceOptions(input: {
  includeInactive?: boolean;
}): Promise<ReligionReferenceOption[]> {
  return (await sikesraReligionReferenceService.listRuntimeOptions({
    includeInactive: input.includeInactive === true,
  })) as ReligionReferenceOption[];
}

references.get("/religions", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
  const includeInactive = c.req.query("includeInactive") === "true";

  const options = await listReligionReferenceOptions({ includeInactive });

  return c.json(
    {
      success: true,
      data: options,
      meta: { requestId },
    },
    200,
  );
});

export { references };
