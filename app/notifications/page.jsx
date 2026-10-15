"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDateDisplay } from "@/utils/format";

export default function NotificationsPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    setUnreadCount,
    showToast
  } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications?limit=40", {
          credentials: "include",
          cache: "no-store"
        });
        if (res.status === 401) {
          router.replace("/login?redirect=/notifications");
          return;
        }
        const data = await res.json();
        if (res.ok && mounted) {
          setItems(data.items || []);
          setUnreadCount(Number(data.unreadCount || 0));
        }
      } catch {
        // Ignore network errors
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router, setUnreadCount]);

  async function handleMarkRead(id) {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ read: true })
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleMarkAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ markAll: true })
    });
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast("All notifications marked as read.");
    }
  }

  if (authLoading && loading && !user) {
    return (
      <div className="py-20 text-center text-sm text-aurena-muted">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Studio Alerts
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-aurena-charcoal mt-1">
            Notifications
          </h1>
        </div>
        {items.some((n) => !n.read) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-aurena-border text-xs font-medium text-aurena-charcoal hover:bg-aurena-beige transition self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-aurena-rosegold" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-aurena-muted">
          Loading notifications...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-aurena-border space-y-2">
          <Bell className="w-8 h-8 text-aurena-rosegold mx-auto" />
          <p className="font-serif text-xl font-bold text-aurena-charcoal">
            No Notifications Yet
          </p>
          <p className="text-xs text-aurena-muted">
            Updates about your appointments and account will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((notif) => (
            <div
              key={notif.id}
              data-testid={`notification-item-${notif.id}`}
              className={`p-6 rounded-3xl border flex items-start justify-between gap-4 transition ${
                notif.read
                  ? "bg-white border-aurena-border"
                  : "bg-aurena-blush/20 border-aurena-rosegold/40 shadow-soft"
              }`}
            >
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-semibold text-aurena-charcoal">
                  {notif.title}
                </h2>
                <p className="text-sm text-aurena-muted leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-[11px] text-aurena-muted pt-1">
                  {formatDateDisplay(notif.createdAt)}
                </p>
              </div>
              {!notif.read && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(notif.id)}
                  className="text-xs font-medium text-aurena-rosegold hover:underline shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
