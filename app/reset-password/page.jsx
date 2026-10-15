"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAuth();
  const token = searchParams?.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
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

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Unable to reset password.");
        return;
      }

      setSuccessMsg(
        json?.message ||
          "Your password has been updated. You may now sign in."
      );
      showToast("Password reset successful!", "success");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 sm:py-20">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-soft space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold block">
            Security
          </span>
          <h1 className="font-serif text-3xl text-aurena-charcoal font-bold">
            Choose New Password
          </h1>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-password"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              New Password
            </label>
            <input
              id="reset-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm text-aurena-charcoal"
            />
          </div>

          <div>
            <label
              htmlFor="reset-confirmPassword"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Confirm New Password
            </label>
            <input
              id="reset-confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm text-aurena-charcoal"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !token}
            data-testid="reset-submit-btn"
            className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="pt-4 border-t border-aurena-border text-center text-xs">
          <Link href="/login" className="text-aurena-charcoal hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
