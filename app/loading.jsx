import React from "react";
import { Sparkles } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 bg-aurena-cream"
    >
      <div className="relative w-20 h-20 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-aurena-rosegold/20 border-t-aurena-rosegold animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-aurena-gold/25 border-b-aurena-gold animate-spin-reverse" />
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-aurena-rosegold to-aurena-gold/80 flex items-center justify-center shadow-md animate-pulse-subtle">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-aurena-rosegold font-semibold">
          Aurena Nails
        </p>
        <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
          Curating Your Experience
        </h2>
        <p className="text-xs text-aurena-muted max-w-xs mx-auto">
          Please wait a moment while we load your tailored studio experience.
        </p>
      </div>

      <div className="w-48 h-1 bg-aurena-border/50 rounded-full overflow-hidden mt-6">
        <div className="h-full w-2/5 bg-gradient-to-r from-aurena-rose via-aurena-gold to-aurena-rosegold rounded-full animate-shimmer" />
      </div>
    </div>
  );
}
