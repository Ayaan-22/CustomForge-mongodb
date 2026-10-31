"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap } from "lucide-react";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import { ProductGrid } from "@/components/product-grid";
import { Community } from "./community";
import { cn } from "@/lib/utils";

export function HomeCollections() {
  const [tab, setTab] = useState("Featured");
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => ProductService.featured().then(requireSuccess),
  });
  const arrivals = useQuery({
    queryKey: ["products", "home-arrivals"],
    enabled: tab === "New arrivals",
    queryFn: () =>
      ProductService.list({
        limit: 8,
        sort: "-created_at",
        availability: "In Stock",
      }).then(requireSuccess),
  });
  const deals = useQuery({
    queryKey: ["products", "home-deals"],
    queryFn: () =>
      ProductService.list({
        limit: 4,
        discounted: true,
        sort: "-discount_percentage",
      }).then(requireSuccess),
    enabled: tab === "On sale",
  });
  const active =
    tab === "New arrivals" ? arrivals : tab === "On sale" ? deals : featured;
  const products = (active.data?.data ?? [])
    .filter((p) => tab !== "On sale" || (p.discountPercentage ?? 0) > 0)
    .slice(0, 4);
  function handleTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const labels = ["Featured", "On sale", "New arrivals"];
    let next = labels.indexOf(tab);
    if (event.key === "ArrowRight") next = (next + 1) % labels.length;
    else if (event.key === "ArrowLeft")
      next = (next + labels.length - 1) % labels.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = labels.length - 1;
    else return;
    event.preventDefault();
    setTab(labels[next]);
    const buttons =
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    buttons[next]?.focus();
  }
  return (
    <>
      <div className="forge-tabs-row">
        <div
          className="forge-tabs"
          role="tablist"
          aria-label="Product collections"
          onKeyDown={handleTabKey}
        >
          {["Featured", "On sale", "New arrivals"].map((label) => (
            <button
              role="tab"
              tabIndex={tab === label ? 0 : -1}
              id={`tab-${label.replaceAll(" ", "-")}`}
              aria-controls="home-product-panel"
              aria-selected={tab === label}
              key={label}
              onClick={() => setTab(label)}
              className={cn(tab === label && "is-active")}
            >
              {label === "On sale" && <Zap size={14} />} {label}
            </button>
          ))}
        </div>
        <span className="forge-section-note">
          <i className="forge-status-dot" />
          YOUR NEXT UPGRADE IS HERE
        </span>
      </div>
      <div
        id="home-product-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab.replaceAll(" ", "-")}`}
      >
        <ProductGrid
          products={products}
          isLoading={active.isLoading}
          isError={active.isError}
          errorMessage={active.error?.message}
          onRetry={() => active.refetch()}
          loadingCount={4}
        />
      </div>
    </>
  );
}

export function HomeRecommendations() {
  const top = useQuery({
    queryKey: ["products", "top"],
    queryFn: () => ProductService.top().then(requireSuccess),
  });
  const arrivals = useQuery({
    queryKey: ["products", "home-arrivals"],
    queryFn: () =>
      ProductService.list({
        limit: 8,
        sort: "-created_at",
        availability: "In Stock",
      }).then(requireSuccess),
    enabled: !top.data?.data?.length,
  });
  const hasFavorites = !!top.data?.data?.length;
  const recommendations = hasFavorites ? top : arrivals;
  return (
    <>
      <div className="forge-section-heading">
        <div>
          <p className="forge-eyebrow">
            {hasFavorites ? "THE COMMUNITY'S LOADOUT" : "FRESH FROM THE FORGE"}
          </p>
          <h2>
            {hasFavorites ? "Player favorites." : "More ways to level up."}
          </h2>
        </div>
        <Link
          href={hasFavorites ? "/products?minRating=4" : "/products"}
          className="forge-text-link"
        >
          {hasFavorites ? "Explore top-rated gear" : "Explore new arrivals"}{" "}
          <ArrowRight size={16} />
        </Link>
      </div>
      <ProductGrid
        products={(recommendations.data?.data ?? []).slice(0, 4)}
        isLoading={recommendations.isLoading}
        isError={recommendations.isError}
        errorMessage={recommendations.error?.message}
        onRetry={() => recommendations.refetch()}
        loadingCount={4}
      />
    </>
  );
}
export function HomeCommunity() {
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => ProductService.featured().then(requireSuccess),
  });
  const top = useQuery({
    queryKey: ["products", "top"],
    queryFn: () => ProductService.top().then(requireSuccess),
  });
  return (
    <Community product={top.data?.data?.[0] ?? featured.data?.data?.[0]} />
  );
}
