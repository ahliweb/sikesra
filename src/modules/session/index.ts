/**
 * JWT session helpers.
 * Issue: ahliweb/sikesra#66
 *
 * Thin wrappers around the Node built-in crypto for HMAC-SHA256 JWT
 * (HS256). No external jwt library required.
 *
 * Payload shape:
 *   { sub: userId, role: roleName, iat: epochSec, exp: epochSec,
 *     twoFactorVerified?: boolean, pending2fa?: boolean }
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
  /** Unique session identifier used for server-side revocation checks. */
  jti?: string;
  /** true after the user completes 2FA verification. */
  twoFactorVerified?: boolean;
  /** true when awaiting 2FA step (partial session). */
  pending2fa?: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const PENDING_TTL_SECONDS = 5 * 60; // 5 minutes for 2FA challenge

// ── Encoding helpers ──────────────────────────────────────────────────────────

function b64url(buf: Buffer | string): string {
  const b64 =
    typeof buf === "string"
      ? Buffer.from(buf).toString("base64")
      : buf.toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

// ── Sign / verify ─────────────────────────────────────────────────────────────

const HEADER = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

function sign(payload: JwtPayload, secret: string): string {
  const encodedPayload = b64url(JSON.stringify(payload));
  const signingInput = `${HEADER}.${encodedPayload}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${b64url(sig)}`;
}

/**
 * Issue a full session JWT (after successful auth + optional 2FA).
 */
export function issueToken(
  userId: string,
  role: string,
  secret: string,
  opts?: { twoFactorVerified?: boolean; ttlSeconds?: number },
): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  return sign(
    {
      sub: userId,
      role,
      iat: now,
      exp: now + ttl,
      jti: randomUUID(),
      twoFactorVerified: opts?.twoFactorVerified ?? false,
    },
    secret,
  );
}

/**
 * Issue a short-lived pending JWT while awaiting 2FA completion.
 */
export function issuePending2faToken(
  userId: string,
  role: string,
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: userId,
      role,
      iat: now,
      exp: now + PENDING_TTL_SECONDS,
      jti: randomUUID(),
      pending2fa: true,
      twoFactorVerified: false,
    },
    secret,
  );
}

/**
 * Verify and decode a JWT. Returns null on any failure.
 */
export function verifyToken(
  token: string,
  secret: string,
): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  // Verify signature.
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const providedSig = Buffer.from(
    sigB64.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );

  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    return null;
  }

  // Decode and check expiry.
  let payload: JwtPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64)) as JwtPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return payload;
}

/**
 * Extract the Bearer token from an Authorization header value.
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}
