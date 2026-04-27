import type { MiddlewareHandler } from "hono";
import { getEnv } from "../config/env.js";

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  const env = getEnv();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );
  if (env.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // API-appropriate CSP: no browser rendering expected
  c.header("Content-Security-Policy", "default-src 'none'");
};
