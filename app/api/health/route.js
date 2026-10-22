import { NextResponse } from "next/server";
import prisma, { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight deployment health check.
 *
 * Reports whether PostgreSQL/Prisma and the Neon Auth configuration are
 * reachable without exposing credentials or connection strings. Useful for
 * verifying a Netlify deployment after a release.
 */
export async function GET() {
  const database = {
    configured: isDatabaseConfigured(),
    connected: false,
    schemaReady: false,
    errorCode: null
  };

  if (database.configured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database.connected = true;

      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS "count"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('User', 'WebsiteContent', 'Service', 'Appointment')
      `;
      database.schemaReady = Number(rows?.[0]?.count || 0) >= 4;
    } catch (error) {
      database.errorCode = error?.code || "DB_ERROR";
      console.error("[health] Database check failed", {
        code: error?.code,
        message: error?.message
      });
    }
  }

  const authBaseUrl = process.env.NEON_AUTH_BASE_URL || "";
  const auth = {
    baseUrlConfigured: Boolean(authBaseUrl),
    cookieSecretConfigured: Boolean(
      process.env.AUTH_SECRET || process.env.NEON_AUTH_COOKIE_SECRET
    ),
    usingSelfHostedFallback: !authBaseUrl,
    tablesReady: false
  };

  if (database.connected) {
    try {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS "count"
        FROM information_schema.tables
        WHERE table_schema = 'neon_auth'
          AND table_name IN ('user', 'account', 'session')
      `;
      auth.tablesReady = Number(rows?.[0]?.count || 0) >= 3;
    } catch (error) {
      console.error("[health] Neon Auth table check failed", {
        code: error?.code,
        message: error?.message
      });
    }
  }

  const ok = database.connected && database.schemaReady;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      database,
      auth,
      timestamp: new Date().toISOString()
    },
    { status: ok ? 200 : 503 }
  );
}
