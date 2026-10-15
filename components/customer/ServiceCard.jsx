"use client";

import React from "react";
import Link from "next/link";
import { Clock, Heart, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration, formatPriceINR } from "@/utils/format";

export default function ServiceCard({ service }) {
  const { isServiceWishlisted, toggleWishlist } = useAuth();
  const wishlisted = isServiceWishlisted(service.id);

  return (
    <article
      data-testid={`service-card-${service.slug}`}
      className="group bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft hover:shadow-luxury transition-all flex flex-col"
    >
      <div className="relative h-60 overflow-hidden bg-aurena-beige">
        <img
          src={service.mainImage || "/images/gel-nails.jpg"}
          alt={service.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {service.category?.name && (
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-xs font-medium text-aurena-charcoal">
            {service.category.name}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist({ serviceId: service.id })}
          aria-label={
            wishlisted
              ? `Remove ${service.name} from wishlist`
              : `Save ${service.name} to wishlist`
          }
          data-testid={`wishlist-service-btn-${service.slug}`}
          className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition shadow-soft ${
            wishlisted
              ? "bg-aurena-rosegold text-white"
              : "bg-white/90 text-aurena-charcoal hover:bg-aurena-rosegold hover:text-white"
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl font-semibold text-aurena-charcoal group-hover:text-aurena-rosegold transition">
              <Link href={`/services/${service.slug}`}>{service.name}</Link>
            </h3>
            {service.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-current" />
                {service.averageRating} ({service.reviewCount})
              </span>
            )}
          </div>
          <p className="text-sm text-aurena-muted line-clamp-2 leading-relaxed">
            {service.shortDescription}
          </p>
        </div>

        <div className="pt-4 border-t border-aurena-border/60 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-aurena-muted">
              <Clock className="w-4 h-4 text-aurena-rosegold" />
              {formatDuration(service.duration)}
            </span>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-aurena-muted block">
                Starting from (Info)
              </span>
              <span className="font-serif text-lg font-bold text-aurena-charcoal">
                {formatPriceINR(service.promotionalPrice ?? service.startingPrice)}
              </span>
              {service.regularPrice &&
                Number(service.regularPrice) >
                  Number(service.promotionalPrice ?? service.startingPrice) && (
                  <span className="ml-1.5 text-xs text-aurena-muted line-through">
                    {formatPriceINR(service.regularPrice)}
                  </span>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`/services/${service.slug}`}
              className="text-center py-2.5 px-3 rounded-full border border-aurena-border text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
            >
              View Details
            </Link>
            <Link
              href={`/booking?serviceId=${encodeURIComponent(service.id)}`}
              className="text-center py-2.5 px-3 rounded-full bg-aurena-rosegold text-xs font-medium text-white hover:bg-aurena-charcoal transition"
            >
              Book Slot
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
