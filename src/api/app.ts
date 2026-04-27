import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { health } from "./routes/health.js";

// Extend Hono context with our custom variables
type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// ── Global middleware (order matters) ────────────────────────────────────────
app.use("*", requestId);
app.use("*", securityHeaders);
app.use("*", corsMiddleware);
app.use(
  "*",
  rateLimit({
    windowMs: 60_000,
    max: 120,
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/health", health);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
  return c.json(
    {
      success: false,
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
      meta: { requestId },
    },
    404,
  );
});

// ── Global error handler ──────────────────────────────────────────────────────
app.onError(errorHandler);

export { app };
