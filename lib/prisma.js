import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function createPrismaClient() {
  const connectionString = getDatabaseUrl();

  // A driver adapter keeps Prisma independent of native query-engine binaries.
  // Netlify's serverless runtime is Amazon Linux, while the build machine is
  // Debian; the generated native engine is not guaranteed to match at runtime.
  // The pg adapter uses Prisma's WASM query engine, which runs on every platform.
  const pool = new Pool({
    connectionString: connectionString || undefined,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true
  });

  pool.on("error", (error) => {
    console.error("[prisma] Unexpected PostgreSQL pool error", {
      code: error?.code,
      message: error?.message
    });
  });

  const adapter = new PrismaPg(pool, { schema: "aurena" });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

  // Expose the pool for explicit shutdown in scripts/tests without changing
  // the public Prisma client surface used by the application.
  client.__pgPool = pool;
  return client;
}

export const prisma =
  globalForPrisma.__aurenaPrisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__aurenaPrisma = prisma;
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export default prisma;

export function serializeService(service) {
  if (!service) return null;
  return {
    ...service,
    startingPrice:
      service.startingPrice !== null && service.startingPrice !== undefined
        ? Number(service.startingPrice)
        : 0,
    regularPrice:
      service.regularPrice !== null && service.regularPrice !== undefined
        ? Number(service.regularPrice)
        : null,
    promotionalPrice:
      service.promotionalPrice !== null && service.promotionalPrice !== undefined
        ? Number(service.promotionalPrice)
        : null
  };
}
