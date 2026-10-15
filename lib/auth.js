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

export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

async function createNextRequestContext() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const env = getServerEnv();

  return {
    getCookies() {
      let neonCookies = extractNeonAuthCookies(headerStore);
      if (!neonCookies.includes(NEON_AUTH_SESSION_COOKIE_NAME)) {
        const fallbackToken = cookieStore.get(FALLBACK_SESSION_COOKIE)?.value;
        if (fallbackToken) {
          const pair = `${NEON_AUTH_SESSION_COOKIE_NAME}=${fallbackToken}`;
          neonCookies = neonCookies ? `${neonCookies}; ${pair}` : pair;
        }
      }
      return neonCookies;
    },
    setCookie(name, value, options = {}) {
      try {
        const isProd = process.env.NODE_ENV === "production";
        cookieStore.set(name, value, {
          ...options,
          httpOnly: true,
          sameSite: options.sameSite || "lax",
          path: options.path || "/"
        });

        if (name === NEON_AUTH_SESSION_COOKIE_NAME) {
          if (!value || options.maxAge === 0) {
            cookieStore.set(FALLBACK_SESSION_COOKIE, "", {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: isProd,
              maxAge: 0
            });
          } else {
            cookieStore.set(FALLBACK_SESSION_COOKIE, value, {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: isProd,
              maxAge: options.maxAge ?? 60 * 60 * 24 * 7
            });
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
    sessionDataTtl: 60,
    sameSite: "lax",
    logLevel: "silent"
  });
  return authServerInstance;
}

export async function proxyNeonAuthRequest(request, pathSegments = []) {
  const env = getServerEnv();
  const path = Array.isArray(pathSegments) ? pathSegments.join("/") : String(pathSegments || "");
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
    const cookieStore = await cookies();
    cookieStore.set(NEON_AUTH_SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 0
    });
    cookieStore.set(NEON_AUTH_SESSION_DATA_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 0
    });
    cookieStore.set(FALLBACK_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0
    });
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

export async function getSessionAndUser({ disableCookieCache = true } = {}) {
  try {
    const auth = getNeonAuthServer();
    const { data, error } = await auth.getSession(
      disableCookieCache ? { query: { disableCookieCache: "true" } } : undefined
    );

    if (error || !data?.user?.id || !data?.session) {
      return { user: null, session: null, inactive: false };
    }

    const sessionExpiresAt = new Date(data.session.expiresAt);
    if (Number.isNaN(sessionExpiresAt.getTime()) || sessionExpiresAt <= new Date()) {
      return { user: null, session: null, inactive: false, expired: true };
    }

    let appUser = await prisma.user.findUnique({
      where: { authId: data.user.id }
    });

    if (!appUser && data.user.email) {
      const normalizedEmail = data.user.email.trim().toLowerCase();
      const byEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (byEmail && !byEmail.deletedAt) {
        appUser = await prisma.user.update({
          where: { id: byEmail.id },
          data: { authId: data.user.id }
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
        error: "Your account is currently inactive. Please contact Aurena Nails."
      };
    }

    return {
      user: sanitizeUser(appUser),
      session: {
        id: data.session.id,
        expiresAt: data.session.expiresAt
      },
      inactive: false
    };
  } catch {
    return { user: null, session: null, inactive: false };
  }
}

export async function requireUser() {
  const { user, session, inactive, error } = await getSessionAndUser({
    disableCookieCache: true
  });

  if (inactive) {
    throw new AppError(
      error || "Your account is currently inactive. Please contact Aurena Nails.",
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

export async function checkRateLimit(key, { limit = 15, windowSeconds = 60 } = {}) {
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
