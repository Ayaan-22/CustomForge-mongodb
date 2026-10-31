"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PRODUCT_GRID =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

type LoadingSkeletonProps = {
  variant?: "product-grid" | "lines";
  count?: number;
  className?: string;
};

export function LoadingSkeleton({
  variant = "product-grid",
  count = 8,
  className,
}: LoadingSkeletonProps) {
  if (variant === "lines") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(PRODUCT_GRID, className)}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}
