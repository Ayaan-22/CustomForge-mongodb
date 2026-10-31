"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/patterns/page-shell";
import { SectionHeader } from "@/components/patterns/section-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";
import { ProductCard } from "@/components/product-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchProducts } from "@/features/search/use-search-products";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 380;

export function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = useMemo(() => searchParams.get("q")?.trim() ?? "", [searchParams]);

  const [draft, setDraft] = useState(qFromUrl);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setDraft(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => () => {if (timer.current) clearTimeout(timer.current);}, []);
  function updateDraft(value: string) {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      if (value.trim().length >= 2) params.set('q', value.trim()); else params.delete('q');
      router.replace(pathname + '?' + params.toString(), {scroll:false});
    }, DEBOUNCE_MS);
  }
  const {data, isPending, isError, error, refetch} = useSearchProducts(qFromUrl, page);
  const items = data?.data ?? [];
  const pages = Math.max(1, Math.ceil((data?.pagination?.total ?? 0) / 20));
  const goPage = (next: number) => {const params = new URLSearchParams(searchParams.toString()); params.set('page', String(next)); router.push(pathname + '?' + params.toString());};

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      const next = draft.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (next.length >= 2) params.set("q", next);
      else params.delete("q");
      params.set("page", "1");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [draft, pathname, router, searchParams]
  );

  const showHint = qFromUrl.length > 0 && qFromUrl.length < 2;

  return (
    <PageShell>
      <SectionHeader
        title="Search"
        description="Find hardware, peripherals, and digital products. Results update as you type."
        actions={
          <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2 md:w-auto">
            <div className="relative flex-1">
              <Input
                value={draft}
                onChange={(e) => updateDraft(e.target.value)}
                placeholder="Search catalog…"
                className="h-10 rounded-lg border-border/80 bg-card/60 pr-3 pl-10"
                aria-label="Search query"
                autoComplete="off"
                spellCheck={false}
              />
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
            <Button type="submit" className="shrink-0">
              Go
            </Button>
          </form>
        }
      />

      <div className="mt-8 space-y-6">
        {showHint ? (
          <p className="text-sm text-muted-foreground" role="status">
            Enter at least <strong className="font-medium text-foreground">2 characters</strong>{" "}
            to search the catalog.
          </p>
        ) : null}

        {qFromUrl.length >= 2 && isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "Search failed"}
            onRetry={() => refetch()}
          />
        ) : null}

        {qFromUrl.length >= 2 && isPending ? <LoadingSkeleton variant="product-grid" /> : null}

        {qFromUrl.length >= 2 && !isPending && !isError && items.length === 0 ? (
          <EmptyState
            title="No products found"
            description={`We couldn’t find anything matching “${qFromUrl}”. Try different keywords or browse categories.`}
          />
        ) : null}

        {qFromUrl.length >= 2 && !isPending && !isError && items.length > 0 ? (
          <div
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : null}

        {pages > 1 && <nav aria-label="Search pages" className="flex items-center gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => goPage(page-1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => goPage(page+1)}>Next</Button></nav>}
        {qFromUrl.length === 0 && !draft.trim() ? (
          <EmptyState
            title="Start typing to search"
            description="Your query will sync to the URL so you can share or bookmark results."
          />
        ) : null}
      </div>
    </PageShell>
  );
}
