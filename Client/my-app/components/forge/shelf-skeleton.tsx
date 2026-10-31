import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("forge-product-card", className)}
      aria-label="Loading product"
      role="status"
    >
      <Skeleton className="h-[206px] rounded-none" />
      <div className="space-y-4 p-5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export function ShelfSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
