import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_BASE_URL: z.string().url().default("http://localhost:3000/api"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_INTERNAL_URL: z.string().min(1).optional(),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PASSWORD_PEPPER: z.string().min(16, "PASSWORD_PEPPER must be at least 16 characters"),
  LOGIN_LOCKOUT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  LOGIN_LOCKOUT_MAX_FAILURES: z.coerce.number().int().positive().default(5),

  // Cloudflare R2
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("sikesra"),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default(""),

  // Turnstile
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  TURNSTILE_VERIFY_URL: z
    .string()
    .url()
    .default("https://challenges.cloudflare.com/turnstile/v0/siteverify"),

  // Two-Factor Authentication
  TWO_FACTOR_ISSUER: z.string().default("SIKESRA"),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(32).optional(),
  TWO_FACTOR_RECOVERY_CODE_PEPPER: z.string().min(16).optional(),

  // OpenAPI / Swagger
  OPENAPI_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  OPENAPI_JSON_PATH: z.string().default("/openapi.json"),
  SWAGGER_UI_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  SWAGGER_UI_PATH: z.string().default("/docs"),

  // Mailketing
  MAILKETING_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  MAILKETING_API_BASE_URL: z.string().url().optional(),
  MAILKETING_API_KEY: z.string().optional(),
  MAILKETING_SENDER_EMAIL: z.string().email().optional(),
  MAILKETING_SENDER_NAME: z.string().default("SIKESRA"),
  MAILKETING_WEBHOOK_SECRET: z.string().optional(),
  MAILKETING_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MAILKETING_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),

  // Starsender
  STARSENDER_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  STARSENDER_API_BASE_URL: z.string().url().optional(),
  STARSENDER_API_KEY: z.string().optional(),
  STARSENDER_DEVICE_ID: z.string().optional(),
  STARSENDER_DEFAULT_COUNTRY_CODE: z.coerce.number().int().positive().default(62),
  STARSENDER_WEBHOOK_SECRET: z.string().optional(),
  STARSENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  STARSENDER_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),

  // Notification defaults
  NOTIFICATION_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  NOTIFICATION_RETRY_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  NOTIFICATION_DEFAULT_PROVIDER_EMAIL: z.string().default("mailketing"),
  NOTIFICATION_DEFAULT_PROVIDER_WHATSAPP: z.string().default("starsender"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  _env = result.data;
  return _env;
}

export function resetEnvCache(): void {
  _env = undefined;
}
