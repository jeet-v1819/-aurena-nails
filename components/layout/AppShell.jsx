"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/layout/WhatsAppButton";

export default function AppShell({
  children,
  contact = {},
  businessHours = []
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <div className="min-h-screen flex flex-col bg-aurena-cream">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-aurena-cream text-aurena-charcoal overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer contact={contact} businessHours={businessHours} />
      <WhatsAppButton whatsapp={contact?.whatsapp || contact?.phone || "919876543210"} />
    </div>
  );
}
