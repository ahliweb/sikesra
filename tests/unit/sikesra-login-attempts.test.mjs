import test from "node:test";
import assert from "node:assert/strict";

import { getLoginLockoutDecision } from "../../src/modules/login-attempts/index.ts";

test("login lockout decision requires runtime env and database access", async () => {
  await assert.rejects(
    getLoginLockoutDecision({
      email: "admin@example.test",
      ipAddress: "203.0.113.10",
      windowMinutes: 15,
      maxFailures: 5,
    }),
    /DATABASE_URL is not set|Environment validation failed/
  );
});
