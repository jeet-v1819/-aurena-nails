"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Save, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import MediaUploader from "@/components/ui/MediaUploader";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    setUser,
    refreshSession,
    showToast
  } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [image, setImage] = useState(user?.image || "");
  const hasEditedRef = React.useRef(false);

  const [loadingProfile, setLoadingProfile] = useState(!user);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user && !hasEditedRef.current) {
      setFirstName((prev) => prev || user.firstName || "");
      setLastName((prev) => prev || user.lastName || "");
      setEmail((prev) => prev || user.email || "");
      setMobile((prev) => prev || user.mobile || "");
      setImage((prev) => prev || user.image || "");
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store"
        });
        if (res.status === 401) {
          router.replace("/login?redirect=/profile");
          return;
        }
        const data = await res.json();
        if (res.ok && mounted && data.user && !hasEditedRef.current) {
          setFirstName(data.user.firstName || "");
          setLastName(data.user.lastName || "");
          setEmail(data.user.email || "");
          setMobile(data.user.mobile || "");
          setImage(data.user.image || "");
        }
      } catch {
        // Ignore network errors
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobile,
          image: image || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Unable to update profile.");
        return;
      }

      if (data.user) {
        setUser(data.user);
      } else {
        await refreshSession();
      }
      setProfileSuccess(data.message || "Profile updated successfully.");
      showToast("Profile updated successfully.");
    } catch {
      setProfileError("Network error while updating profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setSavingPassword(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Unable to update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        data.message || "Your password has been updated successfully."
      );
      showToast("Password changed.");
    } catch {
      setPasswordError("Network error while updating password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (authLoading && loadingProfile && !user) {
    return (
      <div className="py-20 text-center text-sm text-aurena-muted">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          Account Settings
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
          My Profile
        </h1>
      </div>

      {/* Profile Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-aurena-border shadow-soft space-y-5"
      >
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-aurena-rosegold" />
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Personal Details
          </h2>
        </div>

        {profileSuccess && (
          <div
            role="status"
            data-testid="profile-success-alert"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"
          >
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {profileError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-firstName"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              First Name *
            </label>
            <input
              id="profile-firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => {
                hasEditedRef.current = true;
                setFirstName(e.target.value);
              }}
              data-testid="profile-firstName-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-lastName"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Last Name *
            </label>
            <input
              id="profile-lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => {
                hasEditedRef.current = true;
                setLastName(e.target.value);
              }}
              data-testid="profile-lastName-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Email Address *
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                hasEditedRef.current = true;
                setEmail(e.target.value);
              }}
              data-testid="profile-email-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-mobile"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Mobile Number *
            </label>
            <input
              id="profile-mobile"
              type="tel"
              required
              value={mobile}
              onChange={(e) => {
                hasEditedRef.current = true;
                setMobile(e.target.value);
              }}
              data-testid="profile-mobile-input"
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>
        </div>

        <MediaUploader
          label="Profile Picture (Optional)"
          value={image}
          onChange={(uploaded) =>
            setImage(
              typeof uploaded === "string" ? uploaded : uploaded?.url || ""
            )
          }
          resourceType="image"
          folder="aurena-nails/avatars"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            data-testid="profile-save-btn"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-aurena-border shadow-soft space-y-5"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-aurena-rosegold" />
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Change Password
          </h2>
        </div>

        {passwordSuccess && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"
          >
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {passwordError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="profile-current-password"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Current Password *
            </label>
            <input
              id="profile-current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-new-password"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              New Password *
            </label>
            <input
              id="profile-new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-confirm-password"
              className="block text-xs font-medium text-aurena-charcoal mb-1.5"
            >
              Confirm New Password *
            </label>
            <input
              id="profile-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="px-7 py-3 rounded-full bg-aurena-charcoal text-white text-xs font-medium hover:bg-aurena-rosegold transition disabled:opacity-50"
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
