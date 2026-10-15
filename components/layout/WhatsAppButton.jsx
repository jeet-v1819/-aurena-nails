"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppButton({ whatsapp = "919876543210" }) {
  const digits = String(whatsapp || "919876543210").replace(/[^0-9]/g, "") || "919876543210";
  const prefilled = "Hello Aurena Nails, I would like to book an appointment.";
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(prefilled)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Aurena Nails on WhatsApp"
      data-testid="floating-whatsapp-button"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-luxury transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      <MessageCircle className="w-5 h-5 fill-current" />
      <span className="hidden sm:inline text-sm font-medium">WhatsApp Concierge</span>
    </a>
  );
}
