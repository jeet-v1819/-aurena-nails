import { NextResponse } from "next/server";

const NEON_AUTH_SESSION_COOKIE_NAME = "__Secure-neon-auth.session_token";
const FALLBACK_SESSION_COOKIE = "aurena_session_token";
const LEGACY_FALLBACK_SESSION_COOKIE = "aurena_auth_token";

const CUSTOMER_PROTECTED_PREFIXES = [
  "/profile",
  "/appointments",
  "/wishlist",
  "/notifications"
];

export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  const hasNeonToken = Boolean(
    request.cookies.get(NEON_AUTH_SESSION_COOKIE_NAME)?.value
  );
  const hasFallbackToken = Boolean(
    request.cookies.get(FALLBACK_SESSION_COOKIE)?.value ||
      request.cookies.get(LEGACY_FALLBACK_SESSION_COOKIE)?.value
  );
  const hasSessionCookie = hasNeonToken || hasFallbackToken;

  const isCustomerProtected = CUSTOMER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isCustomerProtected && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminProtected =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminProtected && !hasSessionCookie) {
    const adminLoginUrl = new URL("/admin/login", request.url);
    adminLoginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(adminLoginUrl);
  }

  // Expose the pathname to server layouts so they can distinguish e.g.
  // /admin/login from the protected admin pages without a second rewrite.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-aurena-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/appointments/:path*",
    "/wishlist/:path*",
    "/notifications/:path*",
    "/admin/:path*"
  ]
};
