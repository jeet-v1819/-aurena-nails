import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSessionAndUser } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const { user } = await getSessionAndUser({ disableCookieCache: true });

  // If a logged-in non-admin customer attempts to visit /admin/*, block on server
  if (user && user.role !== "ADMIN") {
    return (
      <section
        data-testid="admin-forbidden-view"
        className="min-h-screen flex items-center justify-center bg-aurena-cream px-4"
      >
        <div className="max-w-lg w-full p-10 rounded-3xl bg-white border border-aurena-border shadow-luxury text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-600 font-semibold">
            403 • Forbidden
          </p>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Administrator Access Required
          </h1>
          <p className="text-sm text-aurena-muted">
            Your account does not have administrator privileges to access the
            Aurena Nails management portal.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition"
            >
              Return to Customer Website
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <AdminShell adminUser={user}>{children}</AdminShell>;
}
