import { Hono } from "hono";
import { checkDbConnectivity } from "../config/database.js";
import { SIKESRA_VERSION } from "../version.js";

type Variables = { requestId: string };

const health = new Hono<{ Variables: Variables }>();

health.get("/", async (c) => {
  const db = await checkDbConnectivity();
  const status = db === "ok" ? "ok" : "degraded";
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";

  return c.json(
    {
      success: true,
      data: {
        status,
        version: SIKESRA_VERSION,
        timestamp: new Date().toISOString(),
        services: {
          database: db,
        },
      },
      meta: { requestId },
    },
    status === "ok" ? 200 : 503,
  );
});

export { health };
