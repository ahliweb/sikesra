import { getEnv } from "./env.js";

export function getR2Config() {
  const env = getEnv();
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  };
}
