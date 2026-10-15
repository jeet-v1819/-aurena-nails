"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ForgotAndResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleRequestReset(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to process password recovery request.");
        return;
      }
      setSuccessMsg(
        data.message ||
          "If an account with that email address exists, password recovery instructions have been sent."
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReset(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to reset password.");
        return;
      }
      setSuccessMsg(
        data.message ||
          "Your password has been reset successfully. You may now sign in."
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-soft space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Account Recovery
          </p>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            {token ? "Reset Your Password" : "Forgot Password"}
          </h1>
          <p className="text-xs text-aurena-muted">
            {token
              ? "Enter your new password below."
              : "Enter your registered email address to receive password recovery instructions."}
          </p>
        </div>

        {successMsg && (
          <div
            role="status"
            data-testid="forgot-password-success"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"
          >
            {successMsg}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {token ? (
          <form
            onSubmit={handleConfirmReset}
            data-testid="reset-password-form"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                New Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="reset-password-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="reset-confirm-password-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="reset-password-submit-btn"
              className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="forgot-email-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="forgot-submit-btn"
              className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Recovery Instructions"}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-aurena-border text-center text-xs text-aurena-muted">
          <Link href="/login" className="text-aurena-rosegold hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading...</div>}>
      <ForgotAndResetContent />
    </Suspense>
  );
}
