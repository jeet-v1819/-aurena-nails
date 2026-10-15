"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [vidRes, catRes] = await Promise.all([
          fetch("/api/videos?limit=36", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" })
        ]);
        const [vidData, catData] = await Promise.all([
          vidRes.json(),
          catRes.json()
        ]);
        if (mounted) {
          setVideos(vidData.items || []);
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

  const filteredVideos = useMemo(() => {
    if (activeCategory === "ALL") return videos;
    return videos.filter(
      (v) =>
        v.category?.slug === activeCategory || v.categoryId === activeCategory
    );
  }, [videos, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          In Motion
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-aurena-charcoal">
          Video Showcase
        </h1>
        <p className="text-sm text-aurena-muted leading-relaxed">
          Watch behind-the-scenes studio artistry, bridal nail couture, and
          signature French manicure demonstrations.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("ALL")}
          className={`px-4 py-2 rounded-full text-xs font-medium transition ${
            activeCategory === "ALL"
              ? "bg-aurena-rosegold text-white"
              : "bg-white border border-aurena-border text-aurena-charcoal hover:bg-aurena-beige"
          }`}
        >
          All Videos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.slug)}
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
          Loading videos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.map((video) => (
            <article
              key={video.id}
              data-testid={`video-card-${video.id}`}
              className="bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft hover:shadow-luxury transition flex flex-col"
            >
              <Link
                href={`/videos/${video.id}`}
                className="relative h-56 bg-black block group overflow-hidden"
              >
                <img
                  src={video.thumbnail || "/images/art-nails.jpg"}
                  alt={video.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-aurena-rosegold text-white flex items-center justify-center shadow-luxury">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </span>
                </div>
              </Link>

              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div>
                  {video.category?.name && (
                    <span className="text-[11px] uppercase tracking-wider text-aurena-rosegold font-semibold">
                      {video.category.name}
                    </span>
                  )}
                  <h2 className="font-serif text-xl font-semibold text-aurena-charcoal mt-1">
                    <Link href={`/videos/${video.id}`}>{video.title}</Link>
                  </h2>
                  {video.description && (
                    <p className="text-xs text-aurena-muted mt-2 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                <Link
                  href={`/videos/${video.id}`}
                  className="text-xs font-medium text-aurena-rosegold hover:underline"
                >
                  Watch Video →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
