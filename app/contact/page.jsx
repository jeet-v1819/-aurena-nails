"use client";

import React, { useState, useEffect } from "react";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WEEKDAY_NAMES, formatTimeDisplay } from "@/utils/format";

export default function ContactPage() {
  const { user, showToast } = useAuth();

  const [contactInfo, setContactInfo] = useState({});
  const [businessHours, setBusinessHours] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (user) {
      setName((prev) => prev || `${user.firstName || ""} ${user.lastName || ""}`.trim());
      setEmail((prev) => prev || user.email || "");
      setMobile((prev) => prev || user.mobile || "");
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function loadContent() {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        const data = await res.json();
        if (mounted) {
          setContactInfo(data.contact || {});
          setBusinessHours(data.businessHours || []);
        }
      } catch {
        // Ignore network errors
      }
    }
    loadContent();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          mobile,
          subject,
          message
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send your message.");
        return;
      }

      setSuccessMsg(
        data.message ||
          "Thank you for contacting Aurena Nails. Our concierge team will respond shortly."
      );
      showToast("Message sent to Aurena Concierge.");
      setSubject("");
      setMessage("");
    } catch {
      setError("Network error while sending message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          Get in Touch
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-aurena-charcoal">
          Contact Aurena Nails
        </h1>
        <p className="text-sm text-aurena-muted leading-relaxed">
          Have a question about bridal packages, private studio bookings, or
          bespoke nail couture? Reach out to our concierge team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-aurena-border shadow-soft">
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal mb-6">
            Send Us a Message
          </h2>

          {successMsg && (
            <div
              role="status"
              data-testid="contact-success-alert"
              className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"
            >
              {successMsg}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            data-testid="contact-form"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ananya Kapoor"
                  data-testid="contact-name-input"
                  className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
                />
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
                  placeholder="ananya@example.com"
                  data-testid="contact-email-input"
                  className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  data-testid="contact-mobile-input"
                  className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Bridal Nail Art Consultation"
                  data-testid="contact-subject-input"
                  className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-charcoal mb-1.5">
                Message *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your inquiry..."
                data-testid="contact-message-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="contact-submit-btn"
              className="px-8 py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-aurena-charcoal text-aurena-cream rounded-3xl p-6 sm:p-8 space-y-5 shadow-luxury">
            <h2 className="font-serif text-2xl font-bold text-white">
              Studio Information
            </h2>

            <div className="space-y-3 text-sm text-aurena-nude/90">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-aurena-rosegold shrink-0 mt-1" />
                <span>
                  {contactInfo.address ||
                    "2nd Floor, Roseate Promenade, Linking Road, Bandra West, Mumbai 400050"}
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-aurena-rosegold shrink-0" />
                <span>{contactInfo.phone || "+91 98765 43210"}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-aurena-rosegold shrink-0" />
                <span>{contactInfo.email || "concierge@aurenanails.com"}</span>
              </p>
            </div>

            {businessHours.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-aurena-blush">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Opening Hours</span>
                </p>
                <div className="space-y-1 text-xs text-aurena-nude/80">
                  {businessHours.map((bh) => (
                    <div key={bh.weekday} className="flex justify-between">
                      <span>{WEEKDAY_NAMES[bh.weekday]}</span>
                      <span>
                        {bh.closed
                          ? "Closed"
                          : `${formatTimeDisplay(bh.open)} – ${formatTimeDisplay(bh.close)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
