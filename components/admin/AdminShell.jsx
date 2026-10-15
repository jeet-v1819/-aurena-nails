"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  CalendarOff,
  Clock,
  FileText,
  Film,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Scissors,
  Settings,
  Sparkles,
  Star,
  User,
  Users,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/services", label: "Services", icon: Scissors },
  { href: "/admin/categories", label: "Categories", icon: FolderKanban },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/videos", label: "Videos", icon: Film },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/content", label: "Website Content", icon: FileText },
  { href: "/admin/business-hours", label: "Business Hours", icon: Clock },
  { href: "/admin/business-hours#holidays", label: "Holidays", icon: CalendarOff },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User }
];

export default function AdminShell({ adminUser, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeUser = user || adminUser;
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) return;
    if (!loading && !activeUser) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoginRoute, loading, activeUser, pathname, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-aurena-cream text-aurena-charcoal">
        <p className="text-sm text-aurena-muted">
          Verifying administrator session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-aurena-cream text-aurena-charcoal">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Admin Sidebar Navigation"
        className="hidden lg:flex lg:w-64 lg:flex-col bg-aurena-charcoal text-aurena-cream border-r border-aurena-border/20 shrink-0"
      >
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-aurena-rosegold flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="block font-serif text-lg font-bold tracking-wider text-white">
                AURENA
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-aurena-blush">
                Salon Admin
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const baseHref = item.href.split("#")[0];
            const active =
              pathname === baseHref && !item.href.includes("#");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  active
                    ? "bg-aurena-rosegold text-white shadow-soft"
                    : "text-aurena-nude/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="block text-center py-2 px-3 rounded-xl bg-white/10 text-xs text-aurena-nude hover:bg-white/20 transition"
          >
            View Customer Website →
          </Link>
          <button
            type="button"
            onClick={logout}
            data-testid="admin-logout-btn"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium text-red-300 hover:bg-red-950/60 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-20 bg-white border-b border-aurena-border px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin navigation"
              className="lg:hidden p-2 rounded-xl border border-aurena-border text-aurena-charcoal"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-widest text-aurena-rosegold font-semibold">
                Administration Portal
              </p>
              <p className="font-serif text-lg font-bold text-aurena-charcoal">
                Aurena Nails Studio Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-aurena-charcoal">
                {adminUser?.firstName} {adminUser?.lastName}
              </p>
              <p className="text-[11px] text-aurena-muted">{adminUser?.email}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-aurena-blush/50 text-aurena-rosegold text-xs font-semibold">
              ADMIN
            </span>
          </div>
        </header>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden bg-black/60 flex"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="w-72 bg-aurena-charcoal text-aurena-cream h-full p-4 flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="font-serif text-lg font-bold text-white">
                    AURENA ADMIN
                  </span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close admin sidebar"
                    className="p-1.5 text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-aurena-nude hover:bg-white/10"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 rounded-xl bg-red-950/60 text-red-200 text-xs font-medium flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
