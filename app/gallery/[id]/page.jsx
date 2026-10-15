import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { getGalleryImageById } from "@/services/galleryService";
import GalleryCard from "@/components/customer/GalleryCard";

export const dynamic = "force-dynamic";

export default async function GalleryDetailPage(context) {
  const params = await context.params;
  const item = await getGalleryImageById(params?.id);

  if (!item) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <nav aria-label="Breadcrumb" className="text-xs text-aurena-muted flex items-center gap-2">
        <Link href="/" className="hover:text-aurena-rosegold">
          Home
        </Link>
        <span>/</span>
        <Link href="/gallery" className="hover:text-aurena-rosegold">
          Gallery
        </Link>
        <span>/</span>
        <span className="text-aurena-charcoal font-medium">{item.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <div className="rounded-3xl overflow-hidden border border-aurena-border bg-aurena-beige shadow-luxury">
            <img
              src={item.url}
              alt={item.title}
              className="w-full max-h-[540px] object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          {item.category?.name && (
            <span className="inline-block px-3.5 py-1 rounded-full bg-aurena-blush/50 text-xs font-semibold text-aurena-rosegold">
              {item.category.name}
            </span>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-base text-aurena-muted leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {(item.tags || []).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-aurena-beige text-xs text-aurena-charcoal"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="pt-4">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition shadow-luxury"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Inspired Set</span>
            </Link>
          </div>
        </div>
      </div>

      {item.related?.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-aurena-border">
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            More From This Collection
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {item.related.map((rel) => (
              <GalleryCard key={rel.id} item={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
