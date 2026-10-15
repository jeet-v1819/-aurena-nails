"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  formatPriceINR,
  formatDuration,
  formatDateDisplay,
  formatTimeDisplay
} from "@/utils/format";

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, showToast } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/appointments", {
          credentials: "include",
          cache: "no-store"
        });
        if (res.status === 401) {
          router.replace("/login?redirect=/appointments");
          return;
        }
        const data = await res.json();
        if (res.ok && mounted) {
          setAppointments(data.items || data.appointments || []);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Unable to cancel appointment.", "error");
        return;
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? data.appointment : a))
      );
      showToast("Appointment cancelled.");
      setCancelTarget(null);
    } catch {
      showToast("Network error while cancelling appointment.", "error");
    } finally {
      setCancelling(false);
    }
  }

  if (authLoading && loading && !user) {
    return (
      <div className="py-20 text-center text-sm text-aurena-muted">
        Loading your appointments...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Customer Portal
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
            My Appointments
          </h1>
        </div>
        <Link
          href="/booking"
          className="px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition self-start sm:self-auto"
        >
          Book New Appointment
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-aurena-muted">
          Loading your appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-aurena-border space-y-4">
          <p className="font-serif text-2xl font-bold text-aurena-charcoal">
            No Appointments Yet
          </p>
          <p className="text-xs text-aurena-muted max-w-md mx-auto">
            You haven&apos;t scheduled a nail treatment yet. Explore our luxury
            services and book your preferred time slot.
          </p>
          <Link
            href="/booking"
            className="inline-block px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
          >
            Book Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const canCancel =
              appt.status === "PENDING" || appt.status === "CONFIRMED";
            return (
              <div
                key={appt.id}
                data-testid={`appointment-card-${appt.id}`}
                className="bg-white rounded-3xl p-6 border border-aurena-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      data-testid={`appointment-status-${appt.id}`}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                        appt.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : appt.status === "COMPLETED"
                          ? "bg-blue-50 text-blue-700"
                          : appt.status === "CANCELLED" ||
                            appt.status === "REJECTED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {appt.status}
                    </span>
                    <span className="text-xs text-aurena-muted">
                      Ref: #{appt.id.slice(-8)}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
                    {appt.serviceName || appt.service?.name || "Nail Treatment"}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-aurena-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-aurena-rosegold" />
                      {formatDateDisplay(appt.start)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-aurena-rosegold" />
                      {formatTimeDisplay(appt.start)} –{" "}
                      {formatTimeDisplay(appt.end)}
                      {appt.service?.duration
                        ? ` (${formatDuration(appt.service.duration)})`
                        : ""}
                    </span>
                    {appt.service && (
                      <span className="font-semibold text-aurena-charcoal">
                        {formatPriceINR(
                          appt.service.promotionalPrice ??
                            appt.service.startingPrice
                        )}
                      </span>
                    )}
                  </div>

                  {appt.note && (
                    <p className="text-xs text-aurena-muted italic">
                      Note: &ldquo;{appt.note}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(appt)}
                      data-testid={`cancel-appointment-btn-${appt.id}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        open={Boolean(cancelTarget)}
        title="Cancel Appointment"
        message={
          cancelTarget
            ? `Are you sure you want to cancel your ${
                cancelTarget.serviceName ||
                cancelTarget.service?.name ||
                "nail"
              } appointment on ${formatDateDisplay(
                cancelTarget.start
              )} at ${formatTimeDisplay(cancelTarget.start)}?`
            : ""
        }
        confirmLabel="Yes, Cancel Appointment"
        cancelLabel="Keep Appointment"
        variant="danger"
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
