"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, showToast } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobile,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to complete registration.");
        return;
      }

      const registeredUser = data.user || data.data?.user || null;
      setUser(registeredUser);
      showToast(
        `Welcome to Aurena Nails, ${registeredUser?.firstName || "Guest"}!`
      );

      const redirectParam = searchParams?.get("redirect");
      const destination =
        redirectParam && redirectParam.startsWith("/")
          ? redirectParam
          : "/profile";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Network error while creating account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-soft space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Client Registration
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal">
            Create Your Account
          </h1>
          <p className="text-xs text-aurena-muted">
            Book appointments, save your favourite nail art, and manage your
            studio visits.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-testid="register-form"
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Meera"
                data-testid="register-firstName-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Deshmukh"
                data-testid="register-lastName-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="meera@example.com"
              data-testid="register-email-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="9820123456"
              data-testid="register-mobile-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="register-password-input"
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

            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="register-confirmPassword-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="register-submit-btn"
            className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="pt-4 border-t border-aurena-border text-center text-xs text-aurena-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-aurena-rosegold font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
