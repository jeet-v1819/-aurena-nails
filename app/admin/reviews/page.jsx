"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Star, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatDateDisplay } from "@/utils/format";

export default function AdminReviewsPage() {
  const { showToast } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("approved", filter);
      params.set("limit", "40");
      const res = await fetch(`/api/admin/reviews?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function handleToggleApproved(review, approved) {
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved })
    });
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, approved } : r))
      );
      showToast(approved ? "Review approved." : "Review hidden.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        showToast("Review deleted.");
      }
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Review Management
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            Moderate verified customer service reviews and testimonials.
          </p>
        </div>

        <div className="flex gap-2">
          {[
            { id: "all", label: "All Reviews" },
            { id: "true", label: "Approved" },
            { id: "false", label: "Hidden / Pending" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium ${
                filter === tab.id
                  ? "bg-aurena-charcoal text-white"
                  : "bg-white border border-aurena-border text-aurena-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl bg-aurena-beige animate-pulse" />
          ))
        ) : reviews.length > 0 ? (
          reviews.map((rev) => (
            <div
              key={rev.id}
              data-testid={`admin-review-card-${rev.id}`}
              className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-0.5 text-aurena-gold">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold text-sm text-aurena-charcoal">
                    {rev.user?.firstName} {rev.user?.lastName}
                  </span>
                  <span className="text-xs text-aurena-muted">
                    on{" "}
                    <strong className="text-aurena-charcoal">
                      {rev.service?.name}
                    </strong>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      rev.approved
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {rev.approved ? "Approved" : "Hidden"}
                  </span>
                </div>
                <p className="text-sm text-aurena-charcoal leading-relaxed">
                  “{rev.comment}”
                </p>
                <p className="text-[11px] text-aurena-muted">
                  Submitted {formatDateDisplay(rev.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {rev.approved ? (
                  <button
                    type="button"
                    onClick={() => handleToggleApproved(rev, false)}
                    data-testid={`hide-review-btn-${rev.id}`}
                    className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100"
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleApproved(rev, true)}
                    data-testid={`approve-review-btn-${rev.id}`}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(rev)}
                  data-testid={`delete-review-btn-${rev.id}`}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 rounded-3xl bg-white border border-aurena-border text-center text-sm text-aurena-muted">
            No customer reviews found.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Customer Review"
        message="Are you sure you want to permanently delete this customer review?"
        confirmLabel="Delete Review"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
