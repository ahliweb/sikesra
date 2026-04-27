import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { sessionLoader } from "./middleware/session.js";
import type { AuthVariables } from "./middleware/abac.js";
import { health } from "./routes/health.js";
import { me } from "./routes/me.js";
import { users } from "./routes/users.js";
import { roles } from "./routes/roles.js";
import { permissions } from "./routes/permissions.js";
import { auth } from "./routes/auth.js";
import { security } from "./routes/security.js";

// Extend Hono context with our custom variables
type Variables = AuthVariables;

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
// Session loader populates userId/userRole/userPermissions from Bearer JWT.
app.use("*", sessionLoader);

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/health", health);
app.route("/api/v1/auth", auth);
app.route("/api/v1/security", security);
app.route("/api/v1/me", me);
app.route("/api/v1/users", users);
app.route("/api/v1/roles", roles);
app.route("/api/v1/permissions", permissions);

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
