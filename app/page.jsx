import React from "react";
import Link from "next/link";
import { Calendar, Sparkles, Star } from "lucide-react";
import { getPublicWebsiteContent } from "@/services/contentService";
import { listPublicServices } from "@/services/serviceService";
import { listGalleryImages } from "@/services/galleryService";
import { listVideos } from "@/services/videoService";
import { listPublicReviews } from "@/services/reviewService";
import ServiceCard from "@/components/customer/ServiceCard";
import GalleryCard from "@/components/customer/GalleryCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contentData, servicesRes, galleryRes, videosRes, reviews] =
    await Promise.all([
      getPublicWebsiteContent({ allowFallback: true }).catch(() => ({
        home: {},
        about: {}
      })),
      listPublicServices({ featuredOnly: true, limit: 6 }).catch(() => ({
        items: []
      })),
      listGalleryImages({ featuredOnly: true, limit: 6 }).catch(() => ({
        items: []
      })),
      listVideos({ featuredOnly: true, limit: 3 }).catch(() => ({ items: [] })),
      listPublicReviews({ limit: 6 }).catch(() => [])
    ]);

  const home = contentData?.home || {};
  const featuredServices = servicesRes?.items || [];
  const featuredGallery = galleryRes?.items || [];
  const featuredVideos = videosRes?.items || [];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-aurena-beige/60 border-b border-aurena-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aurena-blush/50 text-xs uppercase tracking-[0.22em] text-aurena-rosegold font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aurena Nails Luxury Studio</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl font-bold text-aurena-charcoal leading-tight">
              {home.title || "Beautiful Nails. Beautiful You."}
            </h1>

            <p className="text-base sm:text-lg text-aurena-muted leading-relaxed max-w-xl">
              {home.description ||
                "Thoughtfully crafted nail art. A little luxury, just for you. Discover your signature style at Aurena Nails."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/booking"
                data-testid="hero-book-cta"
                className="px-8 py-4 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition shadow-luxury flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>{home.primaryLabel || "Book Appointment"}</span>
              </Link>
              <Link
                href="/services"
                data-testid="hero-explore-cta"
                className="px-8 py-4 rounded-full border border-aurena-charcoal text-aurena-charcoal text-sm font-medium hover:bg-aurena-charcoal hover:text-white transition"
              >
                {home.secondaryLabel || "Explore Nail Art"}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden border-4 border-white shadow-luxury aspect-[4/3] bg-aurena-beige">
              <img
                src={home.image || "/images/hero-nails.jpg"}
                alt="Aurena Nails Luxury Manicure"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
              Curated Treatments
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
              Featured Nail Services
            </h2>
          </div>
          <Link
            href="/services"
            className="text-sm font-medium text-aurena-rosegold hover:underline"
          >
            View All Services →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {/* Featured Gallery */}
      <section className="bg-aurena-beige/50 py-20 border-y border-aurena-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
                Lookbook
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
                Featured Nail Art Gallery
              </h2>
            </div>
            <Link
              href="/gallery"
              className="text-sm font-medium text-aurena-rosegold hover:underline"
            >
              Explore Full Gallery →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredGallery.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Videos */}
      {featuredVideos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
                In Motion
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
                Behind the Artistry
              </h2>
            </div>
            <Link
              href="/videos"
              className="text-sm font-medium text-aurena-rosegold hover:underline"
            >
              Watch All Videos →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredVideos.map((vid) => (
              <div
                key={vid.id}
                className="bg-white rounded-3xl border border-aurena-border overflow-hidden shadow-soft"
              >
                <video
                  src={vid.url}
                  poster={vid.thumbnail || "/images/art-nails.jpg"}
                  controls
                  preload="metadata"
                  className="w-full h-56 object-cover bg-black"
                />
                <div className="p-5 space-y-2">
                  <h3 className="font-serif text-lg font-semibold text-aurena-charcoal">
                    <Link href={`/videos/${vid.id}`}>{vid.title}</Link>
                  </h3>
                  {vid.description && (
                    <p className="text-xs text-aurena-muted line-clamp-2">
                      {vid.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verified Testimonials */}
      {reviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
              Client Experiences
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
              Loved by Our Guests
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.slice(0, 3).map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4"
              >
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating ? "fill-current" : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-aurena-charcoal italic leading-relaxed">
                  “{rev.comment}”
                </p>
                <div className="pt-3 border-t border-aurena-border/50 flex items-center justify-between text-xs text-aurena-muted">
                  <span className="font-semibold text-aurena-charcoal">
                    {rev.user?.firstName} {rev.user?.lastName}
                  </span>
                  {rev.service?.name && <span>{rev.service.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
