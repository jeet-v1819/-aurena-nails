import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { getVideoById } from "@/services/videoService";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage(context) {
  const params = await context.params;
  const video = await getVideoById(params?.id);

  if (!video) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav aria-label="Breadcrumb" className="text-xs text-aurena-muted flex items-center gap-2">
        <Link href="/" className="hover:text-aurena-rosegold">
          Home
        </Link>
        <span>/</span>
        <Link href="/videos" className="hover:text-aurena-rosegold">
          Videos
        </Link>
        <span>/</span>
        <span className="text-aurena-charcoal font-medium">{video.title}</span>
      </nav>

      <div className="rounded-3xl overflow-hidden border border-aurena-border bg-black shadow-luxury">
        <video
          src={video.url}
          poster={video.thumbnail || "/images/art-nails.jpg"}
          controls
          className="w-full max-h-[540px] object-contain"
        />
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-aurena-border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          {video.category?.name && (
            <span className="inline-block px-3 py-1 rounded-full bg-aurena-blush/50 text-xs font-semibold text-aurena-rosegold">
              {video.category.name}
            </span>
          )}
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            {video.title}
          </h1>
          {video.description && (
            <p className="text-sm text-aurena-muted leading-relaxed">
              {video.description}
            </p>
          )}
        </div>

        <Link
          href="/booking"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>Book Appointment</span>
        </Link>
      </div>
    </div>
  );
}
