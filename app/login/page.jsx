"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLoading } from "@/hooks/useLoading";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, showToast } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    showLoading({
      title: "Signing You In",
      message: "Verifying your details with Aurena studio...",
      badge: "Client Portal"
    });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password, rememberMe })
      });

      const data = await res.json();
      if (!res.ok) {
        hideLoading();
        setError(data.error || "Invalid email/mobile number or password.");
        return;
      }

      const loggedInUser = data.user || data.data?.user || null;
      if (!loggedInUser) {
        hideLoading();
        setError("Sign-in did not establish a valid session. Please try again.");
        return;
      }
      setUser(loggedInUser);
      showToast(`Welcome back, ${loggedInUser.firstName || "Guest"}!`);

      const redirectParam = searchParams?.get("redirect");
      let destination = "/profile";
      if (redirectParam && redirectParam.startsWith("/")) {
        destination = redirectParam;
      } else if (loggedInUser?.role === "ADMIN") {
        destination = "/admin/dashboard";
      }

      showLoading({
        title: "Welcome Back",
        message: destination === "/admin/dashboard"
          ? "Redirecting to Studio Control Center..."
          : "Redirecting to your bespoke profile...",
        badge: "Sign In Successful"
      });

      window.location.href = destination;
    } catch {
      hideLoading();
      setError("Network error while signing in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-soft space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Client Portal
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal">
            Sign In
          </h1>
          <p className="text-xs text-aurena-muted">
            Sign in with your email address or 10-digit Indian mobile number.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="login-error"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-testid="login-form"
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
              Email or Mobile Number *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 9876543210"
              data-testid="login-identifier-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-aurena-charcoal">
                Password *
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-aurena-rosegold hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
                className="w-full pl-4 pr-10 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
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

          <div className="flex items-center justify-between text-xs text-aurena-muted">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-aurena-border text-aurena-rosegold"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit-btn"
            className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
          >
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="pt-4 border-t border-aurena-border text-center text-xs text-aurena-muted">
          Don’t have an account?{" "}
          <Link
            href="/register"
            className="text-aurena-rosegold font-semibold hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
