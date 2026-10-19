import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getSessionAndUser } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-aurena-pathname") || "";
  const isLoginRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  // The login screen lives under /admin but must render outside the admin
  // shell (and without an authenticated session).
  if (isLoginRoute) {
    return children;
  }

  const { user, databaseError } = await getSessionAndUser({
    disableCookieCache: true
  });

  if (databaseError) {
    return (
      <section
        data-testid="admin-unavailable-view"
        className="min-h-screen flex items-center justify-center bg-aurena-cream px-4"
      >
        <div className="max-w-lg w-full p-10 rounded-3xl bg-white border border-aurena-border shadow-luxury text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Admin Portal Temporarily Unavailable
          </h1>
          <p className="text-sm text-aurena-muted">
            We could not verify your session against the database. Please try
            again in a moment.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-block px-6 py-3 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition"
          >
            Retry
          </Link>
        </div>
      </section>
    );
  }

  if (!user) {
    redirect(
      `/admin/login?redirect=${encodeURIComponent(pathname || "/admin/dashboard")}`
    );
  }

  // If a logged-in non-admin customer attempts to visit /admin/*, deny the
  // request. Rendering the admin shell would be a privilege leak, and returning
  // a 200 page for a forbidden route makes automated smoke checks unable to
  // distinguish "denied" from "allowed". Redirecting to /forbidden (the same
  // page the dashboard already used) yields a proper non-2xx response and
  // keeps the customer portal untouched.
  if (user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  return <AdminShell adminUser={user}>{children}</AdminShell>;
}
