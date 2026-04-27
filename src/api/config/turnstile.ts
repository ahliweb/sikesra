import { getEnv } from "./env.js";

export function getTurnstileConfig() {
  const env = getEnv();
  return {
    siteKey: env.TURNSTILE_SITE_KEY,
    secretKey: env.TURNSTILE_SECRET_KEY,
    verifyUrl: env.TURNSTILE_VERIFY_URL,
    enabled: Boolean(env.TURNSTILE_SECRET_KEY),
  };
}
