"use client";

import React from "react";
import Link from "next/link";
import { Expand, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function GalleryCard({ item, onOpenLightbox }) {
  const { isGalleryWishlisted, toggleWishlist } = useAuth();
  const wishlisted = isGalleryWishlisted(item.id);

  return (
    <article
      data-testid={`gallery-card-${item.id}`}
      className="group bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft hover:shadow-luxury transition-all flex flex-col"
    >
      <div className="relative h-64 overflow-hidden bg-aurena-beige">
        <img
          src={item.url || "/images/art-nails.jpg"}
          alt={item.title}
          loading="lazy"
          onClick={() => onOpenLightbox?.(item)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
        />
        {item.category?.name && (
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-xs font-medium text-aurena-charcoal">
            {item.category.name}
          </span>
        )}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {onOpenLightbox && (
            <button
              type="button"
              onClick={() => onOpenLightbox(item)}
              aria-label={`Preview ${item.title} full screen`}
              className="w-9 h-9 rounded-full bg-white/90 text-aurena-charcoal hover:bg-aurena-charcoal hover:text-white flex items-center justify-center transition shadow-soft"
            >
              <Expand className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleWishlist({ galleryId: item.id })}
            aria-label={
              wishlisted
                ? `Remove ${item.title} from wishlist`
                : `Save ${item.title} to wishlist`
            }
            data-testid={`wishlist-gallery-btn-${item.id}`}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-soft ${
              wishlisted
                ? "bg-aurena-rosegold text-white"
                : "bg-white/90 text-aurena-charcoal hover:bg-aurena-rosegold hover:text-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-aurena-charcoal group-hover:text-aurena-rosegold transition">
            <Link href={`/gallery/${item.id}`}>{item.title}</Link>
          </h3>
          {item.description && (
            <p className="text-xs text-aurena-muted mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-aurena-border/50">
          <div className="flex flex-wrap gap-1">
            {(item.tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-aurena-beige text-[11px] text-aurena-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
          <Link
            href={`/gallery/${item.id}`}
            className="text-xs font-medium text-aurena-rosegold hover:underline shrink-0"
          >
            View Design →
          </Link>
        </div>
      </div>
    </article>
  );
}
