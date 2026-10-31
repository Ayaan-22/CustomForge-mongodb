"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PRODUCT_GRID =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

type LoadingSkeletonProps = {
  variant?: "product-grid" | "lines" | "dashboard";
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
        <span className="sr-only">Loading results…</span>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading workspace data…</span>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-14 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className={cn(PRODUCT_GRID, className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading products…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}
