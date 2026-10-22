"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CORE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/videos", label: "Videos" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

function getInitials(firstName = "", lastName = "") {
  const f = (firstName || "").trim().charAt(0);
  const l = (lastName || "").trim().charAt(0);
  if (f && l) return (f + l).toUpperCase();
  if (f) return f.toUpperCase();
  return "A";
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, unreadCount, wishlistItems } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = Boolean(user && user.role === "ADMIN");
  const isCustomer = Boolean(user && user.role === "CUSTOMER");

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const initials = getInitials(user?.firstName, user?.lastName);
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email?.split("@")[0] || "Account";
  const firstName = user?.firstName || user?.email?.split("@")[0] || "Account";

  return (
    <header className="sticky top-0 z-40 bg-aurena-cream/95 backdrop-blur-md border-b border-aurena-border/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Aurena Nails Home"
        >
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-aurena-blush via-aurena-nude to-aurena-rosegold flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <span className="block font-serif text-xl sm:text-2xl font-bold tracking-wider text-aurena-charcoal">
              AURENA NAILS
            </span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-aurena-rosegold font-medium">
              Luxury Nail Studio
            </span>
          </div>
        </Link>

        {/* Desktop Primary Nav */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7"
        >
          {CORE_NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors relative py-1 ${
                  active
                    ? "text-aurena-rosegold font-semibold"
                    : "text-aurena-charcoal/80 hover:text-aurena-rosegold"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-aurena-rosegold rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {!user ? (
            /* Guest Actions */
            <div className="flex items-center gap-3">
              <Link
                href="/booking"
                data-testid="hero-book-cta"
                className="px-5 py-2.5 rounded-full bg-aurena-rosegold text-white text-xs font-semibold uppercase tracking-wider hover:bg-aurena-charcoal transition shadow-soft flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </Link>
              <div className="h-4 w-px bg-aurena-border" />
              <Link
                href="/login"
                data-testid="nav-login"
                className="px-3.5 py-2 rounded-full text-xs font-semibold text-aurena-charcoal hover:text-aurena-rosegold transition uppercase tracking-wider"
              >
                Login
              </Link>
              <Link
                href="/register"
                data-testid="nav-register"
                className="px-4 py-2 rounded-full border border-aurena-rosegold text-xs font-semibold text-aurena-rosegold hover:bg-aurena-rosegold hover:text-white transition uppercase tracking-wider"
              >
                Register
              </Link>
            </div>
          ) : (
            /* Authenticated User Menu (Customer or Admin) */
            <div className="flex items-center gap-2.5">
              {/* Quick Book CTA for Customers */}
              {isCustomer && (
                <Link
                  href="/booking"
                  className="px-4 py-2 rounded-full bg-aurena-rosegold text-white text-xs font-semibold tracking-wider hover:bg-aurena-charcoal transition shadow-soft flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Now</span>
                </Link>
              )}

              {/* Quick Studio Console Badge for Admin */}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  data-testid="nav-admin"
                  className="px-3.5 py-2 rounded-full bg-aurena-charcoal text-white text-xs font-semibold tracking-wide hover:bg-aurena-rosegold transition shadow-soft flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-aurena-gold" />
                  <span>Admin Console</span>
                </Link>
              )}

              {/* Customer Wishlist Icon */}
              {isCustomer && (
                <Link
                  href="/wishlist"
                  aria-label="Wishlist"
                  title="Wishlist"
                  data-testid="nav-wishlist"
                  className={`relative p-2.5 rounded-full border border-transparent hover:border-aurena-border hover:bg-white transition ${
                    isActive("/wishlist")
                      ? "text-aurena-rosegold bg-aurena-blush/30"
                      : "text-aurena-charcoal/80"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-aurena-rosegold text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {wishlistItems.length}
                    </span>
                  )}
                </Link>
              )}

              {/* Customer Notifications Icon */}
              {isCustomer && (
                <Link
                  href="/notifications"
                  aria-label="Notifications"
                  title="Notifications"
                  data-testid="nav-notifications"
                  className={`relative p-2.5 rounded-full border border-transparent hover:border-aurena-border hover:bg-white transition ${
                    isActive("/notifications")
                      ? "text-aurena-rosegold bg-aurena-blush/30"
                      : "text-aurena-charcoal/80"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span
                      data-testid="nav-unread-badge"
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-aurena-rosegold text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Unified Luxury Account Capsule Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  data-testid="nav-profile"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all ${
                    dropdownOpen
                      ? "bg-white border-aurena-rosegold shadow-luxury"
                      : "bg-white/80 border-aurena-border/90 hover:border-aurena-rosegold hover:bg-white"
                  }`}
                >
                  {/* Avatar monogram or image */}
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-aurena-rosegold to-aurena-blush flex items-center justify-center text-white text-xs font-bold shadow-soft shrink-0">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </span>

                  <span className="text-xs font-semibold text-aurena-charcoal max-w-[100px] truncate">
                    {firstName}
                  </span>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-aurena-muted transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180 text-aurena-rosegold" : ""
                    }`}
                  />
                </button>

                {/* Floating Luxury Account Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white/95 backdrop-blur-xl border border-aurena-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                  >
                    {/* User Header Profile Card */}
                    <div className="px-3.5 py-3 rounded-xl bg-aurena-beige/40 border border-aurena-border/50 mb-1.5 flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-aurena-rosegold to-aurena-blush flex items-center justify-center text-white font-bold text-sm shadow-soft shrink-0">
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt={displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-sm font-bold text-aurena-charcoal truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-aurena-muted truncate">
                          {user.email}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                            isAdmin
                              ? "bg-aurena-charcoal text-aurena-gold"
                              : "bg-aurena-rosegold/15 text-aurena-rosegold"
                          }`}
                        >
                          {isAdmin ? "✦ Studio Administrator" : "✦ VIP Client"}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-0.5">
                      {isAdmin ? (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-aurena-muted">
                            Studio Management
                          </div>
                          <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <LayoutDashboard className="w-4 h-4 text-aurena-rosegold" />
                            <span>Dashboard Overview</span>
                          </Link>
                          <Link
                            href="/admin/appointments"
                            data-testid="nav-admin-appointments"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <Calendar className="w-4 h-4 text-aurena-rosegold" />
                            <span>Manage Appointments</span>
                          </Link>
                          <Link
                            href="/admin/services"
                            data-testid="nav-admin-services"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <Scissors className="w-4 h-4 text-aurena-rosegold" />
                            <span>Services Catalog</span>
                          </Link>
                          <Link
                            href="/admin/customers"
                            data-testid="nav-admin-customers"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <Users className="w-4 h-4 text-aurena-rosegold" />
                            <span>Customer Directory</span>
                          </Link>
                          <Link
                            href="/admin/settings"
                            data-testid="nav-admin-settings"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <Settings className="w-4 h-4 text-aurena-rosegold" />
                            <span>Studio Settings</span>
                          </Link>
                          <div className="my-1.5 border-t border-aurena-border/60" />
                          <Link
                            href="/profile"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <User className="w-4 h-4 text-aurena-muted" />
                            <span>Administrator Profile</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/profile"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <User className="w-4 h-4 text-aurena-rosegold" />
                            <span>My Profile & Account</span>
                          </Link>
                          <Link
                            href="/appointments"
                            data-testid="nav-appointments"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <Calendar className="w-4 h-4 text-aurena-rosegold" />
                            <span>My Appointments</span>
                          </Link>
                          <Link
                            href="/wishlist"
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <Heart className="w-4 h-4 text-aurena-rosegold" />
                              <span>Saved Wishlist</span>
                            </div>
                            {wishlistItems.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-aurena-beige text-[10px] font-bold text-aurena-rosegold">
                                {wishlistItems.length}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/notifications"
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <Bell className="w-4 h-4 text-aurena-rosegold" />
                              <span>Notifications</span>
                            </div>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-aurena-rosegold text-[10px] font-bold text-white">
                                {unreadCount}
                              </span>
                            )}
                          </Link>
                        </>
                      )}

                      {/* Sign Out Action */}
                      <div className="pt-1.5 mt-1.5 border-t border-aurena-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          data-testid="nav-logout"
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={
            mobileOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
          data-testid="mobile-menu-toggle"
          className="lg:hidden p-2.5 rounded-2xl border border-aurena-border text-aurena-charcoal hover:bg-aurena-beige transition"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile Navigation"
          data-testid="mobile-nav-drawer"
          className="lg:hidden bg-aurena-cream/98 backdrop-blur-xl border-b border-aurena-border px-4 pt-3 pb-6 space-y-4 shadow-luxury animate-in fade-in"
        >
          {/* User Profile Summary on Mobile */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-white border border-aurena-border shadow-soft flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-aurena-rosegold to-aurena-blush flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-bold text-aurena-charcoal truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-aurena-muted truncate">
                  {user.email}
                </p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? "bg-aurena-charcoal text-aurena-gold"
                      : "bg-aurena-rosegold/15 text-aurena-rosegold"
                  }`}
                >
                  {isAdmin ? "✦ Administrator" : "✦ VIP Client"}
                </span>
              </div>
            </div>
          )}

          {/* Core Studio Navigation Links */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-aurena-muted">
              Studio Navigation
            </p>
            {CORE_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-aurena-blush/40 text-aurena-rosegold font-semibold"
                    : "text-aurena-charcoal hover:bg-aurena-beige"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="pt-2 border-t border-aurena-border space-y-1">
            {!user ? (
              <div className="space-y-2 pt-1">
                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 rounded-full bg-aurena-rosegold text-white text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-soft"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                </Link>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-center py-2 rounded-full border border-aurena-border text-xs font-semibold uppercase tracking-wider text-aurena-charcoal"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-center py-2 rounded-full border border-aurena-rosegold text-xs font-semibold uppercase tracking-wider text-aurena-rosegold"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ) : isAdmin ? (
              <div className="space-y-1">
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-aurena-muted">
                  Admin Tools
                </p>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-aurena-charcoal text-white"
                >
                  <LayoutDashboard className="w-4 h-4 text-aurena-gold" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  href="/admin/appointments"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <Calendar className="w-4 h-4 text-aurena-rosegold" />
                  <span>Appointments</span>
                </Link>
                <Link
                  href="/admin/services"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <Scissors className="w-4 h-4 text-aurena-rosegold" />
                  <span>Services</span>
                </Link>
                <Link
                  href="/admin/customers"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <Users className="w-4 h-4 text-aurena-rosegold" />
                  <span>Customers</span>
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <Settings className="w-4 h-4 text-aurena-rosegold" />
                  <span>Settings</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <User className="w-4 h-4 text-aurena-muted" />
                  <span>Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-aurena-muted">
                  Client Account
                </p>
                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 rounded-full bg-aurena-rosegold text-white text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-soft mb-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book New Appointment</span>
                </Link>
                <Link
                  href="/appointments"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <Calendar className="w-4 h-4 text-aurena-rosegold" />
                  <span>My Appointments</span>
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-aurena-rosegold" />
                    <span>Saved Wishlist</span>
                  </div>
                  {wishlistItems.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-aurena-beige text-xs font-bold text-aurena-rosegold">
                      {wishlistItems.length}
                    </span>
                  )}
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-aurena-rosegold" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-aurena-rosegold text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-aurena-charcoal hover:bg-aurena-beige"
                >
                  <User className="w-4 h-4 text-aurena-muted" />
                  <span>Profile & Account</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
