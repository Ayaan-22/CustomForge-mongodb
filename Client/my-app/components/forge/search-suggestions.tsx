"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ArrowUpRight,
  History,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { ProductService } from "@/services/product-service";
import { ProductImage } from "./product-image";
import { finalPrice, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  categoryEntry,
  categoryHref,
  useNavigationCategories,
} from "./navigation-categories";
import {
  RECENT_SEARCH_KEY,
  type SearchChoice,
  type SearchSuggestionProps,
} from "./search-types";

type ResultState = {
  query: string;
  status: "loading" | "ready" | "error";
  products: Product[];
};

export default function SearchSuggestions({
  query,
  listId,
  activeIndex,
  onChoices,
  onActiveIndex,
  onSelect,
}: SearchSuggestionProps) {
  const trimmed = query.trim();
  const { categories, status: categoryStatus } = useNavigationCategories(true);
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState>({
    query: "",
    status: "ready",
    products: [],
  });
  const [attempt, setAttempt] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(RECENT_SEARCH_KEY) || "[]",
      );
      if (Array.isArray(stored))
        setRecent(
          stored
            .filter(
              (item): item is string =>
                typeof item === "string" && item.length <= 80,
            )
            .slice(0, 5),
        );
    } catch {
      /* Search still works when local history is unavailable. */
    }
  }, []);
  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    setResult({ query: trimmed, status: "loading", products: [] });
    // Never let a slower previous request replace a newer query's suggestions.
    const timer = setTimeout(() => {
      ProductService.list({ q: trimmed, limit: 5, page: 1 })
        .then((response) => {
          if (cancelled) return;
          setResult({
            query: trimmed,
            status: response.error ? "error" : "ready",
            products: response.error ? [] : response.data || [],
          });
        })
        .catch(() => {
          if (!cancelled)
            setResult({ query: trimmed, status: "error", products: [] });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, attempt]);
  const matchesQuery = result.query === trimmed;
  const products = matchesQuery ? result.products : [];
  const loading =
    trimmed.length >= 2 && (!matchesQuery || result.status === "loading");
  const failed =
    trimmed.length >= 2 && matchesQuery && result.status === "error";
  const choices = useMemo<SearchChoice[]>(() => {
    const productChoices: SearchChoice[] =
      trimmed.length >= 2 && result.query === trimmed
        ? result.products.map((product) => ({
            id: `product-${product.id}`,
            href: `/products/${encodeURIComponent(product.id)}`,
            label: product.name,
            kind: "product",
          }))
        : [];
    const categoryChoices: SearchChoice[] = categories
      .filter(
        (category) =>
          !trimmed ||
          `${category} ${categoryEntry(category).label}`
            .toLowerCase()
            .includes(trimmed.toLowerCase()),
      )
      .slice(0, trimmed ? 3 : 4)
      .map((category, index) => ({
        id: `category-${index}`,
        href: categoryHref(category),
        label: categoryEntry(category).label,
        kind: "category",
      }));
    const recentChoices: SearchChoice[] =
      trimmed.length < 2
        ? recent
            .filter(
              (entry) =>
                !trimmed || entry.toLowerCase().includes(trimmed.toLowerCase()),
            )
            .slice(0, 3)
            .map((entry, index) => ({
              id: `recent-${index}`,
              href: `/search?q=${encodeURIComponent(entry)}`,
              label: entry,
              kind: "recent",
            }))
        : [];
    return [
      ...recentChoices,
      ...productChoices,
      ...categoryChoices,
      ...(trimmed
        ? [
            {
              id: "all",
              href: `/search?q=${encodeURIComponent(trimmed)}`,
              label: `Search all for “${trimmed}”`,
              kind: "all" as const,
            },
          ]
        : []),
    ];
  }, [trimmed, result.query, result.products, categories, recent]);
  useEffect(() => {
    onChoices(choices);
  }, [choices, onChoices]);
  useEffect(() => {
    const selected = list.current?.querySelector<HTMLElement>(
      `[data-choice-index="${activeIndex}"]`,
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  return (
    <>
      <div className="forge-search-panel-top">
        <span>
          {trimmed ? "Find your next upgrade" : "Explore CustomForge"}
        </span>
        {recent.length > 0 && !trimmed && (
          <button
            type="button"
            onClick={() => {
              setRecent([]);
              try {
                localStorage.removeItem(RECENT_SEARCH_KEY);
              } catch {
                /* Optional history. */
              }
            }}
          >
            Clear history
          </button>
        )}
      </div>
      {loading && (
        <div className="forge-search-feedback" role="status">
          <Loader2
            size={17}
            className="forge-search-spinner"
            aria-hidden="true"
          />{" "}
          Searching the catalog…
        </div>
      )}
      {failed && (
        <div className="forge-search-feedback" role="status">
          <span>
            Suggestions couldn’t load. You can still submit your search.
          </span>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !failed && trimmed.length >= 2 && products.length === 0 && (
        <div className="forge-search-empty" role="status">
          <PackageSearch size={22} aria-hidden="true" />
          <span>No product matches yet. Try a model, brand or category.</span>
        </div>
      )}
      {trimmed.length === 1 && (
        <div className="forge-search-feedback">
          Type one more character for product suggestions.
        </div>
      )}
      {!trimmed && categoryStatus === "loading" && choices.length === 0 && (
        <div className="forge-search-feedback" role="status">
          Loading categories…
        </div>
      )}
      {!trimmed && categoryStatus === "error" && choices.length === 0 && (
        <div className="forge-search-feedback" role="status">
          Enter a product or brand to search.
        </div>
      )}
      <div
        className="forge-search-choices"
        ref={list}
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
      >
        {choices.map((choice, index) => {
          const product =
            choice.kind === "product"
              ? products.find((entry) => choice.id === `product-${entry.id}`)
              : undefined;
          const category =
            choice.kind === "category"
              ? categories.find((entry) => categoryHref(entry) === choice.href)
              : undefined;
          const Icon = category
            ? categoryEntry(category).icon
            : choice.kind === "recent"
              ? History
              : Search;
          return (
            <Link
              id={`${listId}-${choice.id}`}
              href={choice.href}
              prefetch={false}
              role="option"
              aria-selected={activeIndex === index}
              tabIndex={-1}
              data-choice-index={index}
              className={`forge-search-choice ${activeIndex === index ? "is-selected" : ""} ${choice.kind === "all" ? "forge-search-all" : ""}`}
              key={choice.id}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => onActiveIndex(index)}
              onClick={(event) => onSelect(choice, event)}
            >
              {product ? (
                <span className="forge-search-thumb">
                  <ProductImage
                    src={product.images?.[0] || "/gaming-component.jpg"}
                    alt=""
                    fill
                    sizes="48px"
                  />
                </span>
              ) : (
                <span className="forge-search-choice-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
              )}
              <span className="forge-search-choice-copy">
                <strong>{choice.label}</strong>
                {product ? (
                  <small>
                    {product.brand} · {product.category} ·{" "}
                    <span
                      className={
                        product.availability === "In Stock"
                          ? "is-in-stock"
                          : undefined
                      }
                    >
                      {product.availability}
                    </span>
                  </small>
                ) : (
                  choice.kind !== "all" && (
                    <small>
                      {choice.kind === "recent"
                        ? "Recent search · this device"
                        : "Shop category"}
                    </small>
                  )
                )}
              </span>
              {product ? (
                <span className="forge-search-price">
                  {formatPrice(
                    product.finalPrice ??
                      finalPrice(
                        product.originalPrice,
                        product.discountPercentage,
                      ),
                  )}
                </span>
              ) : (
                <ArrowUpRight size={14} aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
      <div className="forge-search-hints" aria-hidden="true">
        <span>↑ ↓ Navigate</span>
        <span>Enter Select</span>
        <span>Esc Close</span>
      </div>
    </>
  );
}
