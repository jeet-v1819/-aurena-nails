"use client";

import React, { useEffect, useState } from "react";
import { Lock, Save, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminSettingsPage() {
  const { user, refreshSession, showToast } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setMobile(user.mobile || "");
    } else {
      refreshSession();
    }
  }, [user, refreshSession]);

  async function handleSaveAdminProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, mobile })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshSession();
        showToast("Admin profile updated.");
      } else {
        showToast(data.error || "Could not update profile.", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmNewPassword,
          confirmNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Unable to update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast("Admin password updated.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Admin Settings
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Update administrator profile details and security credentials.
        </p>
      </div>

      {/* Admin Profile */}
      <form
        onSubmit={handleSaveAdminProfile}
        className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-5"
      >
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-aurena-rosegold" />
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Administrator Profile
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              data-testid="admin-settings-firstName"
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              data-testid="admin-settings-lastName"
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          data-testid="save-admin-profile-btn"
          className="px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savingProfile ? "Saving..." : "Save Profile"}</span>
        </button>
      </form>

      {/* Change Admin Password */}
      <form
        onSubmit={handleChangePassword}
        className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-5"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-aurena-rosegold" />
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Change Admin Password
          </h2>
        </div>

        {passwordError && (
          <p role="alert" className="text-xs text-red-600 font-medium">
            {passwordError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Current Password *
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              New Password *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          data-testid="save-admin-password-btn"
          className="px-6 py-2.5 rounded-full bg-aurena-charcoal text-white text-xs font-medium hover:bg-aurena-rosegold transition flex items-center gap-2"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{savingPassword ? "Updating..." : "Update Password"}</span>
        </button>
      </form>
    </div>
  );
}
