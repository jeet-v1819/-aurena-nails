"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaUploader from "@/components/ui/MediaUploader";

export default function AdminCategoriesPage() {
  const { showToast } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function openCreate() {
    setEditingCat(null);
    setName("");
    setDescription("");
    setImage("");
    setActive(true);
    setError("");
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditingCat(cat);
    setName(cat.name || "");
    setDescription(cat.description || "");
    setImage(cat.image || "");
    setActive(Boolean(cat.active));
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editingCat
        ? `/api/admin/categories/${editingCat.id}`
        : "/api/admin/categories";
      const method = editingCat ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          image: image || null,
          active
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to save category.");
        return;
      }
      setModalOpen(false);
      showToast(editingCat ? "Category updated." : "Category created.");
      await loadCategories();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Cannot delete category in use.", "error");
        return;
      }
      showToast("Category deleted.");
      await loadCategories();
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
            Category Management
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            Organize services, nail art gallery designs, and studio videos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-testid="admin-add-category-btn"
          className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-aurena-beige animate-pulse" />
          ))
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              data-testid={`admin-category-card-${cat.slug}`}
              className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                    {cat.name}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      cat.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cat.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-aurena-muted line-clamp-2">
                  {cat.description || "No description"}
                </p>
              </div>

              <div className="pt-3 border-t border-aurena-border/60 flex items-center justify-between text-xs">
                <span className="text-aurena-muted">
                  {cat.servicesCount || 0} services • {cat.galleryCount || 0} designs •{" "}
                  {cat.videosCount || 0} videos
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    data-testid={`edit-category-btn-${cat.slug}`}
                    className="p-2 rounded-xl border border-aurena-border hover:bg-aurena-beige"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(cat)}
                    data-testid={`delete-category-btn-${cat.slug}`}
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
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSave}
            data-testid="admin-category-form"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                {editingCat ? "Edit Category" : "Create Category"}
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

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="category-name-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-aurena-muted mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="category-desc-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <MediaUploader
              label="Category Image"
              expectedType="image"
              folder="aurena-categories"
              multiple={false}
              value={image ? [{ url: image }] : []}
              onChange={(asset) => setImage(asset?.url || "")}
            />

            <label className="inline-flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Active</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
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
                data-testid="save-category-btn"
                className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"?`
            : ""
        }
        confirmLabel="Delete Category"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
