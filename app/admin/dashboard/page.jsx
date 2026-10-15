"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Film,
  Image as ImageIcon,
  Mail,
  Scissors,
  Star,
  Users,
  XCircle
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          return null;
        }
        if (res.status === 403) {
          router.push("/forbidden");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setError("Unable to load dashboard statistics."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-aurena-beige" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-aurena-beige" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-aurena-border text-center">
        <p className="text-sm text-red-600">{error || "Dashboard unavailable."}</p>
      </div>
    );
  }

  const { stats, charts } = data;

  const statCards = [
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      sub: `${stats.activeCustomers} active • ${stats.inactiveCustomers} inactive`,
      icon: Users,
      href: "/admin/customers"
    },
    {
      label: "Active Customers",
      value: stats.activeCustomers,
      sub: "Verified active accounts",
      icon: Users,
      href: "/admin/customers"
    },
    {
      label: "Inactive Customers",
      value: stats.inactiveCustomers,
      sub: "Deactivated accounts",
      icon: Users,
      href: "/admin/customers"
    },
    {
      label: "Total Services",
      value: stats.totalServices,
      sub: `${stats.activeServices} active services`,
      icon: Scissors,
      href: "/admin/services"
    },
    {
      label: "Active Services",
      value: stats.activeServices,
      sub: "Live on customer menu",
      icon: Scissors,
      href: "/admin/services"
    },
    {
      label: "Gallery Images",
      value: stats.galleryImages,
      sub: "Curated nail designs",
      icon: ImageIcon,
      href: "/admin/gallery"
    },
    {
      label: "Videos",
      value: stats.videos,
      sub: "Studio showcase films",
      icon: Film,
      href: "/admin/videos"
    },
    {
      label: "Total Appointments",
      value: stats.totalAppointments,
      sub: "All-time bookings",
      icon: Calendar,
      href: "/admin/appointments"
    },
    {
      label: "Pending Appointments",
      value: stats.pendingAppointments,
      sub: "Awaiting confirmation",
      icon: Clock,
      href: "/admin/appointments"
    },
    {
      label: "Confirmed Appointments",
      value: stats.confirmedAppointments,
      sub: "Upcoming scheduled slots",
      icon: CheckCircle2,
      href: "/admin/appointments"
    },
    {
      label: "Completed Appointments",
      value: stats.completedAppointments,
      sub: "Fulfilled studio visits",
      icon: CheckCircle2,
      href: "/admin/appointments"
    },
    {
      label: "Cancelled Appointments",
      value: stats.cancelledAppointments,
      sub: "Cancelled bookings",
      icon: XCircle,
      href: "/admin/appointments"
    },
    {
      label: "Reviews",
      value: stats.reviews,
      sub: "Customer service ratings",
      icon: Star,
      href: "/admin/reviews"
    },
    {
      label: "Unread Messages",
      value: stats.unreadMessages,
      sub: "Contact form inquiries",
      icon: Mail,
      href: "/admin/messages"
    }
  ];

  const maxMonthlyAppt = Math.max(
    1,
    ...(charts?.monthlySeries || []).map((m) => m.appointments)
  );
  const maxMonthlyCust = Math.max(
    1,
    ...(charts?.monthlySeries || []).map((m) => m.newCustomers)
  );

  return (
    <div data-testid="admin-dashboard-view" className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
          Executive Studio Overview
        </h1>
        <p className="text-xs text-aurena-muted mt-1">
          Live metrics and analytics queried directly from Neon PostgreSQL.
        </p>
      </div>

      {/* 14 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              data-testid={`stat-card-${card.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              className="p-5 rounded-2xl bg-white border border-aurena-border shadow-soft hover:border-aurena-rosegold transition flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-xs text-aurena-muted font-medium">
                  {card.label}
                </p>
                <p className="font-serif text-3xl font-bold text-aurena-charcoal mt-1">
                  {card.value}
                </p>
                <p className="text-[11px] text-aurena-muted mt-1">{card.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-aurena-blush/40 text-aurena-rosegold flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Month */}
        <div
          data-testid="chart-appointments-by-month"
          className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4"
        >
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Appointments by Month (Last 6 Months)
          </h2>
          <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
            {(charts?.monthlySeries || []).map((m) => {
              const heightPct = Math.max(
                8,
                Math.round((m.appointments / maxMonthlyAppt) * 100)
              );
              return (
                <div
                  key={m.key}
                  className="flex flex-col items-center justify-end h-full gap-1.5"
                >
                  <span className="text-xs font-semibold text-aurena-charcoal">
                    {m.appointments}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-xl bg-aurena-rosegold transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[11px] text-aurena-muted">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* New Customers by Month */}
        <div
          data-testid="chart-customers-by-month"
          className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4"
        >
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            New Customers by Month (Last 6 Months)
          </h2>
          <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
            {(charts?.monthlySeries || []).map((m) => {
              const heightPct = Math.max(
                8,
                Math.round((m.newCustomers / maxMonthlyCust) * 100)
              );
              return (
                <div
                  key={m.key}
                  className="flex flex-col items-center justify-end h-full gap-1.5"
                >
                  <span className="text-xs font-semibold text-aurena-charcoal">
                    {m.newCustomers}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-xl bg-aurena-charcoal transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[11px] text-aurena-muted">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Services */}
        <div
          data-testid="chart-popular-services"
          className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4"
        >
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Most Popular Services
          </h2>
          {charts?.popularServices?.length > 0 ? (
            <div className="space-y-3">
              {charts.popularServices.map((svc) => (
                <div key={svc.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-aurena-charcoal">
                      {svc.name}
                    </span>
                    <span className="text-aurena-muted">
                      {svc.bookings} booking{svc.bookings === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-aurena-beige rounded-full overflow-hidden">
                    <div
                      className="h-full bg-aurena-rosegold rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(15, svc.bookings * 20)
                        )}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-aurena-muted py-6">
              Popular service distribution will populate as appointments are booked.
            </p>
          )}
        </div>

        {/* Appointment Status Distribution */}
        <div
          data-testid="chart-status-distribution"
          className="p-6 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-4"
        >
          <h2 className="font-serif text-xl font-bold text-aurena-charcoal">
            Appointment Status Distribution
          </h2>
          <div className="space-y-3">
            {(charts?.statusDistribution || []).map((row) => {
              const pct =
                stats.totalAppointments > 0
                  ? Math.round((row.count / stats.totalAppointments) * 100)
                  : 0;
              return (
                <div key={row.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-aurena-charcoal">
                      {row.status}
                    </span>
                    <span className="text-aurena-muted">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-aurena-beige rounded-full overflow-hidden">
                    <div
                      className="h-full bg-aurena-rosegold rounded-full"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
