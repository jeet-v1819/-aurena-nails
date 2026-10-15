"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarOff, Clock, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WEEKDAY_NAMES, formatDateDisplay } from "@/utils/format";

export default function AdminBusinessHoursPage() {
  const { showToast } = useAuth();
  const [businessHours, setBusinessHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);

  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [addingHoliday, setAddingHoliday] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/business-hours", {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessHours(data.businessHours || []);
        setHolidays(data.holidays || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateHourRow(weekday, field, value) {
    setBusinessHours((prev) =>
      prev.map((row) =>
        row.weekday === weekday ? { ...row, [field]: value } : row
      )
    );
  }

  async function handleSaveHours() {
    setSavingHours(true);
    try {
      const res = await fetch("/api/admin/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHours })
      });
      const data = await res.json();
      if (res.ok) {
        setBusinessHours(data.businessHours || businessHours);
        showToast("Business hours updated.");
      } else {
        showToast(data.error || "Unable to update hours.", "error");
      }
    } finally {
      setSavingHours(false);
    }
  }

  async function handleAddHoliday(e) {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;
    setAddingHoliday(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newHolidayDate,
          name: newHolidayName,
          description: newHolidayName,
          active: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHolidays((prev) => [...prev, data.holiday]);
        setNewHolidayDate("");
        setNewHolidayName("");
        showToast("Holiday added.");
      } else {
        showToast(data.error || "Unable to add holiday.", "error");
      }
    } finally {
      setAddingHoliday(false);
    }
  }

  async function handleRemoveHoliday(id) {
    const res = await fetch(`/api/admin/holidays/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      showToast("Holiday removed.");
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Business Hours & Holidays
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Configure weekly salon hours and holiday closures enforced during
          appointment booking.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-aurena-rosegold" />
            <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
              Weekly Salon Schedule (IST)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSaveHours}
            disabled={savingHours}
            data-testid="save-business-hours-btn"
            className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingHours ? "Saving..." : "Save Hours"}</span>
          </button>
        </div>

        <div className="divide-y divide-aurena-border/60">
          {loading ? (
            <p className="py-6 text-xs text-aurena-muted">Loading schedule...</p>
          ) : (
            businessHours.map((row) => (
              <div
                key={row.weekday}
                data-testid={`business-hour-row-${row.weekday}`}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="w-36 font-semibold text-aurena-charcoal">
                  {WEEKDAY_NAMES[row.weekday]}
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!row.closed}
                    onChange={(e) =>
                      updateHourRow(row.weekday, "closed", !e.target.checked)
                    }
                  />
                  <span>{row.closed ? "Closed" : "Open"}</span>
                </label>

                {!row.closed ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={row.open}
                      onChange={(e) =>
                        updateHourRow(row.weekday, "open", e.target.value)
                      }
                      className="px-3 py-1.5 rounded-xl border border-aurena-border"
                    />
                    <span className="text-aurena-muted">to</span>
                    <input
                      type="time"
                      value={row.close}
                      onChange={(e) =>
                        updateHourRow(row.weekday, "close", e.target.value)
                      }
                      className="px-3 py-1.5 rounded-xl border border-aurena-border"
                    />
                  </div>
                ) : (
                  <span className="text-red-600 font-medium">
                    Closed All Day
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Holidays */}
      <div
        id="holidays"
        className="p-6 sm:p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-5"
      >
        <div className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-aurena-rosegold" />
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Studio Holidays & Special Closures
          </h2>
        </div>

        <form
          onSubmit={handleAddHoliday}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <input
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            required
            data-testid="holiday-date-input"
            className="px-3.5 py-2.5 rounded-xl border border-aurena-border text-xs"
          />
          <input
            type="text"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            required
            placeholder="Holiday Name (e.g., Diwali Studio Closure)"
            data-testid="holiday-reason-input"
            className="px-3.5 py-2.5 rounded-xl border border-aurena-border text-xs"
          />
          <button
            type="submit"
            disabled={addingHoliday}
            data-testid="add-holiday-btn"
            className="px-5 py-2.5 rounded-full bg-aurena-charcoal text-white text-xs font-medium hover:bg-aurena-rosegold transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Holiday</span>
          </button>
        </form>

        <div className="divide-y divide-aurena-border/60">
          {holidays.length > 0 ? (
            holidays.map((h) => (
              <div
                key={h.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-aurena-charcoal">
                    {formatDateDisplay(h.date)}
                  </span>
                  {h.name && (
                    <span className="text-aurena-muted ml-2">— {h.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveHoliday(h.id)}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-aurena-muted">
              No upcoming holidays configured.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
