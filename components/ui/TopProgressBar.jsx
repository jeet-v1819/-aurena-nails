"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  // When pathname or search params settle, complete the progress animation
  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  // Intercept click on internal links
  useEffect(() => {
    function handleClick(e) {
      const anchor = e.target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, anchors on same page, or new tabs
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's the exact same path
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      setNavigating(true);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  if (!navigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 z-[99999] h-[3px] bg-transparent pointer-events-none"
    >
      <div className="h-full w-full bg-gradient-to-r from-aurena-rose via-aurena-gold to-aurena-rosegold shadow-[0_0_10px_rgba(183,110,121,0.8)] animate-pulse" />
    </div>
  );
}
