"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatDateDisplay } from "@/utils/format";

export default function AdminCustomersPage() {
  const { showToast } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit customer modal state
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Confirm status toggle / soft-delete modal
  const [confirmAction, setConfirmAction] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.items || []);
        setTotalPages(data.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 150);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setEditFirstName(customer.firstName || "");
    setEditLastName(customer.lastName || "");
    setEditEmail(customer.email || "");
    setEditMobile(customer.mobile || "");
    setEditError("");
  }

  async function handleSaveCustomerEdit(e) {
    e.preventDefault();
    if (!editingCustomer) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          mobile: editMobile
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Unable to update customer.");
        return;
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id ? { ...c, ...data.customer } : c
        )
      );
      setEditingCustomer(null);
      showToast("Customer profile updated.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExecuteConfirmAction() {
    if (!confirmAction) return;
    setSaving(true);
    try {
      const { customer, type } = confirmAction;
      if (type === "softDelete") {
        const res = await fetch(`/api/admin/customers/${customer.id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
          showToast("Customer archived.", "info");
        }
      } else {
        const nextActive = type === "activate";
        const res = await fetch(`/api/admin/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: nextActive })
        });
        const data = await res.json();
        if (res.ok) {
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === customer.id ? { ...c, active: data.customer.active } : c
            )
          );
          showToast(
            nextActive
              ? "Customer account activated."
              : "Customer account deactivated."
          );
        }
      }
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Customer Management
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Search, view, update, activate, or deactivate customer accounts.
        </p>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-3xl bg-white border border-aurena-border shadow-soft flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-aurena-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or mobile number..."
            aria-label="Search customers"
            data-testid="admin-customers-search"
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-aurena-border bg-aurena-cream text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "active", "inactive"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              data-testid={`admin-customers-filter-${st}`}
              className={`px-4 py-2 rounded-full text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? "bg-aurena-charcoal text-white"
                  : "bg-aurena-beige text-aurena-charcoal"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-3xl bg-white border border-aurena-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-aurena-beige/70 text-aurena-muted uppercase tracking-wider border-b border-aurena-border">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined / Last Login</th>
                <th className="py-3.5 px-4">Bookings</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aurena-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-aurena-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`admin-customer-row-${c.id}`}
                    className="hover:bg-aurena-cream/60"
                  >
                    <td className="py-4 px-4">
                      <p className="font-semibold text-aurena-charcoal text-sm">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-aurena-muted">{c.email}</p>
                    </td>
                    <td className="py-4 px-4 font-medium text-aurena-charcoal">
                      {c.mobile || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        data-testid={`customer-status-badge-${c.id}`}
                        className={`px-2.5 py-1 rounded-full font-semibold ${
                          c.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-aurena-muted">
                      <p>Reg: {formatDateDisplay(c.createdAt)}</p>
                      {c.lastLoginAt && (
                        <p className="text-[11px]">
                          Last: {formatDateDisplay(c.lastLoginAt)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 font-medium text-aurena-charcoal">
                      {c.appointmentsCount || 0}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          aria-label={`Edit ${c.firstName}`}
                          data-testid={`edit-customer-btn-${c.id}`}
                          className="p-2 rounded-xl border border-aurena-border hover:bg-aurena-beige text-aurena-charcoal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              customer: c,
                              type: c.active ? "deactivate" : "activate"
                            })
                          }
                          aria-label={
                            c.active
                              ? `Deactivate ${c.firstName}`
                              : `Activate ${c.firstName}`
                          }
                          data-testid={`toggle-customer-active-btn-${c.id}`}
                          className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 ${
                            c.active
                              ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {c.active ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              customer: c,
                              type: "softDelete"
                            })
                          }
                          aria-label={`Archive ${c.firstName}`}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-aurena-muted">
                    No customers match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-full border border-aurena-border text-xs font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-aurena-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-full border border-aurena-border text-xs font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Customer Profile"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveCustomerEdit}
            data-testid="admin-edit-customer-modal"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                Edit Customer Profile
              </h2>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-aurena-muted hover:text-aurena-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {editError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  data-testid="admin-edit-customer-firstName"
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                  data-testid="admin-edit-customer-lastName"
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-full border border-aurena-border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="admin-save-customer-btn"
                className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === "softDelete"
            ? "Archive Customer Account"
            : confirmAction?.type === "deactivate"
            ? "Deactivate Customer Account"
            : "Activate Customer Account"
        }
        message={
          confirmAction
            ? confirmAction.type === "softDelete"
              ? `Are you sure you want to archive ${confirmAction.customer.firstName} ${confirmAction.customer.lastName}?`
              : confirmAction.type === "deactivate"
              ? `Deactivating ${confirmAction.customer.firstName} will immediately block access to protected customer features.`
              : `Re-activate ${confirmAction.customer.firstName}'s account?`
            : ""
        }
        confirmLabel={
          confirmAction?.type === "activate" ? "Activate Account" : "Confirm"
        }
        variant={confirmAction?.type === "activate" ? "primary" : "danger"}
        loading={saving}
        onConfirm={handleExecuteConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
