"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaUploader from "@/components/ui/MediaUploader";

const EMPTY_GALLERY_FORM = {
  title: "",
  description: "",
  categoryId: "",
  url: "/images/art-nails.jpg",
  publicId: null,
  style: "Chrome & Minimalist",
  occasion: "Evening / Bridal",
  tags: "luxury, chrome, bridal",
  featured: false,
  active: true
};

export default function AdminGalleryPage() {
  const { showToast } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_GALLERY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "40");
      const res = await fetch(`/api/admin/gallery?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_GALLERY_FORM,
      categoryId: categories[0]?.id || ""
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      categoryId: item.categoryId || "",
      url: item.url || "/images/art-nails.jpg",
      publicId: item.publicId || null,
      style: item.style || "",
      occasion: item.occasion || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "",
      featured: Boolean(item.featured),
      active: Boolean(item.active)
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const endpoint = editingId
        ? `/api/admin/gallery/${editingId}`
        : "/api/admin/gallery";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to save gallery design.");
        return;
      }
      setModalOpen(false);
      showToast(editingId ? "Gallery design updated." : "Gallery design created.");
      await loadGallery();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gallery/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Gallery design deleted.");
        await loadGallery();
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
            Gallery Management
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            Curate nail art designs, style tags, and featured portfolios.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-testid="admin-add-gallery-btn"
          className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Gallery Design</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-aurena-border flex items-center gap-3 max-w-md">
        <Search className="w-4 h-4 text-aurena-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gallery designs..."
          className="w-full text-sm bg-transparent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-3xl bg-aurena-beige animate-pulse" />
          ))
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid={`admin-gallery-card-${item.id}`}
              className="rounded-3xl bg-white border border-aurena-border shadow-soft overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-56 bg-aurena-beige">
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {item.featured && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-aurena-rosegold text-white text-[11px] font-semibold">
                      Featured
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <h2 className="font-serif text-lg font-bold text-aurena-charcoal">
                    {item.title}
                  </h2>
                  <p className="text-xs text-aurena-muted line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-aurena-border/60 flex items-center justify-between text-xs">
                <span className="text-aurena-muted">
                  {item.category?.name || "Uncategorized"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    data-testid={`edit-gallery-btn-${item.id}`}
                    className="p-2 rounded-xl border border-aurena-border hover:bg-aurena-beige"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    data-testid={`delete-gallery-btn-${item.id}`}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSave}
            data-testid="admin-gallery-form"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                {editingId ? "Edit Gallery Design" : "Add Gallery Design"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  data-testid="gallery-title-input"
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                data-testid="gallery-desc-input"
                className="w-full px-3.5 py-2 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Style
                </label>
                <input
                  type="text"
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Occasion
                </label>
                <input
                  type="text"
                  value={form.occasion}
                  onChange={(e) =>
                    setForm({ ...form, occasion: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aurena-muted mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-aurena-border text-xs"
                />
              </div>
            </div>

            <MediaUploader
              label="Gallery Image *"
              expectedType="image"
              folder="aurena-gallery"
              multiple={false}
              value={
                form.url ? [{ url: form.url, publicId: form.publicId }] : []
              }
              onChange={(asset) =>
                setForm({
                  ...form,
                  url: asset?.url || "/images/art-nails.jpg",
                  publicId: asset?.publicId || null
                })
              }
            />

            <div className="flex gap-6 pt-2">
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
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                />
                <span>Featured</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-aurena-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-full border border-aurena-border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="save-gallery-btn"
                className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : "Save Design"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Gallery Design"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"?`
            : ""
        }
        confirmLabel="Delete Design"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
