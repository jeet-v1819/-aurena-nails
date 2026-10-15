"use client";

import React, { useState, useEffect, useMemo } from "react";
import GalleryCard from "@/components/customer/GalleryCard";
import Lightbox from "@/components/ui/Lightbox";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [galRes, catRes] = await Promise.all([
          fetch("/api/gallery?limit=48", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" })
        ]);
        const [galData, catData] = await Promise.all([
          galRes.json(),
          catRes.json()
        ]);
        if (mounted) {
          setItems(galData.items || []);
          setCategories(catData.items || []);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (activeCategory === "ALL") return items;
    return items.filter(
      (item) =>
        item.category?.slug === activeCategory ||
        item.categoryId === activeCategory
    );
  }, [items, activeCategory]);

  const lightboxImages = useMemo(
    () =>
      filteredItems.map((item) => ({
        url: item.url,
        title: item.title,
        description: item.description,
        alt: item.title
      })),
    [filteredItems]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          Portfolio
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-aurena-charcoal">
          Nail Art Gallery
        </h1>
        <p className="text-sm text-aurena-muted leading-relaxed">
          Browse our studio creations across bridal couture, micro-French,
          chrome glazes, and minimalist builder gel sets.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveCategory("ALL");
            setLightboxIndex(null);
          }}
          className={`px-4 py-2 rounded-full text-xs font-medium transition ${
            activeCategory === "ALL"
              ? "bg-aurena-rosegold text-white"
              : "bg-white border border-aurena-border text-aurena-charcoal hover:bg-aurena-beige"
          }`}
        >
          All Designs
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.slug);
              setLightboxIndex(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-medium transition ${
              activeCategory === cat.slug
                ? "bg-aurena-rosegold text-white"
                : "bg-white border border-aurena-border text-aurena-charcoal hover:bg-aurena-beige"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-aurena-muted">
          Loading gallery...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, idx) => (
            <GalleryCard
              key={item.id}
              item={item}
              onOpenLightbox={() => setLightboxIndex(idx)}
            />
          ))}
        </div>
      )}

      <Lightbox
        isOpen={lightboxIndex !== null}
        images={lightboxImages}
        currentIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onPrev={() =>
          setLightboxIndex((prev) =>
            prev === null
              ? 0
              : (prev - 1 + lightboxImages.length) % lightboxImages.length
          )
        }
        onNext={() =>
          setLightboxIndex((prev) =>
            prev === null ? 0 : (prev + 1) % lightboxImages.length
          )
        }
      />
    </div>
  );
}
