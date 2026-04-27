/**
 * Auth routes: login, 2FA verify, logout.
 * Issue: ahliweb/sikesra#66
 *
 * POST /api/v1/auth/login
 * POST /api/v1/auth/login/verify-2fa
 * POST /api/v1/auth/logout
 */

import { Hono } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";
import { getPool } from "../../db/client.js";
import { getEnv } from "../config/env.js";
import { getTurnstileConfig } from "../config/turnstile.js";
import { getTwoFactorConfig } from "../config/two-factor.js";
import { isTurnstileValid } from "../../modules/turnstile/index.js";
import {
  issueToken,
  issuePending2faToken,
  verifyToken,
  extractBearerToken,
} from "../../modules/session/index.js";
import {
  verifyTotpCode,
  decryptTotpSecret,
  findMatchingRecoveryCode,
  hashRecoveryCode,
} from "../../modules/two-factor/index.js";
import {
  getLoginLockoutDecision,
  recordLoginAttempt,
} from "../../modules/login-attempts/index.js";
import {
  deleteExpiredSessionRevocations,
  revokeSessionToken,
} from "../../modules/session-revocations/index.js";
import { getRolesForUser } from "../../modules/roles/index.js";
import { ROLES_REQUIRING_2FA } from "../middleware/abac.js";
import type { AuthVariables } from "../middleware/abac.js";

type Variables = AuthVariables;

const auth = new Hono<{ Variables: Variables }>();

export type LoginTwoFactorDecision =
  | { kind: "not_required" }
  | { kind: "challenge_required" }
  | { kind: "setup_required" };

export function shouldBlockLoginAttempt(input: {
  recentFailureCount: number;
  maxFailures: number;
}): boolean {
  return input.recentFailureCount >= input.maxFailures;
}

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

export function evaluateLoginTwoFactorDecision(input: {
  roleNames: string[];
  twoFactorConfirmedAt: string | null | undefined;
}): LoginTwoFactorDecision {
  const twoFactorConfirmed = input.twoFactorConfirmedAt != null;
  const protectedRole = input.roleNames.some((role) =>
    (ROLES_REQUIRING_2FA as readonly string[]).includes(role),
  );

  if (twoFactorConfirmed) {
    return { kind: "challenge_required" };
  }

  if (protectedRole) {
    return { kind: "setup_required" };
  }

  return { kind: "not_required" };
}

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

auth.post("/login", async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const env = getEnv();
  const turnstileCfg = getTurnstileConfig();

  let body: { email?: string; password?: string; turnstileToken?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." }, meta: { requestId } },
      400,
    );
  }

  const { email, password, turnstileToken } = body;

  if (!email || !password) {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "email and password are required." }, meta: { requestId } },
      400,
    );
  }

  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For");
  const ua = c.req.header("User-Agent");

  const lockout = await getLoginLockoutDecision({
    email,
    ipAddress: ip,
  });

  if (
    shouldBlockLoginAttempt({
      recentFailureCount: lockout.recentFailureCount,
      maxFailures: env.LOGIN_LOCKOUT_MAX_FAILURES,
    })
  ) {
    return c.json(
      {
        success: false,
        error: {
          code: "ACCOUNT_TEMPORARILY_LOCKED",
          message: "Too many login attempts. Please try again later.",
        },
        meta: { requestId, retryAfterSeconds: lockout.retryAfterSeconds },
      },
      429,
    );
  }

  // ── Turnstile ─────────────────────────────────────────────────────────────

  let turnstileVerified = false;
  if (turnstileCfg.enabled && turnstileCfg.secretKey) {
    turnstileVerified = await isTurnstileValid(turnstileToken, turnstileCfg.secretKey, ip);
    if (!turnstileVerified) {
      await recordLoginAttempt({
        email,
        ipAddress: ip,
        userAgent: ua,
        success: false,
        failureReason: "turnstile_failed",
        turnstileVerified: false,
        twoFactorUsed: false,
        recoveryCodeUsed: false,
      });
      return c.json(
        { success: false, error: { code: "TURNSTILE_FAILED", message: "Human verification failed." }, meta: { requestId } },
        403,
      );
    }
  } else {
    // Turnstile not configured (dev/test): pass through.
    turnstileVerified = true;
  }

  // ── Credential check ──────────────────────────────────────────────────────

  const pool = getPool();
  const users = await pool<
    { id: string; email: string; password_hash: string; status: string }[]
  >`
    select id, email, password_hash, status
    from public.users
    where email = ${email.toLowerCase()} and deleted_at is null
    limit 1
  `;

  const user = users[0];
  const expectedHash = user
    ? hashPassword(password, env.PASSWORD_PEPPER)
    : "dummy-to-prevent-timing"; // prevent user enumeration

  const credentialsOk =
    !!user && safeEqual(user.password_hash, expectedHash);

  if (!credentialsOk || !user) {
    await recordLoginAttempt({
      email,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      failureReason: "invalid_credentials",
      turnstileVerified,
      twoFactorUsed: false,
      recoveryCodeUsed: false,
    });
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid email or password." }, meta: { requestId } },
      401,
    );
  }

  if (user.status !== "active") {
    await recordLoginAttempt({
      userId: user.id,
      email,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      failureReason: "account_inactive",
      turnstileVerified,
      twoFactorUsed: false,
      recoveryCodeUsed: false,
    });
    return c.json(
      { success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active." }, meta: { requestId } },
      403,
    );
  }

  // ── 2FA check ─────────────────────────────────────────────────────────────

  const security = await pool<
    { two_factor_confirmed_at: string | null }[]
  >`
    select two_factor_confirmed_at
    from public.user_security_settings
    where user_id = ${user.id}
    limit 1
  `;

  const roles = await getRolesForUser(user.id);
  const roleNames = roles.map((r) => r.name);
  const primaryRole = roleNames[0] ?? "viewer";

  const twoFactorDecision = evaluateLoginTwoFactorDecision({
    roleNames,
    twoFactorConfirmedAt: security[0]?.two_factor_confirmed_at,
  });

  if (twoFactorDecision.kind === "setup_required") {
    await recordLoginAttempt({
      userId: user.id,
      email,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      failureReason: "2fa_setup_required",
      turnstileVerified,
      twoFactorUsed: false,
      recoveryCodeUsed: false,
    });
    return c.json(
      {
        success: false,
        error: {
          code: "2FA_SETUP_REQUIRED",
          message: "Two-factor authentication setup is required before this account can sign in.",
        },
        meta: { requestId },
      },
      403,
    );
  }

  if (twoFactorDecision.kind === "challenge_required") {
    const pendingToken = issuePending2faToken(user.id, primaryRole, env.JWT_SECRET);
    await recordLoginAttempt({
      userId: user.id,
      email,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      failureReason: "2fa_required",
      turnstileVerified,
      twoFactorUsed: true,
      recoveryCodeUsed: false,
    });
    return c.json(
      {
        success: true,
        data: { twoFactorRequired: true, pendingToken },
        meta: { requestId },
      },
      200,
    );
  }

  // ── Full session ──────────────────────────────────────────────────────────

  const token = issueToken(user.id, primaryRole, env.JWT_SECRET, {
    twoFactorVerified: false,
  });

  await recordLoginAttempt({
    userId: user.id,
    email,
    ipAddress: ip,
    userAgent: ua,
    success: true,
    turnstileVerified,
    twoFactorUsed: false,
    recoveryCodeUsed: false,
  });

  return c.json(
    {
      success: true,
      data: { token, twoFactorRequired: false },
      meta: { requestId },
    },
    200,
  );
});

// ── POST /api/v1/auth/login/verify-2fa ────────────────────────────────────────

auth.post("/login/verify-2fa", async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const env = getEnv();
  const tfCfg = getTwoFactorConfig();

  let body: { code?: string; pendingToken?: string; isRecoveryCode?: boolean };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body." }, meta: { requestId } },
      400,
    );
  }

  const { code, pendingToken, isRecoveryCode } = body;

  if (!code || !pendingToken) {
    return c.json(
      { success: false, error: { code: "BAD_REQUEST", message: "code and pendingToken are required." }, meta: { requestId } },
      400,
    );
  }

  // Verify pending token.
  const payload = verifyToken(pendingToken, env.JWT_SECRET);
  if (!payload?.pending2fa) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired challenge token." }, meta: { requestId } },
      401,
    );
  }

  const userId = payload.sub;
  const pool = getPool();

  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For");
  const ua = c.req.header("User-Agent");

  // Load security settings.
  const security = await pool<
    { two_factor_secret_encrypted: string | null }[]
  >`
    select two_factor_secret_encrypted
    from public.user_security_settings
    where user_id = ${userId}
    limit 1
  `;

  const encryptedSecret = security[0]?.two_factor_secret_encrypted;

  if (!isRecoveryCode) {
    // ── TOTP path ───────────────────────────────────────────────────────────
    if (!encryptedSecret || !tfCfg.encryptionKey) {
      return c.json(
        { success: false, error: { code: "2FA_NOT_SETUP", message: "2FA is not configured." }, meta: { requestId } },
        400,
      );
    }

    const secret = await decryptTotpSecret(encryptedSecret, tfCfg.encryptionKey);
    const valid = verifyTotpCode(secret, code);

    if (!valid) {
      await recordLoginAttempt({
        userId,
        email: userId, // no email in pending token; use userId as marker
        ipAddress: ip,
        userAgent: ua,
        success: false,
        failureReason: "invalid_totp_code",
        turnstileVerified: true,
        twoFactorUsed: true,
        recoveryCodeUsed: false,
      });
      return c.json(
        { success: false, error: { code: "INVALID_CODE", message: "Invalid authentication code." }, meta: { requestId } },
        401,
      );
    }
  } else {
    // ── Recovery code path ──────────────────────────────────────────────────
    if (!tfCfg.recoveryCodePepper) {
      return c.json(
        { success: false, error: { code: "SERVER_ERROR", message: "Recovery codes not available." }, meta: { requestId } },
        500,
      );
    }

    const storedCodes = await pool<{ id: string; code_hash: string }[]>`
      select id, code_hash
      from public.user_recovery_codes
      where user_id = ${userId} and used_at is null
    `;

    const hashes = storedCodes.map((r) => r.code_hash);
    const matchIdx = findMatchingRecoveryCode(code, hashes, tfCfg.recoveryCodePepper);

    if (matchIdx === -1) {
      await recordLoginAttempt({
        userId,
        email: userId,
        ipAddress: ip,
        userAgent: ua,
        success: false,
        failureReason: "invalid_recovery_code",
        turnstileVerified: true,
        twoFactorUsed: true,
        recoveryCodeUsed: true,
      });
      return c.json(
        { success: false, error: { code: "INVALID_CODE", message: "Invalid recovery code." }, meta: { requestId } },
        401,
      );
    }

    // Mark as used (single-use).
    const usedId = storedCodes[matchIdx]!.id;
    await pool`
      update public.user_recovery_codes
      set used_at = now()
      where id = ${usedId}
    `;
  }

  // ── Issue full session ────────────────────────────────────────────────────

  const roles = await getRolesForUser(userId);
  const primaryRole = roles[0]?.name ?? "viewer";

  const token = issueToken(userId, primaryRole, env.JWT_SECRET, {
    twoFactorVerified: true,
  });

  await recordLoginAttempt({
    userId,
    email: userId,
    ipAddress: ip,
    userAgent: ua,
    success: true,
    turnstileVerified: true,
    twoFactorUsed: true,
    recoveryCodeUsed: isRecoveryCode ?? false,
  });

  return c.json(
    { success: true, data: { token }, meta: { requestId } },
    200,
  );
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

auth.post("/logout", async (c) => {
  const requestId = (c.get("requestId" as never) as string | undefined) ?? "unknown";
  const env = getEnv();
  const token = extractBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Bearer token is required." }, meta: { requestId } },
      401,
    );
  }

  const payload = verifyToken(token, env.JWT_SECRET);
  if (!payload || payload.pending2fa) {
    return c.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Valid session token is required." }, meta: { requestId } },
      401,
    );
  }

  await revokeSessionToken(payload, token, env.JWT_SECRET);
  await deleteExpiredSessionRevocations();

  return c.json({ success: true, data: { revoked: true }, meta: { requestId } }, 200);
});

export { auth };
