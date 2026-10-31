"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import {
  describeComplement,
  getComplementCategories,
  getProductProfile,
} from "@/lib/product-depth";
import type { Product } from "@/lib/types";

export function ProductComplements({ product }: { product: Product }) {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const supported = !!getProductProfile(product);
  useEffect(() => {
    if (!supported) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, [supported]);

  const query = useQuery({
    queryKey: ["products", product.id, "complements"],
    enabled: supported && visible,
    staleTime: 60_000,
    queryFn: async () => {
      const categories =
        requireSuccess(await ProductService.categories()).data ?? [];
      const targets = getComplementCategories(product, categories);
      const results = await Promise.all(
        targets.map(async (target) => {
          const response = requireSuccess(
            await ProductService.list({
              category: target.category,
              availability: "In Stock",
              limit: 4,
              page: 1,
            }),
          );
          return (response.data ?? [])
            .map((candidate) => describeComplement(product, candidate))
            .filter((candidate) => candidate !== null)
            .slice(0, 2);
        }),
      );
      return results.flat();
    },
  });
  if (!supported) return null;
  return (
    <section
      ref={section}
      className="forge-section forge-complements"
      id="pairs"
    >
      <div className="forge-section-heading">
        <div>
          <p className="forge-eyebrow">PLAN THE REST OF YOUR SETUP</p>
          <h2>Pairs to explore.</h2>
        </div>
        <Link href="/pc-builder" className="forge-text-link">
          Plan a build <ArrowRight size={16} />
        </Link>
      </div>
      <p className="forge-complements-intro">
        Complementary categories, selected from the live catalog. Listed matches
        cover specific published fields; verify the complete setup before
        purchasing.
      </p>
      {!visible || query.isLoading ? (
        <div
          className="forge-complement-grid"
          aria-busy="true"
          aria-label="Loading complementary products"
        >
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="forge-complements-empty" role="status">
          <Info />
          <p>Complementary products could not be loaded.</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCw size={15} /> Retry
          </Button>
        </div>
      ) : !query.data?.length ? (
        <div className="forge-complements-empty">
          <Info />
          <p>
            No suitable complementary listings were found in this catalog
            selection. Use the builder or compare specifications to continue
            planning.
          </p>
        </div>
      ) : (
        <div className="forge-complement-grid">
          {query.data.map((item) => (
            <div key={item.product.id} className="forge-complement-item">
              <ProductCard product={item.product} />
              <div className="forge-complement-reason">
                <span>
                  {item.needsVerification ? (
                    <Info size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {item.status}
                </span>
                <p>{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
