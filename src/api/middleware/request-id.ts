import type { MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = c.req.header("x-request-id") ?? `req_${randomUUID().replace(/-/g, "")}`;
  c.set("requestId", id);
  await next();
  c.header("X-Request-Id", id);
};
