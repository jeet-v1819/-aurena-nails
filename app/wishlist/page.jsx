"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPriceINR, formatDuration } from "@/utils/format";

export default function WishlistPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    setWishlistItems,
    showToast
  } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/wishlist", {
          credentials: "include",
          cache: "no-store"
        });
        if (res.status === 401) {
          router.replace("/login?redirect=/wishlist");
          return;
        }
        const data = await res.json();
        if (res.ok && mounted) {
          const list = data.items || [];
          setItems(list);
          setWishlistItems(list);
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
  }, [router, setWishlistItems]);

  async function handleRemove(id) {
    try {
      const res = await fetch(`/api/wishlist?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        const next = items.filter((i) => i.id !== id);
        setItems(next);
        setWishlistItems(next);
        showToast("Removed from your wishlist.", "info");
      }
    } catch {
      showToast("Unable to remove item.", "error");
    }
  }

  if (authLoading && loading && !user) {
    return (
      <div className="py-20 text-center text-sm text-aurena-muted">
        Loading your wishlist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Saved Favourites
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
            My Wishlist
          </h1>
        </div>
        <Link
          href="/services"
          className="px-6 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition self-start sm:self-auto"
        >
          Explore Services
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-aurena-muted">
          Loading wishlist...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-aurena-border space-y-4">
          <p className="font-serif text-2xl font-bold text-aurena-charcoal">
            Your Wishlist is Empty
          </p>
          <p className="text-xs text-aurena-muted max-w-md mx-auto">
            Save your favourite nail services and gallery designs to reference
            when booking your next studio appointment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => {
            if (item.service) {
              const s = item.service;
              return (
                <article
                  key={item.id}
                  data-testid={`wishlist-item-${item.id}`}
                  className="bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={s.mainImage || "/images/gel-nails.jpg"}
                      alt={s.name}
                      className="w-full h-56 object-cover bg-aurena-beige"
                    />
                    <div className="p-6 space-y-2">
                      <span className="text-xs text-aurena-rosegold font-semibold">
                        Service • {formatDuration(s.duration)}
                      </span>
                      <h2 className="font-serif text-xl font-semibold text-aurena-charcoal">
                        <Link href={`/services/${s.slug}`}>{s.name}</Link>
                      </h2>
                      <p className="font-serif text-lg font-bold text-aurena-charcoal">
                        {formatPriceINR(s.promotionalPrice ?? s.startingPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex items-center gap-3">
                    <Link
                      href={`/booking?serviceId=${encodeURIComponent(s.id)}`}
                      className="flex-1 text-center py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition"
                    >
                      Book Slot
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from wishlist"
                      className="p-2.5 rounded-full border border-aurena-border text-aurena-muted hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            }

            if (item.galleryImage) {
              const g = item.galleryImage;
              return (
                <article
                  key={item.id}
                  data-testid={`wishlist-item-${item.id}`}
                  className="bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={g.url || "/images/art-nails.jpg"}
                      alt={g.title}
                      className="w-full h-56 object-cover bg-aurena-beige"
                    />
                    <div className="p-6 space-y-2">
                      <span className="text-xs text-aurena-rosegold font-semibold">
                        Gallery Design
                      </span>
                      <h2 className="font-serif text-xl font-semibold text-aurena-charcoal">
                        <Link href={`/gallery/${g.id}`}>{g.title}</Link>
                      </h2>
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex items-center gap-3">
                    <Link
                      href="/booking"
                      className="flex-1 text-center py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-medium hover:bg-aurena-charcoal transition"
                    >
                      Book Inspired Set
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from wishlist"
                      className="p-2.5 rounded-full border border-aurena-border text-aurena-muted hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
