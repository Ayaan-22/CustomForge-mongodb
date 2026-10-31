"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useId,
  useRef,
  useTransition,
  useMemo,
  type FormEvent,
} from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  applyCatalogDraft,
  catalogHref,
  clearCatalogFilters,
  readCatalogDraft,
  validateCatalogPrices,
  validateCatalogSelections,
} from "@/lib/catalog-filters";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterSidebar({
  categories,
  brands,
  onApply,
  variant = "sidebar",
  dealsOnly = false,
}: {
  categories: string[];
  brands: string[];
  onApply?: () => void;
  variant?: "sidebar" | "drawer";
  dealsOnly?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [draft, setDraft] = useState(() =>
    readCatalogDraft(new URLSearchParams(params)),
  );
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const minPriceRef = useRef<HTMLInputElement>(null);
  const maxPriceRef = useRef<HTMLInputElement>(null);
  const selectionErrorRef = useRef<HTMLParagraphElement>(null);
  const selectionError = submitted
    ? validateCatalogSelections(draft)
    : undefined;
  const priceErrors = submitted
    ? validateCatalogPrices(draft.minPrice, draft.maxPrice)
    : {};
  const facetParams = useMemo(() => {
    const next = new URLSearchParams(params);
    next.delete("brand");
    next.delete("brands");
    next.delete("specs");
    next.delete("page");
    next.delete("limit");
    next.delete("sort");
    if (draft.category === "All") next.delete("category");
    else next.set("category", draft.category);
    if (dealsOnly) next.set("discounted", "true");
    return Object.fromEntries(next);
  }, [params, draft.category, dealsOnly]);
  const facets = useQuery({
    queryKey: ["products", "facets", facetParams],
    queryFn: () => ProductService.facets(facetParams).then(requireSuccess),
    staleTime: 30_000,
  });
  const facetData = facets.data?.data;
  const brandOptions = [
    ...new Set([
      ...(facetData?.available
        ? facetData.brands.map((option) => option.value)
        : brands),
      ...(draft.brands || []),
    ]),
  ].sort((a, b) => a.localeCompare(b));
  useEffect(() => {
    setDraft(readCatalogDraft(new URLSearchParams(params)));
    setSubmitted(false);
  }, [params]);
  function navigate(next: URLSearchParams) {
    startTransition(() =>
      router.push(catalogHref(pathname, next), { scroll: false }),
    );
    onApply?.();
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const errors = validateCatalogPrices(draft.minPrice, draft.maxPrice);
    if (errors.minPrice || errors.maxPrice) {
      (errors.minPrice ? minPriceRef : maxPriceRef).current?.focus();
      return;
    }
    if (validateCatalogSelections(draft)) {
      requestAnimationFrame(() => selectionErrorRef.current?.focus());
      return;
    }
    navigate(applyCatalogDraft(new URLSearchParams(params), draft));
  }
  const set = (
    key: "category" | "availability" | "minRating" | "minPrice" | "maxPrice",
    value: string,
  ) =>
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "category" ? { specs: {} } : {}),
    }));
  function toggleBrand(value: string) {
    setDraft((previous) => ({
      ...previous,
      brands: previous.brands?.includes(value)
        ? previous.brands.filter((brand) => brand !== value)
        : [...(previous.brands || []), value],
    }));
  }
  function toggleSpec(field: string, value: string) {
    setDraft((previous) => {
      const selected = previous.specs?.[field] || [];
      return {
        ...previous,
        specs: {
          ...previous.specs,
          [field]: selected.includes(value)
            ? selected.filter((option) => option !== value)
            : [...selected, value],
        },
      };
    });
  }
  return (
    <aside
      className={cn(
        "forge-filters forge-filter-panel",
        variant === "drawer" && "forge-filter-panel--drawer",
      )}
      aria-label="Product filters"
    >
      {variant === "sidebar" && (
        <div className="forge-filter-heading">
          <span>
            <SlidersHorizontal size={16} />
            Refine your loadout
          </span>
        </div>
      )}
      <form onSubmit={apply} className="forge-filter-form" noValidate>
        <div className="forge-filter-fields">
          {[
            {
              id: "category",
              label: "Category",
              value: draft.category,
              set: (value: string) => set("category", value),
              options: [
                "All",
                ...new Set([
                  ...categories,
                  ...(draft.category !== "All" ? [draft.category] : []),
                ]),
              ],
            },
            {
              id: "stock",
              label: "Availability",
              value: draft.availability,
              set: (value: string) => set("availability", value),
              options: ["All", "In Stock", "Preorder", "Out of Stock"],
            },
            {
              id: "rating",
              label: "Minimum rating",
              value: draft.minRating,
              set: (value: string) => set("minRating", value),
              options: ["0", "1", "2", "3", "4"],
            },
          ].map((field) => (
            <div className="forge-filter-field grid gap-2" key={field.id}>
              <Label htmlFor={`${inputId}-${field.id}`}>{field.label}</Label>
              <Select value={field.value} onValueChange={field.set}>
                <SelectTrigger
                  id={`${inputId}-${field.id}`}
                  className="w-full text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent aria-label={field.label}>
                  {field.options.map((value) => (
                    <SelectItem value={value} key={value}>
                      {field.id === "rating"
                        ? value === "0"
                          ? "Any rating"
                          : `${value} stars & up`
                        : value === "All"
                          ? `Any ${field.id === "stock" ? "stock status" : field.label.toLowerCase()}`
                          : value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <section
            className="forge-facet-options"
            aria-label="Brand and specification filters"
          >
            <p className="forge-filter-hint forge-facet-scope">
              Choose multiple options. Counts use applied search, budget, stock,
              rating and deals, before brand or spec selections.
            </p>
            {facets.isFetching && (
              <p role="status" className="forge-filter-hint">
                Updating filter options…
              </p>
            )}
            {facets.isError && (
              <p role="status" className="forge-filter-hint">
                Specification options couldn’t load.{" "}
                <button
                  type="button"
                  className="forge-facet-retry"
                  onClick={() => facets.refetch()}
                >
                  Try again
                </button>
              </p>
            )}
            {facetData?.reason && (
              <p className="forge-facet-notice">{facetData.reason}</p>
            )}
            <details className="forge-facet-group" open>
              <summary>
                Brands <span>{draft.brands?.length || "Any"}</span>
              </summary>
              <fieldset className="forge-facet-values">
                <legend className="sr-only">Select brands</legend>
                {brandOptions.map((value, index) => {
                  const count =
                    facetData?.available && !facets.isFetching
                      ? facetData.brands.find(
                          (option) => option.value === value,
                        )?.count
                      : undefined;
                  const checked = draft.brands?.includes(value) || false;
                  return (
                    <label
                      className="forge-facet-value"
                      key={value}
                      htmlFor={`${inputId}-brand-${index}`}
                    >
                      <input
                        id={`${inputId}-brand-${index}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(value)}
                        disabled={!checked && (draft.brands?.length || 0) >= 20}
                      />
                      <span>{value}</span>
                      {typeof count === "number" && (
                        <small aria-label={`${count} products`}>{count}</small>
                      )}
                    </label>
                  );
                })}
                {!brandOptions.length && (
                  <p className="forge-filter-hint">
                    No brands in this selection.
                  </p>
                )}
              </fieldset>
            </details>
            {facetData?.available &&
              facetData.specs.map((field) => (
                <details
                  className="forge-facet-group"
                  key={`${draft.category}-${field.key}`}
                  open={Boolean(draft.specs?.[field.key]?.length)}
                >
                  <summary>
                    {field.label}
                    <span>{draft.specs?.[field.key]?.length || "Any"}</span>
                  </summary>
                  <fieldset className="forge-facet-values">
                    <legend className="sr-only">
                      Select {field.label.toLowerCase()}
                    </legend>
                    {(draft.specs?.[field.key]?.length || 0) >= 12 && (
                      <p className="forge-filter-hint">
                        Up to 12 options per specification. Remove one to choose
                        another.
                      </p>
                    )}
                    {[
                      ...new Set([
                        ...field.options.map((option) => option.value),
                        ...(draft.specs?.[field.key] || []),
                      ]),
                    ].map((value, index) => {
                      const option = field.options.find(
                        (option) => option.value === value,
                      );
                      return (
                        <label
                          className="forge-facet-value"
                          key={value}
                          htmlFor={`${inputId}-${field.key}-${index}`}
                        >
                          <input
                            id={`${inputId}-${field.key}-${index}`}
                            type="checkbox"
                            checked={
                              draft.specs?.[field.key]?.includes(value) || false
                            }
                            onChange={() => toggleSpec(field.key, value)}
                            disabled={
                              !draft.specs?.[field.key]?.includes(value) &&
                              (draft.specs?.[field.key]?.length || 0) >= 12
                            }
                          />
                          <span>{option?.label || value}</span>
                          {option && !facets.isFetching && (
                            <small aria-label={`${option.count} products`}>
                              {option.count}
                            </small>
                          )}
                        </label>
                      );
                    })}
                  </fieldset>
                </details>
              ))}
            {draft.category === "All" && (
              <p className="forge-filter-hint">
                Choose a category to see its published specifications.
              </p>
            )}
            {draft.category !== "All" &&
              facetData?.available &&
              !facetData.specs.length && (
                <p className="forge-filter-hint">
                  This selection has no published specification options.
                </p>
              )}
          </section>
          <fieldset className="forge-filter-field forge-price-fieldset">
            <legend>Price range · USD</legend>
            <p id={`${inputId}-price-hint`} className="forge-filter-hint">
              Leave either field blank for no limit.
            </p>
            <div className="forge-price-inputs">
              {(["minPrice", "maxPrice"] as const).map((key) => (
                <div key={key}>
                  <Label htmlFor={`${inputId}-${key}`}>
                    {key === "minPrice" ? "Minimum" : "Maximum"}
                  </Label>
                  <Input
                    ref={key === "minPrice" ? minPriceRef : maxPriceRef}
                    id={`${inputId}-${key}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={draft[key]}
                    onChange={(event) => set(key, event.target.value)}
                    placeholder="Any"
                    aria-invalid={Boolean(priceErrors[key])}
                    aria-describedby={`${inputId}-price-hint${priceErrors[key] ? ` ${inputId}-${key}-error` : ""}`}
                  />
                </div>
              ))}
            </div>
            {(["minPrice", "maxPrice"] as const).map(
              (key) =>
                priceErrors[key] && (
                  <p
                    key={key}
                    id={`${inputId}-${key}-error`}
                    className="forge-filter-error"
                    role="alert"
                  >
                    {priceErrors[key]}
                  </p>
                ),
            )}
          </fieldset>
        </div>
        <div className="forge-filter-actions">
          {selectionError && (
            <p
              className="forge-filter-error"
              role="alert"
              tabIndex={-1}
              ref={selectionErrorRef}
            >
              {selectionError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Applying filters…" : "Apply filters"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              navigate(clearCatalogFilters(new URLSearchParams(params)));
            }}
          >
            <RotateCcw size={14} />
            Clear all filters
          </Button>
        </div>
      </form>
    </aside>
  );
}
