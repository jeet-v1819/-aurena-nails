"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

const LoadingContext = createContext({
  showLoading: () => {},
  hideLoading: () => {},
  isLoading: false,
  loadingState: { title: "", message: "", badge: "" }
});

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    isOpen: false,
    title: "Please Wait",
    message: "Processing your request...",
    badge: "Aurena Nails"
  });

  const showLoading = useCallback(({ title, message, badge = "Aurena Nails" } = {}) => {
    setLoadingState({
      isOpen: true,
      title: title || "Please Wait",
      message: message || "Processing your request and preparing the next screen...",
      badge
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = useMemo(
    () => ({
      showLoading,
      hideLoading,
      isLoading: loadingState.isOpen,
      loadingState
    }),
    [showLoading, hideLoading, loadingState]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingOverlay
        isOpen={loadingState.isOpen}
        title={loadingState.title}
        message={loadingState.message}
        badge={loadingState.badge}
      />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
