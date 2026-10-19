import { prisma } from "@/lib/prisma";
import neonAuthDdl from "../prisma/neonAuthDdl.js";

const { NEON_AUTH_DDL } = neonAuthDdl;

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
      for (const statement of NEON_AUTH_DDL) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
