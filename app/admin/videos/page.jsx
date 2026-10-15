"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Play, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaUploader from "@/components/ui/MediaUploader";

const EMPTY_VIDEO_FORM = {
  title: "",
  description: "",
  categoryId: "",
  url: "/videos/nail-art-showcase.mp4",
  publicId: null,
  thumbnail: "/images/art-nails.jpg",
  tags: "tutorial, luxury, chrome",
  featured: false,
  active: true
};

export default function AdminVideosPage() {
  const { showToast } = useAuth();
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_VIDEO_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/videos?limit=40", {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_VIDEO_FORM,
      categoryId: categories[0]?.id || ""
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(v) {
    setEditingId(v.id);
    setForm({
      title: v.title || "",
      description: v.description || "",
      categoryId: v.categoryId || "",
      url: v.url || "/videos/nail-art-showcase.mp4",
      publicId: v.publicId || null,
      thumbnail: v.thumbnail || "/images/art-nails.jpg",
      tags: Array.isArray(v.tags) ? v.tags.join(", ") : v.tags || "",
      featured: Boolean(v.featured),
      active: Boolean(v.active)
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
        ? `/api/admin/videos/${editingId}`
        : "/api/admin/videos";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to save video.");
        return;
      }
      setModalOpen(false);
      showToast(editingId ? "Video updated." : "Video created.");
      await loadVideos();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/videos/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Video deleted.");
        await loadVideos();
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
            Video Management
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            Manage studio nail art tutorials, showcase films, and thumbnails.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-testid="admin-add-video-btn"
          className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Video</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-72 rounded-3xl bg-aurena-beige animate-pulse" />
          ))
        ) : (
          videos.map((v) => (
            <div
              key={v.id}
              data-testid={`admin-video-card-${v.id}`}
              className="rounded-3xl bg-white border border-aurena-border shadow-soft overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 bg-aurena-charcoal">
                  <img
                    src={v.thumbnail || "/images/art-nails.jpg"}
                    alt={v.title}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-white/90 text-aurena-charcoal flex items-center justify-center">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h2 className="font-serif text-lg font-bold text-aurena-charcoal">
                    {v.title}
                  </h2>
                  <p className="text-xs text-aurena-muted line-clamp-2">
                    {v.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-aurena-border/60 flex items-center justify-between text-xs">
                <span className="text-aurena-muted">
                  {v.category?.name || "Studio Video"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    data-testid={`edit-video-btn-${v.id}`}
                    className="p-2 rounded-xl border border-aurena-border hover:bg-aurena-beige"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(v)}
                    data-testid={`delete-video-btn-${v.id}`}
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
            data-testid="admin-video-form"
            className="bg-white rounded-3xl border border-aurena-border shadow-luxury max-w-xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
                {editingId ? "Edit Video" : "Add Studio Video"}
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
                  data-testid="video-title-input"
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
                data-testid="video-desc-input"
                className="w-full px-3.5 py-2 rounded-xl border border-aurena-border text-sm"
              />
            </div>

            <MediaUploader
              label="Video File (MP4/WebM) *"
              expectedType="video"
              folder="aurena-videos"
              multiple={false}
              value={
                form.url ? [{ url: form.url, publicId: form.publicId }] : []
              }
              onChange={(asset) =>
                setForm({
                  ...form,
                  url: asset?.url || "/videos/nail-art-showcase.mp4",
                  publicId: asset?.publicId || null
                })
              }
            />

            <MediaUploader
              label="Cover Thumbnail Image"
              expectedType="image"
              folder="aurena-videos"
              multiple={false}
              value={form.thumbnail ? [{ url: form.thumbnail }] : []}
              onChange={(asset) =>
                setForm({
                  ...form,
                  thumbnail: asset?.url || "/images/art-nails.jpg"
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
                data-testid="save-video-btn"
                className="px-5 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-medium"
              >
                {saving ? "Saving..." : "Save Video"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Video"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"?`
            : ""
        }
        confirmLabel="Delete Video"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
