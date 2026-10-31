import { Suspense } from "react";
import { SearchPageContent } from "@/features/search/search-page-content";
import { PageShell } from "@/components/patterns/page-shell";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="space-y-6">
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
            <LoadingSkeleton variant="product-grid" />
          </div>
        </PageShell>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
