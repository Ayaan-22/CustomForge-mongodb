"use client";

import { memo } from "react";
import type { Product } from "@/lib/types";
import {
  ProductCard,
  ProductCardEmpty,
  ProductCardError,
  ProductCardSkeleton,
} from "@/components/product-card";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  products?: Product[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  loadingCount?: number;
  className?: string;
  itemClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const GRID_CLASSNAME =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

export const ProductGrid = memo(function ProductGrid({
  products = [],
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  loadingCount = 8,
  className,
  itemClassName,
  emptyTitle,
  emptyDescription,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(GRID_CLASSNAME, className)}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: loadingCount }).map((_, index) => (
          <ProductCardSkeleton
            key={`product-grid-skeleton-${index}`}
            className={itemClassName}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn(GRID_CLASSNAME, className)} role="status" aria-live="polite">
        <ProductCardError
          message={errorMessage}
          onRetry={onRetry}
          className={cn("sm:col-span-2 md:col-span-3 xl:col-span-4", itemClassName)}
        />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className={cn(GRID_CLASSNAME, className)} role="status" aria-live="polite">
        <ProductCardEmpty
          title={emptyTitle}
          description={emptyDescription}
          className={cn("sm:col-span-2 md:col-span-3 xl:col-span-4", itemClassName)}
        />
      </div>
    );
  }

  return (
    <div className={cn(GRID_CLASSNAME, className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} className={itemClassName} />
      ))}
    </div>
  );
});
