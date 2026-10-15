"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Edit3,
  Expand,
  Heart,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Lightbox from "@/components/ui/Lightbox";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ServiceCard from "@/components/customer/ServiceCard";
import {
  formatDateDisplay,
  formatDuration,
  formatPriceINR
} from "@/utils/format";

export default function ServiceDetailClient({ initialService }) {
  const { user, isServiceWishlisted, toggleWishlist, showToast } = useAuth();
  const [service, setService] = useState(initialService);
  const [reviews, setReviews] = useState(initialService.reviews || []);
  const [eligibleAppointments, setEligibleAppointments] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Review form state
  const [selectedApptId, setSelectedApptId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Edit / delete review state
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const wishlisted = isServiceWishlisted(service.id);

  const allImages = [
    {
      url: service.mainImage || "/images/gel-nails.jpg",
      title: service.name,
      alt: service.name
    },
    ...(service.images || []).map((img) => ({
      url: img.url,
      title: service.name,
      alt: img.alt || service.name
    }))
  ];

  useEffect(() => {
    async function loadReviewsAndEligibility() {
      try {
        const res = await fetch(
          `/api/reviews?serviceId=${encodeURIComponent(service.id)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setReviews(data.items || []);
          const eligible = data.eligibleAppointments || [];
          setEligibleAppointments(eligible);
          if (eligible.length > 0) {
            setSelectedApptId(eligible[0].id);
          }
        }
      } catch {
        // Ignore
      }
    }
    loadReviewsAndEligibility();
  }, [service.id, user]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewError("");
    setSubmittingReview(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: selectedApptId,
          serviceId: service.id,
          rating: Number(rating),
          comment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Unable to submit review.");
        return;
      }

      setReviews((prev) => [data.review, ...prev]);
      const remaining = eligibleAppointments.filter((a) => a.id !== selectedApptId);
      setEligibleAppointments(remaining);
      setSelectedApptId(remaining[0]?.id || "");
      setComment("");
      setRating(5);
      showToast("Your review has been published!");
    } catch {
      setReviewError("Network error while submitting review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleSaveEditReview(reviewId) {
    setSubmittingReview(true);
    setReviewError("");
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: Number(editRating),
          comment: editComment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Unable to update review.");
        return;
      }
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? data.review : r))
      );
      setEditingReviewId(null);
      showToast("Review updated successfully.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleConfirmDeleteReview() {
    if (!deletingReviewId) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/reviews/${deletingReviewId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== deletingReviewId));
        showToast("Review deleted.", "info");
      }
    } finally {
      setSubmittingReview(false);
      setDeletingReviewId(null);
    }
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : service.averageRating || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-aurena-muted flex items-center gap-2">
        <Link href="/" className="hover:text-aurena-rosegold">
          Home
        </Link>
        <span>/</span>
        <Link href="/services" className="hover:text-aurena-rosegold">
          Services
        </Link>
        <span>/</span>
        <span className="text-aurena-charcoal font-medium">{service.name}</span>
      </nav>

      {/* Main Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Images */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onClick={() => {
              setLightboxIndex(0);
              setLightboxOpen(true);
            }}
            className="relative rounded-3xl overflow-hidden border border-aurena-border bg-aurena-beige aspect-[4/3] cursor-pointer group"
          >
            <img
              src={allImages[0].url}
              alt={allImages[0].alt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(0);
                setLightboxOpen(true);
              }}
              aria-label="Open image in lightbox"
              data-testid="open-service-lightbox"
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-full bg-white/90 text-xs font-medium text-aurena-charcoal flex items-center gap-1.5 shadow-soft hover:bg-aurena-charcoal hover:text-white transition"
            >
              <Expand className="w-3.5 h-3.5" />
              <span>View Fullscreen</span>
            </button>
          </div>

          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                  className="rounded-2xl overflow-hidden border border-aurena-border h-20 bg-aurena-beige hover:border-aurena-rosegold transition"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Service Details */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {service.category?.name && (
              <span className="px-3.5 py-1 rounded-full bg-aurena-blush/50 text-xs font-semibold text-aurena-rosegold">
                {service.category.name}
              </span>
            )}
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-medium ${
                service.available
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {service.available ? "Available for Booking" : "Temporarily Unavailable"}
            </span>
            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <Star className="w-3.5 h-3.5 fill-current" />
                {avgRating} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal">
            {service.name}
          </h1>

          <p className="text-base text-aurena-muted leading-relaxed">
            {service.description}
          </p>

          {/* Informational Price & Duration Card */}
          <div className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft grid grid-cols-2 gap-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-aurena-muted block">
                Starting Rate (Informational)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl font-bold text-aurena-charcoal">
                  {formatPriceINR(service.promotionalPrice ?? service.startingPrice)}
                </span>
                {service.regularPrice &&
                  Number(service.regularPrice) >
                    Number(service.promotionalPrice ?? service.startingPrice) && (
                    <span className="text-sm text-aurena-muted line-through">
                      {formatPriceINR(service.regularPrice)}
                    </span>
                  )}
              </div>
              <span className="text-[11px] text-aurena-muted block mt-1">
                Paid in-studio after your consultation
              </span>
            </div>

            <div className="border-l border-aurena-border pl-6 flex flex-col justify-center">
              <span className="text-xs uppercase tracking-wider text-aurena-muted block">
                Estimated Duration
              </span>
              <span className="font-serif text-2xl font-semibold text-aurena-charcoal flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-aurena-rosegold" />
                {formatDuration(service.duration)}
              </span>
            </div>
          </div>

          {/* Metadata attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {service.nailType && (
              <div className="p-3 rounded-2xl bg-aurena-beige/60 border border-aurena-border">
                <span className="text-aurena-muted block">Nail Type</span>
                <span className="font-semibold text-aurena-charcoal">
                  {service.nailType}
                </span>
              </div>
            )}
            {service.style && (
              <div className="p-3 rounded-2xl bg-aurena-beige/60 border border-aurena-border">
                <span className="text-aurena-muted block">Style</span>
                <span className="font-semibold text-aurena-charcoal">
                  {service.style}
                </span>
              </div>
            )}
            {service.occasion && (
              <div className="p-3 rounded-2xl bg-aurena-beige/60 border border-aurena-border">
                <span className="text-aurena-muted block">Occasion</span>
                <span className="font-semibold text-aurena-charcoal">
                  {service.occasion}
                </span>
              </div>
            )}
            {service.difficulty && (
              <div className="p-3 rounded-2xl bg-aurena-beige/60 border border-aurena-border">
                <span className="text-aurena-muted block">Artistry Tier</span>
                <span className="font-semibold text-aurena-charcoal">
                  {service.difficulty}
                </span>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {service.available ? (
              <Link
                href={`/booking?serviceId=${encodeURIComponent(service.id)}`}
                data-testid="service-book-cta"
                className="flex-1 sm:flex-initial px-8 py-4 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition shadow-luxury flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="px-8 py-4 rounded-full bg-gray-200 text-gray-500 text-sm font-medium cursor-not-allowed"
              >
                Currently Unavailable
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleWishlist({ serviceId: service.id })}
              data-testid="service-detail-wishlist-btn"
              className={`px-6 py-4 rounded-full border text-sm font-medium flex items-center gap-2 transition ${
                wishlisted
                  ? "bg-aurena-blush/50 border-aurena-rosegold text-aurena-rosegold"
                  : "border-aurena-border text-aurena-charcoal hover:border-aurena-rosegold"
              }`}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
              <span>{wishlisted ? "Saved in Wishlist" : "Save to Wishlist"}</span>
            </button>
          </div>

          {/* Care Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {service.preparation && (
              <div className="p-5 rounded-2xl bg-white border border-aurena-border space-y-1.5">
                <h3 className="font-serif text-base font-semibold text-aurena-charcoal">
                  Preparation Instructions
                </h3>
                <p className="text-xs text-aurena-muted leading-relaxed">
                  {service.preparation}
                </p>
              </div>
            )}
            {service.aftercare && (
              <div className="p-5 rounded-2xl bg-white border border-aurena-border space-y-1.5">
                <h3 className="font-serif text-base font-semibold text-aurena-charcoal">
                  After-Care Ritual
                </h3>
                <p className="text-xs text-aurena-muted leading-relaxed">
                  {service.aftercare}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Associated Videos */}
      {service.associatedVideos?.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            Service Process Videos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {service.associatedVideos.map((vid) => (
              <div
                key={vid.id}
                className="p-4 rounded-3xl bg-white border border-aurena-border space-y-3"
              >
                <video
                  src={vid.url}
                  poster={vid.thumbnail || "/images/hero-nails.jpg"}
                  controls
                  className="w-full h-64 object-cover rounded-2xl bg-black"
                />
                <h3 className="font-serif text-lg font-semibold text-aurena-charcoal">
                  {vid.title}
                </h3>
                {vid.description && (
                  <p className="text-xs text-aurena-muted">{vid.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews & Ratings Section */}
      <section className="space-y-8 pt-8 border-t border-aurena-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
              Verified Reviews
            </p>
            <h2 className="font-serif text-3xl font-bold text-aurena-charcoal">
              Client Ratings & Feedback
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-current" />
            <span className="font-serif text-2xl font-bold text-aurena-charcoal">
              {avgRating}
            </span>
            <span className="text-xs text-aurena-muted">
              ({reviews.length} verified review{reviews.length === 1 ? "" : "s"})
            </span>
          </div>
        </div>

        {/* Review Submission Form for Eligible Completed Appointments */}
        {user && eligibleAppointments.length > 0 && (
          <form
            onSubmit={handleSubmitReview}
            data-testid="service-review-form"
            className="p-6 rounded-3xl bg-white border border-aurena-rosegold/40 shadow-soft space-y-4 max-w-2xl"
          >
            <div className="flex items-center gap-2 text-aurena-rosegold text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Share Your Completed Appointment Experience</span>
            </div>

            {eligibleAppointments.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Completed Appointment
                </label>
                <select
                  value={selectedApptId}
                  onChange={(e) => setSelectedApptId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-aurena-border text-sm"
                >
                  {eligibleAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {formatDateDisplay(appt.start)} — {appt.serviceName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="review-rating-select"
                className="block text-xs font-medium text-aurena-muted mb-1"
              >
                Rating (1 to 5 Stars)
              </label>
              <select
                id="review-rating-select"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                data-testid="review-rating-select"
                className="w-48 px-4 py-2.5 rounded-xl border border-aurena-border text-sm bg-aurena-cream"
              >
                <option value={5}>5 Stars — Exceptional</option>
                <option value={4}>4 Stars — Very Good</option>
                <option value={3}>3 Stars — Good</option>
                <option value={2}>2 Stars — Fair</option>
                <option value={1}>1 Star — Needs Improvement</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="review-comment-input"
                className="block text-xs font-medium text-aurena-muted mb-1"
              >
                Your Review
              </label>
              <textarea
                id="review-comment-input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                minLength={5}
                placeholder="Share what you loved about your manicure and studio experience..."
                data-testid="review-comment-input"
                className="w-full px-4 py-3 rounded-2xl border border-aurena-border text-sm bg-aurena-cream"
              />
            </div>

            {reviewError && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {reviewError}
              </p>
            )}

            <button
              type="submit"
              disabled={submittingReview}
              data-testid="submit-review-btn"
              className="px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition disabled:opacity-50"
            >
              {submittingReview ? "Publishing..." : "Publish Review"}
            </button>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => {
              const isOwner = user && rev.userId === user.id;
              const isEditing = editingReviewId === rev.id;

              return (
                <div
                  key={rev.id}
                  data-testid={`review-item-${rev.id}`}
                  className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating ? "fill-current" : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReviewId(rev.id);
                            setEditRating(rev.rating);
                            setEditComment(rev.comment);
                          }}
                          aria-label="Edit review"
                          data-testid={`edit-review-btn-${rev.id}`}
                          className="p-1.5 rounded-full text-aurena-muted hover:text-aurena-charcoal hover:bg-aurena-beige"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReviewId(rev.id)}
                          aria-label="Delete review"
                          data-testid={`delete-review-btn-${rev.id}`}
                          className="p-1.5 rounded-full text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-aurena-border text-xs"
                      >
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r} Stars
                          </option>
                        ))}
                      </select>
                      <textarea
                        rows={3}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        data-testid="edit-review-comment-input"
                        className="w-full px-3 py-2 rounded-xl border border-aurena-border text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEditReview(rev.id)}
                          disabled={submittingReview}
                          data-testid="save-edit-review-btn"
                          className="px-4 py-1.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-4 py-1.5 rounded-full border border-aurena-border text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-aurena-charcoal leading-relaxed">
                      “{rev.comment}”
                    </p>
                  )}

                  <div className="pt-2 border-t border-aurena-border/50 flex items-center justify-between text-xs text-aurena-muted">
                    <span className="font-medium text-aurena-charcoal">
                      {rev.user?.firstName} {rev.user?.lastName}
                    </span>
                    <span>{formatDateDisplay(rev.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-aurena-muted">
            No reviews yet for this service. Book and complete an appointment to
            share the first verified review!
          </p>
        )}
      </section>

      {/* Related Services */}
      {service.relatedServices?.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-aurena-border">
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            You May Also Love
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {service.relatedServices.map((rel) => (
              <ServiceCard key={rel.id} service={rel} />
            ))}
          </div>
        </section>
      )}

      <Lightbox
        isOpen={lightboxOpen}
        images={allImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() =>
          setLightboxIndex((prev) =>
            prev === 0 ? allImages.length - 1 : prev - 1
          )
        }
        onNext={() =>
          setLightboxIndex((prev) =>
            prev === allImages.length - 1 ? 0 : prev + 1
          )
        }
      />

      <ConfirmModal
        isOpen={Boolean(deletingReviewId)}
        title="Delete Your Review"
        message="Are you sure you want to permanently remove your review?"
        confirmLabel="Delete Review"
        loading={submittingReview}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setDeletingReviewId(null)}
      />
    </div>
  );
}
