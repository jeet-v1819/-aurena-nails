"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Heart,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  User,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/videos", label: "Videos" },
  { href: "/booking", label: "Book Appointment" },
  { href: "/contact", label: "Contact" }
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, unreadCount, wishlistItems } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 bg-aurena-cream/95 backdrop-blur-md border-b border-aurena-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Aurena Nails Home"
        >
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-aurena-blush via-aurena-nude to-aurena-rosegold flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <span className="block font-serif text-xl sm:text-2xl font-bold tracking-wider text-aurena-charcoal">
              AURENA NAILS
            </span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-aurena-rosegold">
              Luxury Nail Studio
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-6"
        >
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                link.href === "/booking"
                  ? "px-4 py-2 rounded-full bg-aurena-rosegold text-white hover:bg-aurena-charcoal shadow-soft"
                  : isActive(link.href)
                  ? "text-aurena-rosegold font-semibold"
                  : "text-aurena-charcoal/80 hover:text-aurena-rosegold"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {!user ? (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-sm font-medium text-aurena-charcoal hover:text-aurena-rosegold transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 rounded-full border border-aurena-rosegold text-sm font-medium text-aurena-rosegold hover:bg-aurena-rosegold hover:text-white transition"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-1.5 rounded-full bg-aurena-charcoal text-aurena-cream text-xs font-medium flex items-center gap-1.5 hover:bg-aurena-rosegold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}

              <Link
                href="/wishlist"
                aria-label="Wishlist"
                title="Wishlist"
                className={`relative p-2 rounded-full hover:bg-aurena-beige transition ${
                  isActive("/wishlist") ? "text-aurena-rosegold" : "text-aurena-charcoal"
                }`}
              >
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-aurena-rosegold text-white text-[10px] font-semibold flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              <Link
                href="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className={`relative p-2 rounded-full hover:bg-aurena-beige transition ${
                  isActive("/notifications")
                    ? "text-aurena-rosegold"
                    : "text-aurena-charcoal"
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    data-testid="nav-unread-badge"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-aurena-rosegold text-white text-[10px] font-semibold flex items-center justify-center"
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>

              <Link
                href="/appointments"
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-aurena-beige transition ${
                  isActive("/appointments")
                    ? "text-aurena-rosegold font-semibold"
                    : "text-aurena-charcoal"
                }`}
              >
                <Calendar className="w-4 h-4" />
                My Appointments
              </Link>

              <Link
                href="/profile"
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-aurena-border hover:border-aurena-rosegold transition ${
                  isActive("/profile")
                    ? "bg-aurena-blush/40 text-aurena-rosegold"
                    : "text-aurena-charcoal"
                }`}
              >
                <User className="w-4 h-4" />
                <span>{user.firstName || "Profile"}</span>
              </Link>

              <button
                type="button"
                onClick={logout}
                aria-label="Logout"
                className="px-3 py-1.5 rounded-full text-xs font-medium text-aurena-muted hover:text-red-700 hover:bg-red-50 flex items-center gap-1 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          data-testid="mobile-menu-toggle"
          className="lg:hidden p-2.5 rounded-xl border border-aurena-border text-aurena-charcoal hover:bg-aurena-beige"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile Navigation"
          data-testid="mobile-nav-drawer"
          className="lg:hidden bg-aurena-cream border-b border-aurena-border px-4 pt-3 pb-6 space-y-2 shadow-luxury"
        >
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${
                isActive(link.href)
                  ? "bg-aurena-blush/50 text-aurena-rosegold font-semibold"
                  : "text-aurena-charcoal hover:bg-aurena-beige"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 mt-3 border-t border-aurena-border space-y-2">
            {!user ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2.5 rounded-full border border-aurena-border text-sm font-medium text-aurena-charcoal"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2.5 rounded-full bg-aurena-rosegold text-sm font-medium text-white"
                >
                  Register
                </Link>
              </div>
            ) : (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium bg-aurena-charcoal text-white"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  Profile
                </Link>
                <Link
                  href="/appointments"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  My Appointments
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  Wishlist ({wishlistItems.length})
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  Notifications ({unreadCount})
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
