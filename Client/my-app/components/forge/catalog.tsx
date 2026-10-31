"use client";
import "@/app/forge-catalog.css";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, SlidersHorizontal, Loader2, X } from "lucide-react";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import { ProductGrid } from "@/components/product-grid";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealCountdown } from "./countdown";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  catalogFilterChips,
  catalogHref,
  clearCatalogFilters,
  removeCatalogFilter,
} from "@/lib/catalog-filters";

export function Catalog({ dealsOnly = false }: { dealsOnly?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [view, setView] = useState("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [navigating, startTransition] = useTransition();
  const appliedFilters = catalogFilterChips(new URLSearchParams(params));
  const queryParams = useMemo(
    () => ({
      ...Object.fromEntries(params),
      limit: 12,
      sort:
        params.get("sort") ||
        (dealsOnly ? "-discount_percentage" : "-created_at"),
      ...(dealsOnly ? { discounted: true } : {}),
    }),
    [params, dealsOnly],
  );
  const products = useQuery({
    queryKey: ["products", "catalog", queryParams],
    queryFn: () => ProductService.list(queryParams).then(requireSuccess),
    placeholderData: (previous) => previous,
  });
  const categories = useQuery({
    queryKey: ["products", "categories"],
    queryFn: () => ProductService.categories().then(requireSuccess),
  });
  const brands = useQuery({
    queryKey: ["products", "brands"],
    queryFn: () => ProductService.brands().then(requireSuccess),
  });
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort =
    params.get("sort") || (dealsOnly ? "-discount_percentage" : "-created_at");
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key !== "page") next.set("page", "1");
    navigate(next);
  }
  function navigate(next: URLSearchParams) {
    startTransition(() =>
      router.push(catalogHref(pathname, next), { scroll: false }),
    );
  }
  const updating = products.isFetching || navigating;
  const pageCount = Math.max(
    1,
    Math.ceil((products.data?.pagination?.total ?? 0) / 12),
  );
  const category = params.get("category");
  return (
    <>
      <section className="forge-page-heading">
        <div className="forge-container">
          <p className="forge-eyebrow">
            {dealsOnly ? "THE UPGRADE OPPORTUNITY" : "FIND YOUR NEXT LEVEL"}
          </p>
          <h1>
            {dealsOnly
              ? "More game. Less spend."
              : category
                ? `${category}. Unleashed.`
                : "Your next upgrade starts here."}
          </h1>
          <p>
            {dealsOnly
              ? "Current discounts, straight from the catalog. Find the right gear at a better price."
              : "From your first build to your next obsession. Explore hardware, peripherals and everything in between."}
          </p>
          {dealsOnly && <DealCountdown />}
        </div>
      </section>
      <div className="forge-container forge-catalog">
        <div className="forge-catalog-sidebar">
          <FilterSidebar
            categories={categories.data?.data ?? []}
            brands={brands.data?.data ?? []}
            dealsOnly={dealsOnly}
          />
        </div>
        <div className="min-w-0">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="forge-mobile-filter-trigger">
                <SlidersHorizontal size={16} />
                Filters
                <span className="forge-filter-count">
                  {appliedFilters.length} applied
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="forge-filter-sheet">
              <SheetHeader className="forge-filter-sheet-header">
                <p className="forge-eyebrow">MAKE IT YOURS</p>
                <SheetTitle>Refine your loadout</SheetTitle>
                <SheetDescription>
                  Choose your gear and budget. Apply when you’re ready.
                </SheetDescription>
              </SheetHeader>
              <FilterSidebar
                variant="drawer"
                categories={categories.data?.data ?? []}
                brands={brands.data?.data ?? []}
                dealsOnly={dealsOnly}
                onApply={() => setFilterOpen(false)}
              />
            </SheetContent>
          </Sheet>
          {appliedFilters.length > 0 && (
            <section
              className="forge-applied-filters"
              aria-label="Applied product filters"
            >
              <span className="forge-applied-label">YOUR SELECTION</span>
              <div className="forge-filter-chips">
                {appliedFilters.map((chip) => (
                  <button
                    key={chip.id}
                    className="forge-filter-chip"
                    type="button"
                    aria-label={`Remove filter: ${chip.label}`}
                    onClick={() =>
                      navigate(
                        removeCatalogFilter(new URLSearchParams(params), chip),
                      )
                    }
                  >
                    {chip.label}
                    <X size={13} aria-hidden="true" />
                  </button>
                ))}
                <button
                  className="forge-clear-filters"
                  type="button"
                  onClick={() =>
                    navigate(clearCatalogFilters(new URLSearchParams(params)))
                  }
                >
                  Clear all filters
                </button>
              </div>
            </section>
          )}
          <div className="forge-catalog-toolbar">
            <p
              className="text-xs text-muted-foreground"
              role="status"
              aria-atomic="true"
            >
              {updating ? (
                <span className="flex items-center gap-2">
                  <Loader2
                    className="forge-catalog-spinner"
                    size={14}
                    aria-hidden="true"
                  />
                  {products.isLoading
                    ? "Finding your gear…"
                    : "Updating your loadout…"}
                </span>
              ) : products.isError ? (
                "Products couldn’t be loaded. Try again below."
              ) : (
                <>
                  <strong className="text-foreground">
                    {products.data?.pagination?.total ?? 0}
                  </strong>{" "}
                  products{category && ` / ${category}`}
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="catalog-sort" className="sr-only">
                Sort products
              </label>
              <Select
                value={sort}
                onValueChange={(value) => update("sort", value)}
              >
                <SelectTrigger
                  id="catalog-sort"
                  className="w-[200px] text-xs sm:w-[220px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent aria-label="Sort products">
                  <SelectItem value="-created_at">Newest arrivals</SelectItem>
                  <SelectItem value="final_price">
                    Price: low to high
                  </SelectItem>
                  <SelectItem value="-final_price">
                    Price: high to low
                  </SelectItem>
                  <SelectItem value="-discount_percentage">
                    Biggest discount
                  </SelectItem>
                  <SelectItem value="name">Name: A–Z</SelectItem>
                </SelectContent>
              </Select>
              <div className="forge-view-buttons" aria-label="Product display">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List size={17} />
                </button>
              </div>
            </div>
          </div>
          <div className="forge-catalog-results" aria-busy={updating}>
            <ProductGrid
              products={products.data?.data ?? []}
              isLoading={products.isLoading}
              isError={products.isError}
              errorMessage={products.error?.message}
              onRetry={() => products.refetch()}
              loadingCount={6}
              className={
                view === "list"
                  ? "forge-list-grid"
                  : "md:grid-cols-2 xl:grid-cols-3"
              }
              emptyTitle={
                dealsOnly
                  ? "No active deals in this loadout."
                  : "No matching gear."
              }
            />
          </div>
          <nav
            className="mt-8 flex items-center justify-between gap-3"
            aria-label="Catalog pages"
          >
            <Button
              variant="outline"
              disabled={page <= 1 || updating}
              onClick={() => update("page", String(page - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-mono text-muted-foreground">
              {page} / {pageCount}
            </span>
            <Button
              variant="outline"
              disabled={page >= pageCount || updating}
              onClick={() => update("page", String(page + 1))}
            >
              Next
            </Button>
          </nav>
        </div>
      </div>
    </>
  );
}
