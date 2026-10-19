import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required and must point to your Neon PostgreSQL instance.")
    .refine(
      (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
      "DATABASE_URL must be a valid PostgreSQL connection string."
    ),
  NEON_AUTH_BASE_URL: z
    .string()
    .url("NEON_AUTH_BASE_URL must be a valid URL pointing to your Neon Auth endpoint."),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters long for session security."),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL.")
    .default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  EMAIL_SERVER: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("Aurena Nails <noreply@aurenanails.com>"),
  EMAIL_USERNAME: z.string().optional().default(""),
  EMAIL_PASSWORD: z.string().optional().default("")
});

let cachedEnv = null;

export function getServerEnv() {
  if (cachedEnv) return cachedEnv;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    "http://localhost:3000";

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL:
      process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/aurena_nails",
    NEON_AUTH_BASE_URL:
      process.env.NEON_AUTH_BASE_URL || `${appUrl}/api/neon-auth`,
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      process.env.NEON_AUTH_COOKIE_SECRET ||
      "aurena-nails-super-secret-neon-auth-cookie-key-2026",
    NEXT_PUBLIC_APP_URL: appUrl,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    EMAIL_SERVER: process.env.EMAIL_SERVER || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "Aurena Nails <noreply@aurenanails.com>",
    EMAIL_USERNAME: process.env.EMAIL_USERNAME || "",
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || ""
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Environment configuration error: ${issues}`);
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.AUTH_SECRET &&
    !process.env.NEON_AUTH_COOKIE_SECRET
  ) {
    console.error(
      "[env] AUTH_SECRET / NEON_AUTH_COOKIE_SECRET is not configured. Session cookies are being signed with an insecure default."
    );
  }

  if (process.env.NODE_ENV === "production" && !process.env.NEON_AUTH_BASE_URL) {
    console.warn(
      "[env] NEON_AUTH_BASE_URL is not configured; using the in-app Neon Auth-compatible endpoint."
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isCloudinaryConfigured() {
  const env = getServerEnv();
  const isPlaceholder = (val) =>
    !val ||
    val.startsWith("YOUR_") ||
    val === "GENERATE_A_STRONG_RANDOM_SECRET";

  return (
    !isPlaceholder(env.CLOUDINARY_CLOUD_NAME) &&
    !isPlaceholder(env.CLOUDINARY_API_KEY) &&
    !isPlaceholder(env.CLOUDINARY_API_SECRET)
  );
}

export function isEmailConfigured() {
  const env = getServerEnv();
  const isPlaceholder = (val) => !val || val.startsWith("YOUR_");
  return !isPlaceholder(env.EMAIL_SERVER) && !isPlaceholder(env.EMAIL_USERNAME);
}
