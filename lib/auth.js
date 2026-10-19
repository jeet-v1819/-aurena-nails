import {
  createAuthServer,
  extractNeonAuthCookies,
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
  handleAuthProxyRequest
} from "@neondatabase/auth/server";
import { cookies, headers } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const FALLBACK_SESSION_COOKIE = "aurena_session_token";
export const LEGACY_FALLBACK_SESSION_COOKIE = "aurena_auth_token";

export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.statusCode = status;
    this.code = code;
  }
}

function isSecureRequest(headerStore, env) {
  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }
  const origin =
    headerStore.get("origin") ||
    headerStore.get("referer") ||
    env.NEXT_PUBLIC_APP_URL ||
    "";
  return origin.startsWith("https://");
}

function normalizeTokenValue(raw) {
  if (!raw || typeof raw !== "string") return "";
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

function extractRawSessionToken(tokenValue) {
  const decoded = normalizeTokenValue(tokenValue);
  if (!decoded) return "";
  const dotIdx = decoded.indexOf(".");
  if (dotIdx > 0) {
    return decoded.slice(0, dotIdx);
  }
  return decoded;
}

async function createNextRequestContext() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const env = getServerEnv();
  const isSecure = isSecureRequest(headerStore, env);

  return {
    getCookies() {
      const neonToken = cookieStore.get(NEON_AUTH_SESSION_COOKIE_NAME)?.value;
      const fallbackToken =
        cookieStore.get(FALLBACK_SESSION_COOKIE)?.value ||
        cookieStore.get(LEGACY_FALLBACK_SESSION_COOKIE)?.value;
      const activeToken = neonToken || fallbackToken;

      const parts = [];
      if (activeToken) {
        const decoded = normalizeTokenValue(activeToken);
        parts.push(
          `${NEON_AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(decoded)}`
        );
      }

      const sessionDataCookie = cookieStore.get(
        NEON_AUTH_SESSION_DATA_COOKIE_NAME
      )?.value;
      if (sessionDataCookie) {
        parts.push(
          `${NEON_AUTH_SESSION_DATA_COOKIE_NAME}=${sessionDataCookie}`
        );
      }

      if (parts.length > 0) {
        return parts.join("; ");
      }

      return extractNeonAuthCookies(headerStore);
    },
    setCookie(name, value, options = {}) {
      try {
        cookieStore.set(name, value, {
          ...options,
          httpOnly: true,
          sameSite: options.sameSite
            ? String(options.sameSite).toLowerCase()
            : "lax",
          path: options.path || "/",
          secure: isSecure
        });

        if (name === NEON_AUTH_SESSION_COOKIE_NAME) {
          if (!value || options.maxAge === 0) {
            const clearOpts = {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: isSecure,
              maxAge: 0
            };
            cookieStore.set(FALLBACK_SESSION_COOKIE, "", clearOpts);
            cookieStore.set(LEGACY_FALLBACK_SESSION_COOKIE, "", clearOpts);
          } else {
            const fallbackOpts = {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: isSecure,
              maxAge: options.maxAge ?? 60 * 60 * 24 * 7
            };
            cookieStore.set(FALLBACK_SESSION_COOKIE, value, fallbackOpts);
            cookieStore.set(LEGACY_FALLBACK_SESSION_COOKIE, value, fallbackOpts);
          }
        }
      } catch {
        // cookies() cannot be mutated inside RSC render; safe to ignore during read-only RSC
      }
    },
    getHeader(name) {
      return headerStore.get(name) ?? null;
    },
    getOrigin() {
      const origin = headerStore.get("origin");
      if (origin) return origin;
      const referer = headerStore.get("referer");
      if (referer) {
        try {
          return new URL(referer).origin;
        } catch {
          // Fall through
        }
      }
      const host =
        headerStore.get("x-forwarded-host") || headerStore.get("host");
      if (host) {
        const proto = isSecure ? "https" : "http";
        return `${proto}://${host}`;
      }
      return env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    },
    getFramework() {
      return "nextjs";
    }
  };
}

let authServerInstance = null;

export function getNeonAuthServer() {
  if (authServerInstance) return authServerInstance;
  const env = getServerEnv();
  authServerInstance = createAuthServer({
    baseUrl: env.NEON_AUTH_BASE_URL,
    context: createNextRequestContext,
    cookieSecret: env.AUTH_SECRET,
    cookies: {
      secret: env.AUTH_SECRET,
      sessionDataTtl: 60
    },
    sessionDataTtl: 60,
    sameSite: "lax",
    logLevel: "silent"
  });
  return authServerInstance;
}

export async function setAuthSessionCookies(
  tokenValue,
  maxAgeSeconds = 60 * 60 * 24 * 7
) {
  if (!tokenValue) return;
  try {
    const env = getServerEnv();
    const cookieStore = await cookies();
    const headerStore = await headers();
    const isSecure = isSecureRequest(headerStore, env);

    // Always persist the token from the session that was just established.
    // Reusing an older fallback cookie here can silently restore a previous
    // user's session after a new sign-in.
    const valueToPersist = tokenValue;

    const opts = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      maxAge: maxAgeSeconds
    };

    cookieStore.set(FALLBACK_SESSION_COOKIE, valueToPersist, opts);
    cookieStore.set(LEGACY_FALLBACK_SESSION_COOKIE, valueToPersist, opts);
    if (!cookieStore.get(NEON_AUTH_SESSION_COOKIE_NAME)?.value) {
      cookieStore.set(NEON_AUTH_SESSION_COOKIE_NAME, valueToPersist, opts);
    }
  } catch {
    // Ignore in read-only RSC context
  }
}

export async function getRawSessionTokenFromCookies() {
  try {
    const cookieStore = await cookies();
    const raw =
      cookieStore.get(NEON_AUTH_SESSION_COOKIE_NAME)?.value ||
      cookieStore.get(FALLBACK_SESSION_COOKIE)?.value ||
      cookieStore.get(LEGACY_FALLBACK_SESSION_COOKIE)?.value ||
      "";
    return extractRawSessionToken(raw);
  } catch {
    return "";
  }
}

export async function proxyNeonAuthRequest(request, pathSegments = []) {
  const env = getServerEnv();
  const path = Array.isArray(pathSegments)
    ? pathSegments.join("/")
    : String(pathSegments || "");
  return handleAuthProxyRequest({
    request,
    path,
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.AUTH_SECRET,
    sessionDataTtl: 60,
    sameSite: "lax"
  });
}

export async function clearAuthSessionCookies() {
  try {
    const env = getServerEnv();
    const cookieStore = await cookies();
    const headerStore = await headers();
    const isSecure = isSecureRequest(headerStore, env);

    const clearOpts = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      maxAge: 0,
      expires: new Date(0)
    };
    cookieStore.set(NEON_AUTH_SESSION_COOKIE_NAME, "", clearOpts);
    cookieStore.set(NEON_AUTH_SESSION_DATA_COOKIE_NAME, "", clearOpts);
    cookieStore.set(FALLBACK_SESSION_COOKIE, "", clearOpts);
    cookieStore.set(LEGACY_FALLBACK_SESSION_COOKIE, "", clearOpts);
  } catch {
    // Ignore if called in read-only RSC context
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    authId: user.authId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName || ""}`.trim(),
    mobile: user.mobile || "",
    image: user.image || null,
    role: user.role,
    active: Boolean(user.active),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function lookupNeonSessionFromDatabase(rawToken) {
  if (!rawToken) return null;
  const rows = await prisma.$queryRaw`
      SELECT
        s."id" AS "sessionId",
        s."userId" AS "userId",
        s."expiresAt" AS "expiresAt",
        u."id" AS "uid",
        u."email" AS "email",
        u."name" AS "name",
        u."banned" AS "banned"
      FROM "neon_auth"."session" s
      INNER JOIN "neon_auth"."user" u ON u."id" = s."userId"
      WHERE s."token" = ${rawToken}
      LIMIT 1
    `;
  return rows?.[0] || null;
}

export async function getSessionAndUser({ disableCookieCache = true } = {}) {
  let authUser = null;
  let authSession = null;
  let databaseError = false;

  try {
    const auth = getNeonAuthServer();
    const { data, error } = await auth.getSession(
      disableCookieCache
        ? { query: { disableCookieCache: "true" } }
        : undefined
    );
    if (!error && data?.user?.id && data?.session) {
      authUser = data.user;
      authSession = data.session;
    }
  } catch (error) {
    // Fall back to direct Neon PostgreSQL session verification below.
    console.warn("[auth] Neon Auth getSession failed", {
      message: error?.message
    });
  }

  let rawToken = "";
  try {
    rawToken = await getRawSessionTokenFromCookies();
  } catch {
    rawToken = "";
  }

  if ((!authUser?.id || !authSession) && rawToken) {
    try {
      const dbSession = await lookupNeonSessionFromDatabase(rawToken);
      if (dbSession) {
        if (dbSession.banned) {
          return {
            user: null,
            session: null,
            inactive: true,
            error:
              "Your account is currently inactive. Please contact Aurena Nails."
          };
        }
        authUser = {
          id: String(dbSession.userId),
          email: dbSession.email,
          name: dbSession.name
        };
        authSession = {
          id: String(dbSession.sessionId),
          expiresAt: dbSession.expiresAt
        };
      }
    } catch (error) {
      // A cookie is present but PostgreSQL could not verify it. This is an
      // infrastructure failure, not an anonymous request.
      databaseError = true;
      console.error("[auth] Database session lookup failed", {
        code: error?.code,
        message: error?.message
      });
    }
  }

  if (!authUser?.id || !authSession) {
    return {
      user: null,
      session: null,
      inactive: false,
      databaseError
    };
  }

  const sessionExpiresAt = new Date(authSession.expiresAt);
  if (
    Number.isNaN(sessionExpiresAt.getTime()) ||
    sessionExpiresAt <= new Date()
  ) {
    return { user: null, session: null, inactive: false, expired: true };
  }

  try {
    const authIdStr = String(authUser.id);
    let appUser = await prisma.user.findUnique({
      where: { authId: authIdStr }
    });

    if (!appUser && authUser.email) {
      const normalizedEmail = String(authUser.email).trim().toLowerCase();
      const byEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (byEmail && !byEmail.deletedAt) {
        appUser = await prisma.user.update({
          where: { id: byEmail.id },
          data: { authId: authIdStr }
        });
      }
    }

    if (!appUser || appUser.deletedAt) {
      return { user: null, session: null, inactive: false };
    }

    if (!appUser.active) {
      return {
        user: null,
        session: null,
        inactive: true,
        error:
          "Your account is currently inactive. Please contact Aurena Nails."
      };
    }

    return {
      user: sanitizeUser(appUser),
      session: {
        id: authSession.id,
        expiresAt: authSession.expiresAt
      },
      inactive: false
    };
  } catch (error) {
    console.error("[auth] Failed to load application user profile", {
      code: error?.code,
      message: error?.message
    });
    return {
      user: null,
      session: null,
      inactive: false,
      databaseError: true
    };
  }
}

export async function requireUser() {
  const { user, session, inactive, error, databaseError } =
    await getSessionAndUser({
      disableCookieCache: true
    });

  if (databaseError) {
    throw new AppError(
      "Authentication is temporarily unavailable. Please try again in a moment.",
      503,
      "AUTH_UNAVAILABLE"
    );
  }

  if (inactive) {
    throw new AppError(
      error ||
        "Your account is currently inactive. Please contact Aurena Nails.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  if (!user || !session) {
    throw new AppError("Please sign in to continue.", 401, "UNAUTHORIZED");
  }

  return { user, session };
}

export async function requireAdmin() {
  const { user, session } = await requireUser();

  if (user.role !== "ADMIN") {
    throw new AppError(
      "Forbidden: Only administrators can access this resource.",
      403,
      "FORBIDDEN"
    );
  }

  return { user, session };
}

export async function checkRateLimit(
  key,
  { limit = 15, windowSeconds = 60 } = {}
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.expiresAt <= now) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, expiresAt },
        create: { key, count: 1, expiresAt }
      });
      return { allowed: true, remaining: limit - 1 };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, retryAfter: existing.expiresAt };
    }

    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } }
    });

    return { allowed: true, remaining: Math.max(0, limit - updated.count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}
