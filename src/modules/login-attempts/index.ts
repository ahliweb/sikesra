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

export interface LoginLockoutDecision {
  locked: boolean;
  recentFailureCount: number;
  retryAfterSeconds: number;
}

export async function getLoginLockoutDecision(input: {
  email: string;
  ipAddress?: string;
  windowMinutes?: number;
  maxFailures?: number;
}): Promise<LoginLockoutDecision> {
  const piiPepper = getEnv().PASSWORD_PEPPER;
  const windowMinutes = input.windowMinutes ?? getEnv().LOGIN_LOCKOUT_WINDOW_MINUTES;
  const maxFailures = input.maxFailures ?? getEnv().LOGIN_LOCKOUT_MAX_FAILURES;
  const emailHash = hashPii(input.email.toLowerCase(), piiPepper);
  const ipHash = input.ipAddress ? hashPii(input.ipAddress, piiPepper) : null;
  const pool = getPool();

  const rows = await pool<
    {
      failure_count: number | string;
      oldest_attempt_at: string | null;
    }[]
  >`
    select
      count(*)::int as failure_count,
      min(created_at)::text as oldest_attempt_at
    from public.login_attempts
    where success = false
      and created_at >= now() - (${windowMinutes} * interval '1 minute')
      and (
        email_or_identifier = ${emailHash}
        ${ipHash ? pool`or ip_address_hash = ${ipHash}` : pool``}
      )
  `;

  const failureCount = Number(rows[0]?.failure_count ?? 0);
  const oldestAttemptAt = rows[0]?.oldest_attempt_at ? Date.parse(rows[0].oldest_attempt_at) : null;
  const windowMs = windowMinutes * 60 * 1000;
  const retryAfterSeconds =
    failureCount >= maxFailures && oldestAttemptAt
      ? Math.max(1, Math.ceil((oldestAttemptAt + windowMs - Date.now()) / 1000))
      : 0;

  return {
    locked: failureCount >= maxFailures,
    recentFailureCount: failureCount,
    retryAfterSeconds,
  };
}
