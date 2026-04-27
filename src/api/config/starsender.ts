import { getEnv } from "./env.js";

export function getStarsenderConfig() {
  const env = getEnv();
  return {
    enabled: env.STARSENDER_ENABLED,
    apiBaseUrl: env.STARSENDER_API_BASE_URL,
    apiKey: env.STARSENDER_API_KEY,
    deviceId: env.STARSENDER_DEVICE_ID,
    defaultCountryCode: env.STARSENDER_DEFAULT_COUNTRY_CODE,
    webhookSecret: env.STARSENDER_WEBHOOK_SECRET,
    timeoutMs: env.STARSENDER_TIMEOUT_MS,
    maxRetries: env.STARSENDER_MAX_RETRIES,
  };
}
