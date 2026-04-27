/**
 * Cloudflare Turnstile verification module.
 * Issue: ahliweb/sikesra#66
 *
 * Verifies a Turnstile challenge token on the backend only.
 * Never expose TURNSTILE_SECRET_KEY to the client.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TurnstileVerifyResult {
  success: boolean;
  /** Error codes from the Turnstile API, if any. */
  errorCodes?: string[];
}

// ── Verifier ──────────────────────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token.
 *
 * @param token     The cf-turnstile-response token from the client.
 * @param secretKey TURNSTILE_SECRET_KEY from env.
 * @param remoteIp  Optional client IP address (recommended by Cloudflare).
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!token || !secretKey) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  let json: { success: boolean; "error-codes"?: string[] };
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
    });
    json = (await res.json()) as typeof json;
  } catch (err) {
    console.error("[turnstile] Verification request failed:", err);
    return { success: false, errorCodes: ["network-error"] };
  }

  return {
    success: json.success === true,
    errorCodes: json["error-codes"],
  };
}

/**
 * Middleware-friendly helper: returns true if the token is valid.
 * Logs warnings on failure but does not throw.
 */
export async function isTurnstileValid(
  token: string | undefined,
  secretKey: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!token) return false;
  const result = await verifyTurnstileToken(token, secretKey, remoteIp);
  if (!result.success) {
    console.warn("[turnstile] Verification failed:", result.errorCodes);
  }
  return result.success;
}
