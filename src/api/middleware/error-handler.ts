import type { ErrorHandler } from "hono";
import { getEnv } from "../config/env.js";

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: {
    requestId: string;
  };
}

export const errorHandler: ErrorHandler = (err, c) => {
  const env = getEnv();
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";

  // Log the full error server-side
  console.error({ requestId, error: err.message, stack: env.NODE_ENV !== "production" ? err.stack : undefined });

  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message,
    },
    meta: { requestId },
  };

  return c.json(body, 500);
};
