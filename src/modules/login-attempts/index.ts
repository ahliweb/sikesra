/**
 * Login attempt logging module.
 * Issue: ahliweb/sikesra#66
 *
 * Writes to the login_attempts table on every login attempt.
 * IP addresses and user agents are hashed before storage (never raw).
 */

import { createHmac } from "node:crypto";
import { getPool } from "../../db/client.js";
import { getEnv } from "../../api/config/env.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginAttemptRecord {
  userId?: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  turnstileVerified: boolean;
  twoFactorUsed: boolean;
  recoveryCodeUsed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Hash a PII string (IP, user-agent) with HMAC-SHA256 using the pepper.
 * Returns a 64-char hex string; never the raw value.
 */
function hashPii(value: string, pepper: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

// ── Writer ────────────────────────────────────────────────────────────────────

/**
 * Record a login attempt. Fire-and-forget — errors are logged but never thrown.
 */
export async function recordLoginAttempt(
  attempt: LoginAttemptRecord,
): Promise<void> {
  try {
    const pool = getPool();
    const piiPepper = getEnv().PASSWORD_PEPPER;
    const ipHashed = attempt.ipAddress
      ? hashPii(attempt.ipAddress, piiPepper)
      : null;
    const uaHashed = attempt.userAgent
      ? hashPii(attempt.userAgent, piiPepper)
      : null;

    await pool`
      insert into public.login_attempts (
        user_id,
        email_or_identifier,
        ip_address_hash,
        user_agent_hash,
        success,
        failure_reason,
        turnstile_verified,
        two_factor_required,
        two_factor_verified,
        created_at
      ) values (
        ${attempt.userId ?? null},
        ${hashPii(attempt.email.toLowerCase(), piiPepper)},
        ${ipHashed},
        ${uaHashed},
        ${attempt.success},
        ${attempt.failureReason ?? null},
        ${attempt.turnstileVerified},
        ${attempt.twoFactorUsed},
        ${attempt.twoFactorUsed && attempt.success},
        now()
      )
    `;
  } catch (err) {
    console.error("[login-attempts] Failed to record attempt:", err);
  }
}
