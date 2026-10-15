"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ initialUser = null, children }) {
  const router = useRouter();
  const [user, setUserState] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [inactiveMessage, setInactiveMessage] = useState("");
  const [wishlistItems, setWishlistItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const didInitialCheck = useRef(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshUserExtras = useCallback(async (activeUser) => {
    if (!activeUser || activeUser.role === "ADMIN") {
      setWishlistItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [wishRes, notifRes] = await Promise.all([
        fetch("/api/wishlist", {
          credentials: "include",
          cache: "no-store"
        }),
        fetch("/api/notifications?limit=5", {
          credentials: "include",
          cache: "no-store"
        })
      ]);
      if (wishRes.ok) {
        const wData = await wishRes.json();
        setWishlistItems(wData.items || []);
      }
      if (notifRes.ok) {
        const nData = await notifRes.json();
        setUnreadCount(Number(nData.unreadCount || 0));
      }
    } catch {
      // Ignore network errors during background sync
    }
  }, []);

  const setUser = useCallback(
    (nextUser) => {
      setUserState(nextUser);
      setLoading(false);
      refreshUserExtras(nextUser);
    },
    [refreshUserExtras]
  );

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json();
      if (res.status === 403 && data?.inactive) {
        setUserState(null);
        setInactiveMessage(
          data.error ||
            "Your account is currently inactive. Please contact Aurena Nails."
        );
        setWishlistItems([]);
        setUnreadCount(0);
        return null;
      }
      setInactiveMessage("");
      const nextUser = data?.user || null;
      setUserState(nextUser);
      await refreshUserExtras(nextUser);
      return nextUser;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshUserExtras]);

  useEffect(() => {
    if (initialUser) {
      setUserState(initialUser);
      setLoading(false);
      refreshUserExtras(initialUser);
      didInitialCheck.current = true;
    } else if (!didInitialCheck.current) {
      didInitialCheck.current = true;
      refreshSession();
    }
  }, [initialUser, refreshUserExtras, refreshSession]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      setUserState(null);
      setWishlistItems([]);
      setUnreadCount(0);
      showToast("You have been signed out.", "info");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  const isServiceWishlisted = useCallback(
    (serviceId) => wishlistItems.some((item) => item.serviceId === serviceId),
    [wishlistItems]
  );

  const isGalleryWishlisted = useCallback(
    (galleryId) => wishlistItems.some((item) => item.galleryId === galleryId),
    [wishlistItems]
  );

  const toggleWishlist = useCallback(
    async ({ serviceId, galleryId }) => {
      if (!user) {
        showToast(
          "Please sign in to save favourites to your wishlist.",
          "error"
        );
        router.push("/login");
        return false;
      }

      const existing = wishlistItems.find((item) =>
        serviceId ? item.serviceId === serviceId : item.galleryId === galleryId
      );

      if (existing) {
        const res = await fetch(
          `/api/wishlist?id=${encodeURIComponent(existing.id)}`,
          {
            method: "DELETE",
            credentials: "include"
          }
        );
        if (res.ok) {
          setWishlistItems((prev) => prev.filter((i) => i.id !== existing.id));
          showToast("Removed from your wishlist.", "info");
          return false;
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ serviceId, galleryId })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.item) {
            setWishlistItems((prev) => [data.item, ...prev]);
          }
          showToast("Saved to your wishlist.");
          return true;
        }
      }
      return false;
    },
    [user, wishlistItems, router, showToast]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        inactiveMessage,
        wishlistItems,
        setWishlistItems,
        unreadCount,
        setUnreadCount,
        refreshSession,
        refreshUserExtras,
        logout,
        isServiceWishlisted,
        isGalleryWishlisted,
        toggleWishlist,
        showToast
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="toast-notification"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-luxury border text-sm font-medium transition-all flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-red-950 text-white border-red-800"
              : toast.type === "info"
                ? "bg-aurena-charcoal text-white border-aurena-charcoal"
                : "bg-aurena-charcoal text-aurena-cream border-aurena-rosegold"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-75 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
