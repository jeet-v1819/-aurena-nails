"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setUser, showToast } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe: true })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid administrator credentials.");
        return;
      }

      setUser(data.user);
      showToast("Signed in to Aurena Nails Admin Portal.");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Network error while signing in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-aurena-charcoal px-4 py-12">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-white border border-aurena-border shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-aurena-rosegold text-white flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Aurena Nails
          </p>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Administrator Login
          </h1>
          <p className="text-xs text-aurena-muted">
            Authorized studio administrators only.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="admin-login-error"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-testid="admin-login-form"
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="admin-identifier"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Administrator Email *
            </label>
            <input
              id="admin-identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="admin@aurenanails.com"
              data-testid="admin-email-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Password *
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                data-testid="admin-password-input"
                className="w-full pl-4 pr-10 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-aurena-muted"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="admin-login-submit-btn"
            className="w-full py-3.5 rounded-full bg-aurena-charcoal text-white text-sm font-medium hover:bg-aurena-rosegold transition disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Sign In to Admin Portal"}
          </button>
        </form>

        <div className="pt-4 border-t border-aurena-border text-center text-xs text-aurena-muted">
          <Link href="/" className="hover:text-aurena-rosegold">
            ← Return to Customer Website
          </Link>
        </div>
      </div>
    </div>
  );
}
