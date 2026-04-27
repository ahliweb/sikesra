import { getEnv } from "./env.js";

export function getTwoFactorConfig() {
  const env = getEnv();
  return {
    issuer: env.TWO_FACTOR_ISSUER,
    encryptionKey: env.TWO_FACTOR_ENCRYPTION_KEY,
    recoveryCodePepper: env.TWO_FACTOR_RECOVERY_CODE_PEPPER,
  };
}
