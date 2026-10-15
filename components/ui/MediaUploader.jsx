"use client";

import React, { useRef, useState } from "react";
import { Upload, X, ArrowUp, ArrowDown, Film, Image as ImageIcon } from "lucide-react";

export default function MediaUploader({
  label = "Upload Media",
  accept = "image/jpeg,image/png,image/webp",
  expectedType = "image",
  folder = "aurena-nails",
  multiple = false,
  value = [],
  onChange
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const items = Array.isArray(value)
    ? value
    : value
    ? [{ url: value }]
    : [];

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    setProgress(10);

    const uploadedAssets = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const maxBytes = expectedType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error(
            `${file.name} exceeds the maximum allowed size (${
              expectedType === "video" ? "50 MB" : "10 MB"
            }).`
          );
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        formData.append("expectedType", expectedType);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        uploadedAssets.push(data.asset);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (multiple) {
        onChange?.([...items, ...uploadedAssets]);
      } else {
        onChange?.(uploadedAssets[0]);
      }
    } catch (err) {
      setError(err.message || "Upload failed. Please check file type and try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(index) {
    if (!multiple) {
      onChange?.(null);
      return;
    }
    const next = items.filter((_, i) => i !== index);
    onChange?.(next);
  }

  function handleMove(index, direction) {
    if (!multiple) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    onChange?.(next.map((item, idx) => ({ ...item, position: idx })));
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs uppercase tracking-wider font-medium text-aurena-muted">
          {label}
        </label>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition ${
          dragOver
            ? "border-aurena-rosegold bg-aurena-blush/20"
            : "border-aurena-border hover:border-aurena-rosegold bg-aurena-cream/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          data-testid={`media-file-input-${expectedType}`}
        />
        <div className="flex flex-col items-center gap-2">
          {expectedType === "video" ? (
            <Film className="w-7 h-7 text-aurena-rosegold" />
          ) : (
            <ImageIcon className="w-7 h-7 text-aurena-rosegold" />
          )}
          <p className="text-sm font-medium text-aurena-charcoal">
            Drag & drop {expectedType === "video" ? "video" : "image"}
            {multiple ? "(s)" : ""} here, or <span className="text-aurena-rosegold underline">browse</span>
          </p>
          <p className="text-xs text-aurena-muted">
            {expectedType === "video"
              ? "Supported: MP4, WEBM, MOV (up to 50 MB)"
              : "Supported: JPG, PNG, WEBP (up to 10 MB)"}
          </p>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-aurena-muted">
            <span>Uploading media...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-aurena-beige rounded-full overflow-hidden">
            <div
              className="h-full bg-aurena-rosegold transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {items.map((item, idx) => (
            <div
              key={item.publicId || item.url || idx}
              className="relative group rounded-xl overflow-hidden border border-aurena-border bg-white p-2 flex flex-col gap-2"
            >
              {expectedType === "video" ? (
                <video
                  src={item.url}
                  className="w-full h-24 object-cover rounded-lg bg-black"
                  controls={false}
                  muted
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.filename || "Uploaded preview"}
                  className="w-full h-24 object-cover rounded-lg"
                />
              )}

              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-aurena-muted truncate">
                  {item.filename || item.url}
                </span>
                <div className="flex items-center gap-1">
                  {multiple && items.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move item up"
                        className="p-1 rounded hover:bg-aurena-beige disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === items.length - 1}
                        aria-label="Move item down"
                        className="p-1 rounded hover:bg-aurena-beige disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    aria-label="Remove media"
                    className="p-1 rounded text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
