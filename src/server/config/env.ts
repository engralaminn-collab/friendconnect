/**
 * Centralised, validated environment configuration.
 *
 * All code must read configuration through `env` rather than `process.env`
 * directly. Mandatory production settings are validated at startup/import and
 * produce actionable error messages.
 */
import { z } from "zod";

const boolish = z
  .union([z.string(), z.boolean()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (["true", "1", "yes", "on"].includes(v.trim().toLowerCase())) return true;
    if (["false", "0", "no", "off"].includes(v.trim().toLowerCase())) return false;
    return v;
  })
  .pipe(z.boolean());

const csv = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.string().default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ALLOWED_ORIGINS: csv.default(() => ['http://localhost:3000']),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().optional().default(""),

  DATABASE_URL: z.string().min(1).optional(),
  MYSQL_POOL_MAX: z.coerce.number().int().positive().default(10),
  MYSQL_TLS: boolish.default(false),

  AUTH_SECRET: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).default("auto"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_NAME: z.string().default("fc_session"),
  AUTH_LOCK_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  AUTH_LOCK_THRESHOLD: z.coerce.number().int().positive().default(10),

  MEDIA_DRIVER: z.enum(["s3", "local"]).default("local"),
  MEDIA_LOCAL_DIR: z.string().default("./.private-media"),
  MEDIA_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_FORCE_PATH_STYLE: boolish.default(true),
  S3_PRESIGN_TTL_SEC: z.coerce.number().int().positive().default(300),

  WEBSOCKET_PATH: z.string().default("/api/realtime"),
  WEBSOCKET_CORS_ORIGINS: csv.default(() => []),

  STUN_URLS: csv.default(() => ['stun:stun.l.google.com:19302']),
  TURN_URLS: csv.default(() => []),
  TURN_USERNAME: z.string().default(""),
  TURN_CREDENTIAL: z.string().default(""),
  TURN_SHARED_SECRET: z.string().default(""),
  TURN_CREDENTIAL_TTL_SEC: z.coerce.number().int().positive().default(3600),

  LIVEKIT_URL: z.string().default(""),
  LIVEKIT_API_KEY: z.string().default(""),
  LIVEKIT_API_SECRET: z.string().default(""),

  REDIS_URL: z.string().default(""),

  SMTP_URL: z.string().default(""),
  EMAIL_FROM: z.string().default("FriendConnect <no-reply@example.com>"),
  EMAIL_VERIFY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().positive().default(1),

  RATE_LIMIT_API_PER_MIN: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_UPLOAD_PER_MIN: z.coerce.number().int().positive().default(20),

  HEALTH_CHECK_TOKEN: z.string().default(""),
});

export type Env = z.infer<typeof EnvSchema>;

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n` +
        "Fix the variables above (see .env.example) and restart the server.",
    );
  }
  const env = parsed.data;

  const errors: string[] = [];
  if (env.NODE_ENV === "production") {
    if (!env.DATABASE_URL)
      errors.push("DATABASE_URL is required in production (MySQL 8 connection URL).");
    if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
      errors.push(
        "AUTH_SECRET is required in production and must be at least 32 characters " +
          "(generate one with: openssl rand -base64 48).",
      );
    if (env.MEDIA_DRIVER === "s3" && (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID))
      errors.push("S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when MEDIA_DRIVER=s3.");
    if (env.COOKIE_SAMESITE === "none" && env.COOKIE_SECURE === "false")
      errors.push("COOKIE_SAMESITE=none requires Secure cookies (COOKIE_SECURE must not be false).");
  }
  if (env.MEDIA_DRIVER === "s3" && env.S3_BUCKET && !env.S3_ACCESS_KEY_ID)
    errors.push("S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY are required for S3 storage.");
  if (errors.length > 0) {
    throw new Error(
      "Environment validation failed:\n  - " +
        errors.join("\n  - ") +
        "\nSee .env.example for the full list of settings.",
    );
  }
  return env;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = load();
  return cached;
}

/** Test-only helper to reset the cached configuration. */
export function resetEnvCache(): void {
  cached = null;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return (getEnv() as unknown as Record<string, unknown>)[prop];
  },
});
