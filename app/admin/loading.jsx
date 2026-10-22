import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16"
    >
      <div className="relative w-20 h-20 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-aurena-rosegold/30 border-t-aurena-rosegold animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-aurena-gold/30 border-b-aurena-gold animate-spin-reverse" />
        <div className="w-10 h-10 rounded-full bg-aurena-rosegold flex items-center justify-center shadow-lg text-white">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-aurena-rosegold font-semibold">
          Studio Control Center
        </p>
        <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
          Loading Admin Workspace
        </h2>
        <p className="text-xs text-aurena-muted max-w-xs mx-auto">
          Synchronizing database records and live studio metrics...
        </p>
      </div>

      <div className="w-48 h-1 bg-aurena-border/50 rounded-full overflow-hidden mt-6">
        <div className="h-full w-2/5 bg-gradient-to-r from-aurena-rose via-aurena-gold to-aurena-rosegold rounded-full animate-shimmer" />
      </div>
    </div>
  );
}
