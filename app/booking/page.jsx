"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLoading } from "@/hooks/useLoading";
import {
  formatPriceINR,
  formatDuration,
  formatDateDisplay,
  formatTimeDisplay
} from "@/utils/format";

function getTomorrowISTString() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialServiceId = searchParams.get("serviceId") || "";

  const { user, refreshSession, showToast } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [selectedDate, setSelectedDate] = useState(getTomorrowISTString());
  const [selectedTime, setSelectedTime] = useState("");
  const [note, setNote] = useState("");

  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookedAppointment, setBookedAppointment] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services?limit=50");
        const json = await res.json();
        if (res.ok) {
          const list = json.items || [];
          setServices(list);
          if (!selectedServiceId && list.length > 0) {
            setSelectedServiceId(list[0].id);
          }
        }
      } catch {
        // Ignore network errors
      }
    }
    loadServices();
  }, [selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedDate) return;
    let mounted = true;
    async function loadSlots() {
      setLoadingSlots(true);
      setError("");
      setSelectedTime("");
      try {
        const res = await fetch(
          `/api/appointments/availability?serviceId=${encodeURIComponent(
            selectedServiceId
          )}&date=${encodeURIComponent(selectedDate)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (mounted) {
          if (res.ok) {
            setAvailability(json);
          } else {
            setAvailability(null);
            setError(json.error || "Unable to load time slots.");
          }
        }
      } catch {
        if (mounted) setError("Network error while checking availability.");
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      mounted = false;
    };
  }, [selectedServiceId, selectedDate]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  async function handleConfirmBooking(e) {
    e.preventDefault();
    if (submitting) return;

    setError("");

    let activeUser = user;
    if (!activeUser) {
      activeUser = await refreshSession();
    }
    if (!activeUser) {
      router.push(`/login?redirect=${encodeURIComponent("/booking")}`);
      return;
    }

    if (!selectedServiceId || !selectedDate || !selectedTime) {
      setError("Please select a service, date, and available time slot.");
      return;
    }

    setSubmitting(true);
    showLoading({
      title: "Reserving Appointment",
      message: "Checking studio availability and securing your booking...",
      badge: "Bespoke Reservation"
    });

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date: selectedDate,
          time: selectedTime,
          note
        })
      });

      const data = await res.json();
      if (res.status === 401) {
        showLoading({
          title: "Sign In Required",
          message: "Redirecting to sign-in so we can link your booking...",
          badge: "Client Portal"
        });
        window.location.href = `/login?redirect=${encodeURIComponent("/booking")}`;
        return;
      }

      if (!res.ok) {
        hideLoading();
        setError(data.error || "Unable to book appointment.");
        return;
      }

      hideLoading();
      setBookedAppointment(data.appointment);
      showToast("Appointment booked successfully!");
      await refreshSession();
    } catch {
      hideLoading();
      setError("Network error while booking your appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bookedAppointment) {
    return (
      <div
        data-testid="booking-confirmation-card"
        className="max-w-2xl mx-auto my-12 bg-white rounded-3xl p-8 sm:p-10 border border-aurena-border shadow-luxury text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Booking Submitted
          </p>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            We Look Forward to Welcoming You!
          </h1>
          <p className="text-sm text-aurena-muted">
            Your appointment request has been recorded and a confirmation
            notification has been sent to your account.
          </p>
        </div>

        <div className="bg-aurena-cream rounded-2xl p-6 border border-aurena-border text-left space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-aurena-muted">Service:</span>
            <span className="font-semibold text-aurena-charcoal">
              {bookedAppointment.serviceName ||
                bookedAppointment.service?.name ||
                selectedService?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurena-muted">Date:</span>
            <span className="font-semibold text-aurena-charcoal">
              {formatDateDisplay(bookedAppointment.start || selectedDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurena-muted">Time Slot (IST):</span>
            <span className="font-semibold text-aurena-charcoal">
              {formatTimeDisplay(bookedAppointment.start || selectedTime)} –{" "}
              {formatTimeDisplay(bookedAppointment.end)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurena-muted">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              {bookedAppointment.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/appointments"
            className="px-7 py-3 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition"
          >
            View My Appointments
          </Link>
          <button
            type="button"
            onClick={() => {
              setBookedAppointment(null);
              setSelectedTime("");
              setNote("");
            }}
            className="px-7 py-3 rounded-full border border-aurena-border text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
          >
            Book Another Slot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          Real-Time Studio Calendar (IST)
        </p>
        <h1 className="font-serif text-4xl font-bold text-aurena-charcoal">
          Book Your Nail Appointment
        </h1>
        <p className="text-sm text-aurena-muted">
          Choose your treatment, pick an open slot in Asia/Kolkata time, and
          confirm your visit.
        </p>
      </div>

      <form
        onSubmit={handleConfirmBooking}
        data-testid="booking-form"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-aurena-border shadow-soft space-y-6">
          {error && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Service */}
          <div>
            <label
              htmlFor="booking-service"
              className="block text-xs font-semibold uppercase tracking-wider text-aurena-rosegold mb-2"
            >
              1. Select Nail Service *
            </label>
            <select
              id="booking-service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              data-testid="booking-service-select"
              required
              className="w-full px-4 py-3.5 rounded-2xl border border-aurena-border bg-aurena-cream text-sm text-aurena-charcoal"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} —{" "}
                  {formatPriceINR(s.promotionalPrice ?? s.startingPrice)} (
                  {formatDuration(s.duration)})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Date */}
          <div>
            <label
              htmlFor="booking-date"
              className="block text-xs font-semibold uppercase tracking-wider text-aurena-rosegold mb-2"
            >
              2. Choose Date (IST) *
            </label>
            <input
              id="booking-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="booking-date-input"
              required
              className="w-full sm:w-64 px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm text-aurena-charcoal"
            />
          </div>

          {/* Step 3: Select Available Time Slot */}
          <div>
            <p className="block text-xs font-semibold uppercase tracking-wider text-aurena-rosegold mb-2">
              3. Pick an Available Time Slot *
            </p>
            {loadingSlots ? (
              <div className="py-8 text-xs text-aurena-muted">
                Checking studio availability...
              </div>
            ) : availability &&
              !availability.available &&
              (!availability.slots || availability.slots.length === 0) ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {availability.reason ||
                  "Studio is closed on this date. Please pick another day."}
              </div>
            ) : availability?.slots?.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {availability.slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      data-testid={`slot-btn-${slot.time}`}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-medium border transition ${
                        !slot.available
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-aurena-charcoal text-white border-aurena-charcoal shadow-soft"
                          : "bg-aurena-cream text-aurena-charcoal border-aurena-border hover:border-aurena-rosegold"
                      }`}
                    >
                      {formatTimeDisplay(slot.time)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-aurena-muted">
                No time slots available for this date.
              </p>
            )}
          </div>

          {/* Step 4: Special Note */}
          <div>
            <label
              htmlFor="booking-note"
              className="block text-xs font-semibold uppercase tracking-wider text-aurena-rosegold mb-2"
            >
              4. Design Inspiration or Notes (Optional)
            </label>
            <textarea
              id="booking-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="booking-note-input"
              placeholder="Share nail shape preference, gel removal request, or bridal inspiration..."
              className="w-full px-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm"
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-aurena-border shadow-soft flex flex-col justify-between space-y-6 h-fit">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-aurena-rosegold text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Booking Summary</span>
            </div>

            {selectedService ? (
              <div className="space-y-3">
                <img
                  src={selectedService.mainImage || "/images/gel-nails.jpg"}
                  alt={selectedService.name}
                  className="w-full h-40 object-cover rounded-2xl bg-aurena-beige"
                />
                <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                  {selectedService.name}
                </h2>
                <div className="space-y-1.5 text-xs text-aurena-muted">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-aurena-rosegold" />
                    <span>
                      Duration: {formatDuration(selectedService.duration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-aurena-rosegold" />
                    <span>
                      {selectedDate}{" "}
                      {selectedTime ? `• ${formatTimeDisplay(selectedTime)}` : ""}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-aurena-border flex items-center justify-between">
                  <span className="text-xs text-aurena-muted">
                    Estimated Price
                  </span>
                  <span className="font-serif text-2xl font-bold text-aurena-charcoal">
                    {formatPriceINR(
                      selectedService.promotionalPrice ??
                        selectedService.startingPrice
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-aurena-muted">
                Select a service to view summary.
              </p>
            )}

            {user && (
              <div className="pt-3 border-t border-aurena-border text-xs space-y-1">
                <p className="font-semibold text-aurena-charcoal">
                  Booking as: {user.firstName} {user.lastName}
                </p>
                <p className="text-aurena-muted">{user.email}</p>
                {user.mobile && (
                  <p className="text-aurena-muted">{user.mobile}</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="confirm-booking-btn"
            className="w-full py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition shadow-soft disabled:opacity-50"
          >
            {submitting ? "Confirming Slot..." : "Confirm Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-aurena-muted">
          Loading booking calendar...
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
