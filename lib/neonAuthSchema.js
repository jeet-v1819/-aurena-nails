import { prisma } from "@/lib/prisma";

const DDL = [
  `CREATE SCHEMA IF NOT EXISTS "neon_auth"`,
  `CREATE TABLE IF NOT EXISTS "neon_auth"."user" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT TRUE,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS "neon_auth"."account" (
    "id" UUID PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS "neon_auth"."session" (
    "id" UUID PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
];

let schemaPromise = null;

/**
 * The in-app Neon Auth-compatible endpoint owns its tables when a separate
 * NEON_AUTH_BASE_URL is not configured. Creating them lazily with
 * IF NOT EXISTS makes a fresh Neon database usable without a destructive
 * migration, while remaining a no-op when Neon Auth already provisioned them.
 */
export function ensureNeonAuthSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of DDL) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
