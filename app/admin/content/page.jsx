"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const INITIAL_CONTENT_STATE = {
  home: {
    title: "Beautiful Nails. Beautiful You.",
    description:
      "Thoughtfully crafted nail art. A little luxury, just for you.",
    announcement: ""
  },
  contact: {
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    email: "concierge@aurenanails.com",
    address:
      "2nd Floor, Roseate Promenade, Linking Road, Bandra West, Mumbai 400050"
  }
};

export default function AdminContentPage() {
  const { showToast } = useAuth();
  const [content, setContent] = useState(INITIAL_CONTENT_STATE);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const payload = d?.content || d;
        if (payload && typeof payload === "object") {
          setContent((prev) => ({
            ...prev,
            ...payload,
            home: { ...prev.home, ...(payload.home || {}) },
            contact: { ...prev.contact, ...(payload.contact || {}) }
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSection(section) {
    setSavingSection(section);
    setSavedNotice("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: section,
          value: content?.[section] || {}
        })
      });
      if (res.ok) {
        const msg = `Updated ${section} content.`;
        setSavedNotice(msg);
        showToast(msg);
      } else {
        showToast("Failed to update content.", "error");
      }
    } finally {
      setSavingSection(null);
    }
  }

  function updateField(section, key, val) {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [key]: val
      }
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-44 rounded-3xl bg-aurena-beige animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Website Content Management
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Edit homepage hero copy, brand story, contact details, WhatsApp
          concierge, and SEO metadata.
        </p>
      </div>

      {savedNotice && (
        <div
          role="status"
          data-testid="content-saved-banner"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Homepage Hero Section
          </h2>
          <button
            type="button"
            onClick={() => handleSaveSection("home")}
            disabled={savingSection === "home"}
            data-testid="save-hero-content-btn"
            className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSection === "home" ? "Saving..." : "Save Hero"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Hero Title
            </label>
            <input
              type="text"
              value={content.home?.title || ""}
              onChange={(e) => updateField("home", "title", e.target.value)}
              data-testid="hero-title-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Announcement Text
            </label>
            <input
              type="text"
              value={content.home?.announcement || ""}
              onChange={(e) =>
                updateField("home", "announcement", e.target.value)
              }
              data-testid="announcement-text-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-aurena-muted mb-1">
            Hero Subtitle
          </label>
          <textarea
            rows={2}
            value={content.home?.description || ""}
            onChange={(e) => updateField("home", "description", e.target.value)}
            data-testid="hero-subtitle-input"
            className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
          />
        </div>
      </div>

      {/* Contact & WhatsApp Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Studio Contact & WhatsApp Details
          </h2>
          <button
            type="button"
            onClick={() => handleSaveSection("contact")}
            disabled={savingSection === "contact"}
            data-testid="save-contact-content-btn"
            className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {savingSection === "contact" ? "Saving..." : "Save Contact"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={content.contact?.phone || ""}
              onChange={(e) => updateField("contact", "phone", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              WhatsApp Number (Country code + digits)
            </label>
            <input
              type="text"
              value={content.contact?.whatsapp || ""}
              onChange={(e) =>
                updateField("contact", "whatsapp", e.target.value)
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Concierge Email
            </label>
            <input
              type="email"
              value={content.contact?.email || ""}
              onChange={(e) => updateField("contact", "email", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aurena-muted mb-1">
              Studio Address
            </label>
            <input
              type="text"
              value={content.contact?.address || ""}
              onChange={(e) =>
                updateField("contact", "address", e.target.value)
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
