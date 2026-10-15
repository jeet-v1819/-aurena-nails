"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDateDisplay, formatDuration, formatTime12h } from "@/utils/format";

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED"
];

export default function AdminAppointmentsPage() {
  const { showToast } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Manage modal
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [nextStatus, setNextStatus] = useState("CONFIRMED");
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      if (dateFilter) params.set("date", dateFilter);
      params.set("limit", "40");

      const res = await fetch(`/api/admin/appointments?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  function openManageModal(appt) {
    setSelectedAppt(appt);
    setNextStatus(appt.status);
    setNextDate(appt.date);
    setNextTime(appt.time);
    setAdminNotes(appt.adminNotes || "");
    setError("");
  }

  async function handleSaveAppointment(e) {
    e.preventDefault();
    if (!selectedAppt) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/appointments/${selectedAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          date: nextDate,
          time: nextTime,
          adminNotes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to update appointment.");
        return;
      }

      setSelectedAppt(null);
      showToast("Appointment updated and customer notified.");
      await loadAppointments();
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatus(appt, status) {
    const res = await fetch(`/api/admin/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Appointment marked as ${status}.`);
      await loadAppointments();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Could not update status.", "error");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Appointment Management
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Approve, reschedule, complete, or reject studio appointment bookings.
        </p>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              data-testid={`admin-appt-filter-${st}`}
              className={`px-4 py-2 rounded-full text-xs font-medium transition ${
                statusFilter === st
                  ? "bg-aurena-charcoal text-white"
                  : "bg-aurena-beige text-aurena-charcoal hover:bg-aurena-nude"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-aurena-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name, email, mobile, or service..."
              data-testid="admin-appointments-search"
              className="w-full pl-11 pr-4 py-2.5 rounded-full border border-aurena-border bg-aurena-cream text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 rounded-full border border-aurena-border bg-aurena-cream text-xs"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="text-xs text-aurena-rosegold hover:underline"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white border border-aurena-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-aurena-beige/70 text-aurena-muted uppercase tracking-wider border-b border-aurena-border">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Date & Time (IST)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aurena-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-aurena-muted">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length > 0 ? (
                appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    data-testid={`admin-appointment-row-${appt.id}`}
                    className="hover:bg-aurena-cream/60"
                  >
                    <td className="py-4 px-4">
                      <p className="font-semibold text-aurena-charcoal text-sm">
                        {appt.user?.firstName} {appt.user?.lastName}
                      </p>
                      <p className="text-aurena-muted">{appt.user?.email}</p>
                      <p className="text-aurena-muted">{appt.user?.mobile}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-aurena-charcoal">
                        {appt.service?.name}
                      </p>
                      <p className="text-aurena-muted">
                        {formatDuration(appt.service?.duration)}
                      </p>
                      {appt.notes && (
                        <p className="text-[11px] text-aurena-muted italic mt-1 max-w-xs truncate">
                          Note: {appt.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-aurena-charcoal">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-aurena-rosegold" />
                        <span>{formatDateDisplay(appt.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-aurena-muted mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-aurena-rosegold" />
                        <span>{formatTime12h(appt.time)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        data-testid={`admin-appt-status-${appt.id}`}
                        className={`px-2.5 py-1 rounded-full font-semibold ${
                          appt.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700"
                            : appt.status === "COMPLETED"
                            ? "bg-blue-50 text-blue-700"
                            : appt.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {appt.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStatus(appt, "CONFIRMED")
                            }
                            data-testid={`approve-appt-btn-${appt.id}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                          >
                            Confirm
                          </button>
                        )}
                        {(appt.status === "CONFIRMED" ||
                          appt.status === "PENDING") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStatus(appt, "COMPLETED")
                            }
                            data-testid={`complete-appt-btn-${appt.id}`}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openManageModal(appt)}
                          data-testid={`manage-appt-btn-${appt.id}`}
                          className="px-3 py-1.5 rounded-xl border border-aurena-border hover:bg-aurena-beige text-aurena-charcoal font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-aurena-muted">
                    No appointments match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Appointment Modal */}
      {selectedAppt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveAppointment}
            data-testid="admin-manage-appt-modal"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                Manage Appointment
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="text-aurena-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {error}
              </p>
            )}

            <div className="p-3.5 rounded-2xl bg-aurena-cream border border-aurena-border text-xs space-y-1">
              <p className="font-semibold text-aurena-charcoal">
                {selectedAppt.user?.firstName} {selectedAppt.user?.lastName}
              </p>
              <p className="text-aurena-muted">{selectedAppt.service?.name}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Status
              </label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                data-testid="admin-appt-status-select"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Date (IST)
                </label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Time (HH:mm)
                </label>
                <input
                  type="time"
                  value={nextTime}
                  onChange={(e) => setNextTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Admin Notes (Visible to customer)
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                data-testid="admin-appt-notes-input"
                placeholder="Add confirmation details, technician assignment, or rescheduling notes..."
                className="w-full px-3.5 py-2 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="px-4 py-2 rounded-full border border-aurena-border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="save-appt-manage-btn"
                className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : "Update Appointment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
