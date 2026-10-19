import React from "react";
import { redirect } from "next/navigation";
import { getSessionAndUser } from "@/lib/auth";

/**
 * Server-side guard for customer account pages.
 *
 * The middleware only checks that a session cookie exists; this layout verifies
 * the session against Neon Auth/PostgreSQL before the page is rendered. A
 * transient database failure renders the page (its API calls will surface a
 * retryable error) instead of incorrectly bouncing a signed-in customer to the
 * login screen.
 */
export default async function ProtectedCustomerLayout({ children, redirectTo }) {
  const { user, databaseError } = await getSessionAndUser({
    disableCookieCache: true
  });

  if (!user && !databaseError) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return children;
}
