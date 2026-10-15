"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import ServiceCard from "@/components/customer/ServiceCard";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [srvRes, catRes] = await Promise.all([
          fetch("/api/services?limit=50", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" })
        ]);
        const [srvData, catData] = await Promise.all([
          srvRes.json(),
          catRes.json()
        ]);
        if (mounted) {
          setServices(srvData.items || []);
          setCategories(catData.items || []);
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
  }, []);

  const filteredServices = useMemo(() => {
    let list = [...services];

    if (activeCategory !== "ALL") {
      list = list.filter(
        (s) =>
          s.category?.slug === activeCategory || s.categoryId === activeCategory
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.shortDescription?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.category?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [services, activeCategory, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
          Curated Menu
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-aurena-charcoal">
          Nail Art & Care Services
        </h1>
        <p className="text-sm text-aurena-muted leading-relaxed">
          From sheer Japanese builder gel overlays to bespoke bridal nail
          couture. All prices shown are informational starting rates.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 border border-aurena-border shadow-soft space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition ${
              activeCategory === "ALL"
                ? "bg-aurena-rosegold text-white"
                : "bg-aurena-beige text-aurena-charcoal hover:bg-aurena-blush/50"
            }`}
          >
            All Services
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition ${
                activeCategory === cat.slug
                  ? "bg-aurena-rosegold text-white"
                  : "bg-aurena-beige text-aurena-charcoal hover:bg-aurena-blush/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-aurena-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nail services..."
            data-testid="services-search-input"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-aurena-border bg-aurena-cream text-sm text-aurena-charcoal"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-aurena-muted">
          Loading services...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
