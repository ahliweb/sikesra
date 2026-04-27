import { getEnv } from "./env.js";

export function getNotificationsConfig() {
  const env = getEnv();
  return {
    rateLimitPerMinute: env.NOTIFICATION_RATE_LIMIT_PER_MINUTE,
    retryEnabled: env.NOTIFICATION_RETRY_ENABLED,
    defaultProviderEmail: env.NOTIFICATION_DEFAULT_PROVIDER_EMAIL,
    defaultProviderWhatsapp: env.NOTIFICATION_DEFAULT_PROVIDER_WHATSAPP,
  };
}
