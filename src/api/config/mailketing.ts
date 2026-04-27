import { getEnv } from "./env.js";

export function getMailketingConfig() {
  const env = getEnv();
  return {
    enabled: env.MAILKETING_ENABLED,
    apiBaseUrl: env.MAILKETING_API_BASE_URL,
    apiKey: env.MAILKETING_API_KEY,
    senderEmail: env.MAILKETING_SENDER_EMAIL,
    senderName: env.MAILKETING_SENDER_NAME,
    webhookSecret: env.MAILKETING_WEBHOOK_SECRET,
    timeoutMs: env.MAILKETING_TIMEOUT_MS,
    maxRetries: env.MAILKETING_MAX_RETRIES,
  };
}
