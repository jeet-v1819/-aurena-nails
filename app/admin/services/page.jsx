"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaUploader from "@/components/ui/MediaUploader";
import { formatDuration, formatPriceINR } from "@/utils/format";

const EMPTY_SERVICE_FORM = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  mainImage: "/images/gel-nails.jpg",
  duration: 60,
  startingPrice: 999,
  regularPrice: "",
  promotionalPrice: "",
  nailType: "Builder Gel",
  style: "Signature",
  occasion: "All Occasions",
  difficulty: "Standard",
  preparation: "Please arrive with clean hands.",
  aftercare: "Apply cuticle oil daily.",
  available: true,
  featured: false,
  active: true,
  images: [],
  videoIds: []
};

export default function AdminServicesPage() {
  const { showToast } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "40");

      const res = await fetch(`/api/admin/services?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/videos").then((r) => r.json())
    ])
      .then(([catData, vidData]) => {
        setCategories(catData.items || []);
        setVideos(vidData.items || []);
      })
      .catch(() => {});
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      ...EMPTY_SERVICE_FORM,
      categoryId: categories[0]?.id || ""
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(svc) {
    setEditingId(svc.id);
    setForm({
      name: svc.name || "",
      slug: svc.slug || "",
      shortDescription: svc.shortDescription || "",
      description: svc.description || "",
      categoryId: svc.categoryId || "",
      mainImage: svc.mainImage || "/images/gel-nails.jpg",
      duration: svc.duration || 60,
      startingPrice: svc.startingPrice ?? 799,
      regularPrice: svc.regularPrice ?? "",
      promotionalPrice: svc.promotionalPrice ?? "",
      nailType: svc.nailType || "",
      style: svc.style || "",
      occasion: svc.occasion || "",
      difficulty: svc.difficulty || "",
      preparation: svc.preparation || "",
      aftercare: svc.aftercare || "",
      available: Boolean(svc.available),
      featured: Boolean(svc.featured),
      active: Boolean(svc.active),
      images: (svc.images || []).map((img, i) => ({
        url: img.url,
        publicId: img.publicId || null,
        alt: img.alt || svc.name,
        position: img.position ?? i
      })),
      videoIds: (svc.associatedVideos || []).map((v) => v.id)
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSaveService(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const url = editingId
        ? `/api/admin/services/${editingId}`
        : "/api/admin/services";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Unable to save service.");
        return;
      }

      setModalOpen(false);
      showToast(editingId ? "Service updated." : "Service created.");
      await loadServices();
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickToggle(svc, field) {
    const res = await fetch(`/api/admin/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !svc[field] })
    });
    if (res.ok) {
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, [field]: !s[field] } : s))
      );
      showToast(`Service ${field} updated.`);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services/${deleteTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Service removed.");
        await loadServices();
      } else {
        showToast(data.error || "Unable to delete service.", "error");
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
            Service Management
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            Configure nail rituals, durations, informational pricing, and care
            instructions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          data-testid="admin-add-service-btn"
          className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white border border-aurena-border flex items-center gap-3 max-w-md">
        <Search className="w-4 h-4 text-aurena-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full text-sm bg-transparent focus:outline-none"
        />
      </div>

      {/* Services Table */}
      <div className="rounded-3xl bg-white border border-aurena-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-aurena-beige/70 text-aurena-muted uppercase tracking-wider border-b border-aurena-border">
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Info Price</th>
                <th className="py-3.5 px-4">Status / Featured</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aurena-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-aurena-muted">
                    Loading services...
                  </td>
                </tr>
              ) : services.length > 0 ? (
                services.map((svc) => (
                  <tr
                    key={svc.id}
                    data-testid={`admin-service-row-${svc.slug}`}
                    className="hover:bg-aurena-cream/60"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={svc.mainImage || "/images/gel-nails.jpg"}
                          alt={svc.name}
                          className="w-11 h-11 rounded-xl object-cover border border-aurena-border"
                        />
                        <div>
                          <p className="font-semibold text-aurena-charcoal text-sm">
                            {svc.name}
                          </p>
                          <p className="text-aurena-muted">/{svc.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-aurena-charcoal">
                      {svc.category?.name || "Uncategorized"}
                    </td>
                    <td className="py-4 px-4 text-aurena-charcoal">
                      {formatDuration(svc.duration)}
                    </td>
                    <td className="py-4 px-4 font-semibold text-aurena-charcoal">
                      {formatPriceINR(svc.startingPrice)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(svc, "active")}
                          className={`px-2.5 py-0.5 rounded-full font-semibold ${
                            svc.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {svc.active ? "Active" : "Inactive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(svc, "featured")}
                          className={`px-2.5 py-0.5 rounded-full font-semibold ${
                            svc.featured
                              ? "bg-aurena-blush/60 text-aurena-rosegold"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {svc.featured ? "Featured" : "Standard"}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(svc)}
                          data-testid={`edit-service-btn-${svc.slug}`}
                          className="p-2 rounded-xl border border-aurena-border hover:bg-aurena-beige"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(svc)}
                          data-testid={`delete-service-btn-${svc.slug}`}
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
                    No services found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? "Edit Service" : "Create Service"}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveService}
            data-testid="admin-service-form"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-2xl w-full p-6 sm:p-8 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
                {editingId ? "Edit Service" : "Create New Service"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-aurena-muted hover:text-aurena-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  data-testid="service-name-input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Duration (mins) *
                </label>
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: Number(e.target.value) })
                  }
                  required
                  data-testid="service-duration-input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Starting Price (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.startingPrice}
                  onChange={(e) =>
                    setForm({ ...form, startingPrice: e.target.value })
                  }
                  required
                  data-testid="service-price-input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Regular Price (₹ Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.regularPrice}
                  onChange={(e) =>
                    setForm({ ...form, regularPrice: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Short Description *
              </label>
              <input
                type="text"
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
                required
                data-testid="service-shortDesc-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Full Description *
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
                data-testid="service-desc-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Preparation Instructions
                </label>
                <textarea
                  rows={2}
                  value={form.preparation}
                  onChange={(e) =>
                    setForm({ ...form, preparation: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-aurena-border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  After-Care Instructions
                </label>
                <textarea
                  rows={2}
                  value={form.aftercare}
                  onChange={(e) =>
                    setForm({ ...form, aftercare: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-aurena-border text-xs"
                />
              </div>
            </div>

            <MediaUploader
              label="Main Service Image"
              expectedType="image"
              folder="aurena-services"
              multiple={false}
              value={form.mainImage ? [{ url: form.mainImage }] : []}
              onChange={(asset) =>
                setForm({
                  ...form,
                  mainImage: asset?.url || "/images/gel-nails.jpg"
                })
              }
            />

            <MediaUploader
              label="Additional Gallery Images (Upload & Reorder)"
              expectedType="image"
              folder="aurena-services"
              multiple={true}
              value={form.images}
              onChange={(list) => setForm({ ...form, images: list || [] })}
            />

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                />
                <span>Available for Booking</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-aurena-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-aurena-border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="save-service-btn"
                className="px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Service"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete or Archive Service"
        message={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.name}"? If appointments exist for this service, it will be safely archived to preserve appointment history.`
            : ""
        }
        confirmLabel="Confirm"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
