import type { MiddlewareHandler } from "hono";
import { getEnv } from "../config/env.js";

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const env = getEnv();
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS
    ? env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const origin = c.req.header("origin");

  if (origin && allowedOrigins.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }

  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id,Idempotency-Key,X-Turnstile-Token");
  c.header("Access-Control-Max-Age", "86400");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
};
