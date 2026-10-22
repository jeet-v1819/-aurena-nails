"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export default function LoadingOverlay({
  isOpen = false,
  title = "Please Wait",
  message = "Processing your request and preparing the next screen...",
  badge = "Aurena Nails"
}) {
  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-busy="true"
      data-testid="action-loading-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 transition-all duration-300 animate-fadeIn"
    >
      <div className="relative overflow-hidden bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border border-aurena-border/80 shadow-[0_25px_60px_-15px_rgba(183,110,121,0.35)] rounded-3xl p-8 sm:p-10 max-w-sm w-full mx-auto text-center transform scale-100 transition-transform">
        {/* Soft background luxury glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-aurena-blush/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-aurena-gold/25 rounded-full blur-3xl pointer-events-none" />

        {/* Dual Orbit Spinning Rings & Aurena Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-aurena-rosegold/20 border-t-aurena-rosegold animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-aurena-gold/25 border-b-aurena-gold animate-spin-reverse" />
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-aurena-rosegold to-aurena-gold/80 flex items-center justify-center shadow-md animate-pulse-subtle">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Luxury Badge */}
        <div className="mt-5 mb-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-aurena-beige/90 border border-aurena-border/80 text-[10px] font-semibold tracking-[0.2em] uppercase text-aurena-rosegold">
          <span>{badge}</span>
        </div>

        {/* Title */}
        <h2 className="font-serif text-2xl font-bold text-aurena-charcoal dark:text-white tracking-wide">
          {title}
        </h2>

        {/* Message */}
        <p className="text-xs text-aurena-muted dark:text-stone-300 mt-2 font-normal leading-relaxed">
          {message}
        </p>

        {/* Luxury Shimmer Progress Bar */}
        <div className="relative h-1.5 w-full bg-aurena-beige/80 dark:bg-stone-800 rounded-full overflow-hidden mt-6">
          <div className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-aurena-rose via-aurena-gold to-aurena-rosegold rounded-full animate-shimmer shadow-sm" />
        </div>
      </div>
    </div>
  );
}
