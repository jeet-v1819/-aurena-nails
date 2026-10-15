import React from "react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-soft text-center space-y-4">
        <span className="text-xs uppercase tracking-[0.2em] text-red-700 font-semibold block">
          403 • Forbidden
        </span>
        <h1 className="font-serif text-3xl text-aurena-charcoal font-bold">
          Administrator Access Required
        </h1>
        <p className="text-xs text-aurena-muted leading-relaxed">
          You do not have permission to view this page. Please sign in with an
          authorized Aurena Nails administrator account.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
