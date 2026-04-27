/**
 * Security routes: 2FA setup, confirm, disable, recovery code regeneration.
 * Issue: ahliweb/sikesra#66
 *
 * POST /api/v1/security/2fa/setup
 * POST /api/v1/security/2fa/confirm
 * POST /api/v1/security/2fa/disable
 * POST /api/v1/security/2fa/recovery-codes/regenerate
 */

import { Hono } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";
import { getPool } from "../../db/client.js";
import { getEnv } from "../config/env.js";
import { getTwoFactorConfig } from "../config/two-factor.js";
import { requireAuth } from "../middleware/abac.js";
import type { AuthVariables } from "../middleware/abac.js";
import {
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
} from "../../modules/two-factor/index.js";
import { writeAuditLog } from "../../modules/audit/index.js";

type Variables = AuthVariables;

const security = new Hono<{ Variables: Variables }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashPassword(password: string, pepper: string): string {
  return createHash("sha256")
    .update(password + pepper)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// ── POST /api/v1/security/2fa/setup ──────────────────────────────────────────

security.post("/2fa/setup", requireAuth(), async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const userId = c.get("userId");
  const env = getEnv();
  const tfCfg = getTwoFactorConfig();

  if (!tfCfg.encryptionKey) {
    return c.json(
      { success: false, error: { code: "SERVER_ERROR", message: "2FA encryption not configured." }, meta: { requestId } },
      500,
    );
  }

  const pool = getPool();

  // Load user email for OTP URI label.
  const users = await pool<{ email: string }[]>`
    select email from public.users where id = ${userId} and deleted_at is null limit 1
  `;
  if (!users[0]) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found." }, meta: { requestId } },
      404,
    );
  }

  const secret = generateTotpSecret();
  const encryptedSecret = await encryptTotpSecret(secret, tfCfg.encryptionKey);
  const otpAuthUri = buildOtpAuthUri({
    secret,
    accountName: users[0].email,
    issuer: tfCfg.issuer,
  });

  // Store the unconfirmed secret (two_factor_confirmed_at stays null).
  await pool`
    insert into public.user_security_settings (user_id, two_factor_secret_encrypted, updated_at)
    values (${userId}, ${encryptedSecret}, now())
    on conflict (user_id) do update
      set two_factor_secret_encrypted = excluded.two_factor_secret_encrypted,
          two_factor_confirmed_at = null,
          updated_at = now()
  `;

  await writeAuditLog({
    actorId: userId,
    action: "two_factor.enable",
    resourceType: "user",
    resourceId: userId,
    payloadSafe: { step: "setup_initiated" },
  });

  // Return the raw secret and URI — display once on client for QR generation.
  return c.json(
    {
      success: true,
      data: { secret, otpAuthUri },
      meta: { requestId },
    },
    200,
  );
});

// ── POST /api/v1/security/2fa/confirm ────────────────────────────────────────

security.post("/2fa/confirm", requireAuth(), async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const userId = c.get("userId");
  const tfCfg = getTwoFactorConfig();

  let body: { code?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." }, meta: { requestId } },
      400,
    );
  }

  if (!body.code) {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "code is required." }, meta: { requestId } },
      400,
    );
  }

  if (!tfCfg.encryptionKey || !tfCfg.recoveryCodePepper) {
    return c.json(
      { success: false, error: { code: "SERVER_ERROR", message: "2FA not configured." }, meta: { requestId } },
      500,
    );
  }

  const pool = getPool();
  const security_settings = await pool<
    { two_factor_secret_encrypted: string | null; two_factor_confirmed_at: string | null }[]
  >`
    select two_factor_secret_encrypted, two_factor_confirmed_at
    from public.user_security_settings
    where user_id = ${userId}
    limit 1
  `;

  const row = security_settings[0];
  if (!row?.two_factor_secret_encrypted) {
    return c.json(
      { success: false, error: { code: "2FA_NOT_SETUP", message: "Run /2fa/setup first." }, meta: { requestId } },
      400,
    );
  }

  const secret = await decryptTotpSecret(row.two_factor_secret_encrypted, tfCfg.encryptionKey);
  const valid = verifyTotpCode(secret, body.code);

  if (!valid) {
    return c.json(
      { success: false, error: { code: "INVALID_CODE", message: "Invalid authentication code." }, meta: { requestId } },
      400,
    );
  }

  // Mark confirmed.
  await pool`
    update public.user_security_settings
    set two_factor_confirmed_at = now(), updated_at = now()
    where user_id = ${userId}
  `;

  // Generate initial recovery codes.
  const { plaintext, hashed } = generateRecoveryCodes(tfCfg.recoveryCodePepper);

  // Delete any old codes, insert new ones.
  await pool`delete from public.user_recovery_codes where user_id = ${userId}`;
  for (const hash of hashed) {
    await pool`
      insert into public.user_recovery_codes (user_id, code_hash, created_at)
      values (${userId}, ${hash}, now())
    `;
  }

  await writeAuditLog({
    actorId: userId,
    action: "two_factor.enable",
    resourceType: "user",
    resourceId: userId,
    payloadSafe: { step: "confirmed" },
  });

  return c.json(
    {
      success: true,
      data: {
        confirmed: true,
        recoveryCodes: plaintext, // display once — never stored in plaintext
      },
      meta: { requestId },
    },
    200,
  );
});

// ── POST /api/v1/security/2fa/disable ────────────────────────────────────────

security.post("/2fa/disable", requireAuth(), async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const userId = c.get("userId");
  const env = getEnv();

  let body: { password?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." }, meta: { requestId } },
      400,
    );
  }

  if (!body.password) {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "password is required for step-up auth." }, meta: { requestId } },
      400,
    );
  }

  // Step-up: re-verify password.
  const pool = getPool();
  const users = await pool<{ password_hash: string }[]>`
    select password_hash from public.users where id = ${userId} and deleted_at is null limit 1
  `;

  if (!users[0]) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found." }, meta: { requestId } },
      404,
    );
  }

  const expectedHash = hashPassword(body.password, env.PASSWORD_PEPPER);
  if (!safeEqual(users[0].password_hash, expectedHash)) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Password verification failed." }, meta: { requestId } },
      401,
    );
  }

  // Clear 2FA.
  await pool`
    update public.user_security_settings
    set two_factor_secret_encrypted = null,
        two_factor_confirmed_at = null,
        updated_at = now()
    where user_id = ${userId}
  `;
  await pool`delete from public.user_recovery_codes where user_id = ${userId}`;

  await writeAuditLog({
    actorId: userId,
    action: "two_factor.disable",
    resourceType: "user",
    resourceId: userId,
    payloadSafe: {},
  });

  return c.json(
    { success: true, data: { disabled: true }, meta: { requestId } },
    200,
  );
});

// ── POST /api/v1/security/2fa/recovery-codes/regenerate ──────────────────────

security.post("/2fa/recovery-codes/regenerate", requireAuth(), async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const userId = c.get("userId");
  const env = getEnv();
  const tfCfg = getTwoFactorConfig();

  let body: { password?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." }, meta: { requestId } },
      400,
    );
  }

  if (!body.password) {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "password is required for step-up auth." }, meta: { requestId } },
      400,
    );
  }

  if (!tfCfg.recoveryCodePepper) {
    return c.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Recovery codes not configured." }, meta: { requestId } },
      500,
    );
  }

  // Step-up: re-verify password.
  const pool = getPool();
  const users = await pool<{ password_hash: string }[]>`
    select password_hash from public.users where id = ${userId} and deleted_at is null limit 1
  `;

  if (!users[0]) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found." }, meta: { requestId } },
      404,
    );
  }

  const expectedHash = hashPassword(body.password, env.PASSWORD_PEPPER);
  if (!safeEqual(users[0].password_hash, expectedHash)) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Password verification failed." }, meta: { requestId } },
      401,
    );
  }

  // Ensure 2FA is confirmed before allowing regeneration.
  const settings = await pool<{ two_factor_confirmed_at: string | null }[]>`
    select two_factor_confirmed_at
    from public.user_security_settings
    where user_id = ${userId}
    limit 1
  `;

  if (!settings[0]?.two_factor_confirmed_at) {
    return c.json(
      { success: false, error: { code: "2FA_NOT_CONFIRMED", message: "2FA must be confirmed before regenerating recovery codes." }, meta: { requestId } },
      400,
    );
  }

  // Regenerate.
  const { plaintext, hashed } = generateRecoveryCodes(tfCfg.recoveryCodePepper);
  await pool`delete from public.user_recovery_codes where user_id = ${userId}`;
  for (const hash of hashed) {
    await pool`
      insert into public.user_recovery_codes (user_id, code_hash, created_at)
      values (${userId}, ${hash}, now())
    `;
  }

  await writeAuditLog({
    actorId: userId,
    action: "two_factor.recovery_codes_regenerated",
    resourceType: "user",
    resourceId: userId,
    payloadSafe: {},
  });

  return c.json(
    {
      success: true,
      data: {
        recoveryCodes: plaintext, // display once only
      },
      meta: { requestId },
    },
    200,
  );
});

export { security };
