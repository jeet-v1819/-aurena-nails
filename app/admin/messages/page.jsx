"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatDateDisplay } from "@/utils/format";

export default function AdminMessagesPage() {
  const { showToast } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("read", filter);
      params.set("limit", "40");
      const res = await fetch(`/api/admin/messages?${params.toString()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function handleToggleRead(msg, read) {
    const res = await fetch(`/api/admin/messages/${msg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read })
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read } : m))
      );
      showToast(read ? "Message marked as read." : "Message marked as unread.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/messages/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        showToast("Contact message deleted.");
      }
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Contact Messages
          </h1>
          <p className="text-xs text-aurena-muted mt-1">
            View and respond to customer inquiries submitted through the contact
            page.
          </p>
        </div>

        <div className="flex gap-2">
          {[
            { id: "all", label: "All Messages" },
            { id: "false", label: "Unread" },
            { id: "true", label: "Read" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium ${
                filter === tab.id
                  ? "bg-aurena-charcoal text-white"
                  : "bg-white border border-aurena-border text-aurena-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl bg-aurena-beige animate-pulse" />
          ))
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`admin-message-card-${msg.id}`}
              className={`p-6 rounded-3xl border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                msg.read
                  ? "bg-white border-aurena-border"
                  : "bg-aurena-blush/20 border-aurena-rosegold"
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-serif text-lg font-bold text-aurena-charcoal">
                    {msg.subject}
                  </span>
                  {!msg.read && (
                    <span className="px-2.5 py-0.5 rounded-full bg-aurena-rosegold text-white text-[11px] font-semibold">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-sm text-aurena-charcoal leading-relaxed">
                  {msg.message}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-aurena-muted pt-1">
                  <span className="font-semibold text-aurena-charcoal">
                    {msg.name}
                  </span>
                  <span>{msg.email}</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-aurena-rosegold" />
                    {msg.mobile}
                  </span>
                  <span>{formatDateDisplay(msg.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleToggleRead(msg, !msg.read)}
                  data-testid={`toggle-read-msg-btn-${msg.id}`}
                  className="px-3.5 py-1.5 rounded-full border border-aurena-border bg-white text-xs font-medium hover:bg-aurena-beige flex items-center gap-1.5"
                >
                  {msg.read ? (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Mark Unread</span>
                    </>
                  ) : (
                    <>
                      <MailOpen className="w-3.5 h-3.5 text-aurena-rosegold" />
                      <span>Mark Read</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(msg)}
                  data-testid={`delete-msg-btn-${msg.id}`}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 rounded-3xl bg-white border border-aurena-border text-center text-sm text-aurena-muted">
            No contact messages found.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Contact Inquiry"
        message="Are you sure you want to delete this contact message?"
        confirmLabel="Delete Message"
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
