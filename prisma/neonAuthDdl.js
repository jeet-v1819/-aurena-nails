/**
 * Idempotent DDL for the Neon Auth-compatible tables.
 *
 * These tables are owned by Neon Auth when a managed endpoint is configured.
 * For the in-app endpoint (NEON_AUTH_BASE_URL empty / self-hosted) the app
 * creates them lazily with `CREATE ... IF NOT EXISTS`, so provisioning an
 * administrator never requires a destructive migration.
 *
 * This module is plain CommonJS so both the Next.js app
 * (`lib/neonAuthSchema.js`) and the standalone Node scripts
 * (`prisma/seed.js`, `scripts/provision-admin.js`) can share one definition.
 */
const NEON_AUTH_DDL = [
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

exports.NEON_AUTH_DDL = NEON_AUTH_DDL;
