import React from "react";
import "./globals.css";
import { getSessionAndUser } from "@/lib/auth";
import { getPublicWebsiteContent } from "@/services/contentService";
import { AuthProvider } from "@/hooks/useAuth";
import AppShell from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "AURENA NAILS — Luxury Nail Art & Beauty Experience",
    template: "%s | AURENA NAILS"
  },
  description:
    "Thoughtfully crafted nail art. A little luxury, just for you. Discover your signature style at Aurena Nails."
};

export default async function RootLayout({ children }) {
  const [{ user }, publicData] = await Promise.all([
    getSessionAndUser({ disableCookieCache: false }).catch(() => ({
      user: null
    })),
    getPublicWebsiteContent({ allowFallback: true }).catch(() => ({
      contact: {},
      businessHours: [],
      holidays: []
    }))
  ]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-aurena-cream text-aurena-charcoal">
        <AuthProvider initialUser={user}>
          <AppShell
            contact={publicData?.contact || {}}
            businessHours={publicData?.businessHours || []}
          >
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
