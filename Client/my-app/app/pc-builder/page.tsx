"use client";

import "../forge-builder-guidance.css";

import { useEffect, useRef, useState } from "react";
import { ProductImage as Image } from "@/components/forge/product-image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench,
  Check,
  X,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { BUILD_SLOTS, useForgeStore, type BuildSlot } from "@/lib/forge-store";
import { checkCompatibility } from "@/lib/compatibility";
import {
  BUILDER_GUIDANCE,
  builderCatalogs,
  categoryFitsSlot,
  nextMissingSlot,
} from "@/lib/builder-guidance";
import { getProductHighlights } from "@/lib/product-highlights";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { BuilderBudget } from "@/components/forge/builder-budget";
import { BuilderCompatibility } from "@/components/forge/builder-compatibility";
import { Button } from "@/components/ui/button";
import {
  ProductCardSkeleton,
  ProductCardError,
  ProductCardEmpty,
} from "@/components/product-card";
import { cn } from "@/lib/utils";

export default function PCBuilderPage() {
  const [slot, setSlot] = useState<BuildSlot>("CPU");
  const [catalogChoices, setCatalogChoices] = useState<
    Partial<Record<BuildSlot, string>>
  >({});
  const [page, setPage] = useState(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [adding, setAdding] = useState(false);
  const [receipt, setReceipt] = useState<string[]>([]);
  const added = useRef(new Set<string>());
  const submitting = useRef(false);
  const focusAfterChange = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const build = useForgeStore((s) => s.build);
  const select = useForgeStore((s) => s.selectPart);
  const clear = useForgeStore((s) => s.clearBuild);
  const { addToCart } = useCart();
  const categories = useQuery({
    queryKey: ["products", "builder", "categories"],
    queryFn: () => ProductService.categories().then(requireSuccess),
    staleTime: 5 * 60 * 1000,
  });
  const catalogs = builderCatalogs(slot, categories.data?.data ?? []);
  const chosenCatalog = catalogChoices[slot];
  const catalog =
    chosenCatalog && catalogs.includes(chosenCatalog)
      ? chosenCatalog
      : (catalogs[0] ?? slot);
  const query = useQuery({
    queryKey: ["products", "builder", slot, catalog, page],
    queryFn: () =>
      ProductService.list({
        category: catalog,
        limit: 8,
        page,
        availability: "In Stock",
      }).then(requireSuccess),
    enabled: !categories.isPending,
  });
  // Canonical slot names remain independent of exact catalog category aliases.
  const entries = BUILD_SLOTS.flatMap((item) =>
    build[item] ? [{ slot: item, product: build[item]! }] : [],
  );
  const selected = entries.map((entry) => entry.product);
  const checks = checkCompatibility(build);
  const conflict = checks.some((check) => check.state === "conflict");
  const unknown = checks.some((check) => check.state === "unknown");
  const total = selected.reduce(
    (sum, product) => sum + (product.finalPrice ?? product.originalPrice),
    0,
  );
  const missing = nextMissingSlot(slot, build);
  const step = BUILD_SLOTS.indexOf(slot);
  const allAdded =
    selected.length === BUILD_SLOTS.length &&
    selected.every((product) => receipt.includes(product.id));
  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.pagination?.total ?? 0) / 8),
  );

  function changeSlot(item: BuildSlot) {
    if (adding) return;
    setPage(1);
    if (item === slot) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    } else {
      focusAfterChange.current = true;
      setSlot(item);
    }
  }
  useEffect(() => {
    if (!focusAfterChange.current) return;
    focusAfterChange.current = false;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
  }, [slot]);

  async function addBuild() {
    if (
      submitting.current ||
      !acknowledged ||
      conflict ||
      selected.length !== BUILD_SLOTS.length ||
      allAdded
    )
      return;
    submitting.current = true;
    setAdding(true);
    try {
      // Revalidate all selections before any cart mutation. Aliased catalogs are
      // retained under the user's canonical slot, never under product.category.
      const live = await Promise.all(
        entries.map(async (entry) => {
          const response = requireSuccess(
            await ProductService.get(entry.product.id),
          );
          const product = response.data;
          if (
            !product ||
            product.availability !== "In Stock" ||
            product.stock === 0
          )
            throw new Error(
              `${entry.product.name} is no longer in stock. Choose another part.`,
            );
          if (!categoryFitsSlot(entry.slot, product.category))
            throw new Error(
              `${product.name} has changed catalog category. Review your ${entry.slot} selection.`,
            );
          return { slot: entry.slot, product };
        }),
      );
      const freshBuild = Object.fromEntries(
        live.map((entry) => [entry.slot, entry.product]),
      );
      const freshChecks = checkCompatibility(freshBuild);
      for (const entry of live) select(entry.slot, entry.product);
      if (freshChecks.some((check) => check.state === "conflict")) {
        setAcknowledged(false);
        throw new Error(
          "Updated product specifications conflict. Review your build before adding it.",
        );
      }
      if (JSON.stringify(freshChecks) !== JSON.stringify(checks)) {
        setAcknowledged(false);
        throw new Error(
          "Compatibility data changed. Review the updated checks and manufacturer information, then try again.",
        );
      }
      const freshTotal = live.reduce(
        (sum, entry) =>
          sum + (entry.product.finalPrice ?? entry.product.originalPrice),
        0,
      );
      if (Math.abs(freshTotal - total) > 0.01) {
        setAcknowledged(false);
        throw new Error(
          "Prices changed. Review the updated build total and compatibility, then try again.",
        );
      }
      for (const { product } of live) {
        if (added.current.has(product.id)) continue;
        await addToCart(product);
        added.current.add(product.id);
        setReceipt([...added.current]);
      }
      toast.success("Build added to your cart. Review it before checkout.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add this build. Any parts already added remain in your cart.",
      );
    } finally {
      submitting.current = false;
      setAdding(false);
    }
  }

  return (
    <>
      <section className="forge-page-heading">
        <div className="forge-container">
          <p className="forge-eyebrow">
            <Wrench size={15} /> THE CUSTOMFORGE PC BUILDER / BETA
          </p>
          <h1>Your rig. Your signature.</h1>
          <p>
            Build one component at a time, set your parts budget and review what
            fits. Your selections stay on this device; live prices and stock are
            checked before adding to cart.
          </p>
          <div className="forge-builder-heading-meta">
            <span>
              <CheckCircle2 size={16} /> Eight guided component slots
            </span>
            <span>
              <Wrench size={16} /> Published-spec checks, with clear limits
            </span>
          </div>
        </div>
      </section>
      <div className="forge-container forge-builder forge-guided-builder">
        <nav className="forge-build-slots" aria-label="Build component slots">
          {BUILD_SLOTS.map((item, index) => (
            <button
              key={item}
              className="forge-build-slot"
              aria-pressed={slot === item}
              disabled={adding}
              onClick={() => changeSlot(item)}
            >
              <span>
                {build[item] ? (
                  <Check size={15} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span className="min-w-0">
                <strong>{item}</strong>
                <small className="line-clamp-1">
                  {build[item]?.name || "Choose your component"}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <section
          className="forge-builder-options"
          aria-labelledby="builder-step-title"
        >
          <div className="forge-builder-step-heading">
            <p className="forge-eyebrow">
              STEP {step + 1} / {BUILD_SLOTS.length} · {selected.length}{" "}
              SELECTED
            </p>
            <h2 id="builder-step-title" tabIndex={-1} ref={heading}>
              {BUILDER_GUIDANCE[slot].title}
            </h2>
            <p>{BUILDER_GUIDANCE[slot].detail}</p>
          </div>
          <div className="forge-builder-step-actions">
            <Button
              variant="outline"
              disabled={step === 0 || adding}
              onClick={() => changeSlot(BUILD_SLOTS[step - 1])}
            >
              <ArrowLeft /> Back
            </Button>
            {missing && missing !== slot ? (
              <Button
                variant="outline"
                disabled={adding}
                onClick={() => changeSlot(missing)}
              >
                Next: {missing} <ArrowRight />
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href="#build-summary">
                  Review build <ArrowRight />
                </a>
              </Button>
            )}
          </div>
          {build[slot] && (
            <div className="forge-builder-current" role="status">
              <CheckCircle2 size={17} />
              <div>
                <strong>{slot} selected</strong>
                <p>
                  {build[slot]!.name} ·{" "}
                  {formatPrice(
                    build[slot]!.finalPrice ?? build[slot]!.originalPrice,
                  )}
                </p>
              </div>
            </div>
          )}
          {catalogs.length > 1 && (
            <fieldset className="forge-builder-catalogs">
              <legend>Choose the exact catalog to browse</legend>
              {catalogs.map((category) => (
                <label key={category}>
                  <input
                    type="radio"
                    name="builder-catalog"
                    value={category}
                    checked={catalog === category}
                    disabled={adding}
                    onChange={() => {
                      setCatalogChoices((choices) => ({
                        ...choices,
                        [slot]: category,
                      }));
                      setPage(1);
                    }}
                  />
                  {category}
                </label>
              ))}
            </fieldset>
          )}
          <p className="forge-builder-catalog-note">
            Browsing {catalog} catalog · In-stock listings
            {catalog === "Cooling"
              ? " · Confirm CPU cooler socket and mounting support before selection."
              : ""}
          </p>
          {categories.isError && (
            <p className="forge-builder-catalog-note">
              Alternative catalog names could not be loaded. Browsing {slot};{" "}
              <button type="button" onClick={() => categories.refetch()}>
                retry categories
              </button>
              .
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.isPending || query.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))
            ) : query.isError ? (
              <ProductCardError
                className="sm:col-span-2"
                message={query.error.message}
                onRetry={() => query.refetch()}
              />
            ) : !query.data?.data?.length ? (
              <ProductCardEmpty
                className="sm:col-span-2"
                title="No in-stock components in this catalog."
                description="Try an alternative catalog above, choose another slot or browse the store."
              />
            ) : (
              query.data.data.map((product) => {
                const highlights = getProductHighlights(product);
                const isSelected = build[slot]?.id === product.id;
                const available =
                  product.availability === "In Stock" &&
                  product.stock !== 0 &&
                  categoryFitsSlot(slot, product.category);
                return (
                  <article
                    key={product.id}
                    className={cn(
                      "forge-builder-card",
                      isSelected && "is-selected",
                    )}
                  >
                    <Link
                      href={`/products/${product.id}`}
                      prefetch={false}
                      className="forge-builder-product-image"
                    >
                      <Image
                        src={product.images[0] || "/gaming-component.jpg"}
                        alt={product.name}
                        fill
                        sizes="(max-width:640px) 90vw, (max-width:1024px) 36vw, 260px"
                        className="object-contain"
                      />
                    </Link>
                    <p className="forge-builder-product-category">
                      {product.brand} / {product.category}
                    </p>
                    <h3>
                      <Link href={`/products/${product.id}`} prefetch={false}>
                        {product.name}
                      </Link>
                    </h3>
                    {highlights.length > 0 ? (
                      <dl className="forge-builder-product-specs">
                        {highlights.map((highlight) => (
                          <div key={highlight.label}>
                            <dt>{highlight.label}</dt>
                            <dd>{highlight.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="forge-builder-missing-specs">
                        Specifications need manual review. Open the product for
                        available details.
                      </p>
                    )}
                    <div className="forge-builder-card-footer">
                      <strong>
                        {formatPrice(
                          product.finalPrice ?? product.originalPrice,
                        )}
                      </strong>
                      <Button
                        variant={isSelected ? "outline" : "default"}
                        disabled={adding || !available}
                        aria-label={
                          isSelected
                            ? `${product.name} selected`
                            : `Select ${product.name} for ${slot}`
                        }
                        onClick={() => {
                          select(slot, product);
                          setAcknowledged(false);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check /> Selected
                          </>
                        ) : available ? (
                          "Select part"
                        ) : (
                          "Unavailable"
                        )}
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <nav
            aria-label="Builder component pages"
            className="forge-builder-pagination"
          >
            <Button
              variant="outline"
              disabled={page <= 1 || query.isFetching || adding}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous page
            </Button>
            <span>
              {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages || query.isFetching || adding}
              onClick={() => setPage((value) => value + 1)}
            >
              Next page
            </Button>
          </nav>
          <p className="forge-builder-step-end">
            {build[slot]
              ? `${slot} is selected. Continue with another component or review your build.`
              : `Select a ${slot} above, or explore another step. You can return at any time.`}
          </p>
          {build[slot] && missing && missing !== slot && (
            <Button
              className="forge-builder-continue"
              disabled={adding}
              onClick={() => changeSlot(missing)}
            >
              Continue to {missing} <ArrowRight />
            </Button>
          )}
        </section>
        <aside
          id="build-summary"
          className="forge-builder-summary"
          aria-labelledby="build-summary-title"
        >
          <p className="forge-eyebrow">YOUR PERSONAL LOADOUT</p>
          <h2 id="build-summary-title">
            {selected.length}/{BUILD_SLOTS.length} parts selected.
          </h2>
          <div
            className="forge-builder-completion"
            role="progressbar"
            aria-label="Build completion"
            aria-valuemin={0}
            aria-valuemax={BUILD_SLOTS.length}
            aria-valuenow={selected.length}
          >
            <i
              style={{
                width: `${(selected.length / BUILD_SLOTS.length) * 100}%`,
              }}
            />
          </div>
          {!selected.length && (
            <p className="forge-builder-summary-empty">
              Select your first component to start the loadout. No parts are
              added to your cart until you review all eight.
            </p>
          )}
          {entries.map(({ slot: item, product }) => (
            <div key={item} className="forge-builder-part">
              <button
                type="button"
                className="forge-builder-part-edit"
                disabled={adding}
                aria-label={`Edit ${item}: ${product.name}`}
                onClick={() => changeSlot(item)}
              >
                <span>
                  {item} <Pencil size={11} />
                </span>
                <p>{product.name}</p>
                <strong>
                  {formatPrice(product.finalPrice ?? product.originalPrice)}
                </strong>
                {receipt.includes(product.id) && (
                  <small>Already added to cart</small>
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                disabled={adding}
                aria-label={`Remove ${item} from build`}
                onClick={() => {
                  select(item, undefined);
                  setAcknowledged(false);
                }}
              >
                <X size={15} />
              </Button>
            </div>
          ))}
          <div className="forge-builder-total">
            <span>Estimated selected-parts total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <p className="forge-builder-price-note">
            Shipping and tax appear at checkout. Live prices and stock are
            rechecked before adding.
          </p>
          <BuilderBudget total={total} />
          <BuilderCompatibility
            checks={checks}
            onEdit={changeSlot}
            disabled={adding}
          />
          <label className="forge-builder-acknowledgment">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={adding}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              I&apos;ve reviewed unverified fit and manufacturer support. This
              tool checks available specifications only.
            </span>
          </label>
          <p className="forge-builder-ready" aria-live="polite">
            {allAdded
              ? "All selected parts have been added. Review quantities in your cart."
              : conflict
                ? "Resolve the compatibility conflicts before adding."
                : selected.length < BUILD_SLOTS.length
                  ? `Select ${BUILD_SLOTS.length - selected.length} more ${BUILD_SLOTS.length - selected.length === 1 ? "component" : "components"} to complete your build.`
                  : !acknowledged
                    ? `${unknown ? "Some checks need manual verification. " : ""}Confirm your manufacturer review to continue.`
                    : "Ready to recheck live prices and stock."}
          </p>
          <Button
            className="w-full"
            disabled={
              adding ||
              conflict ||
              !acknowledged ||
              selected.length !== BUILD_SLOTS.length ||
              allAdded
            }
            onClick={addBuild}
          >
            <ShoppingBag />
            {adding ? (
              <span className="forge-processing">
                <i /> Adding your build…
              </span>
            ) : receipt.length ? (
              "Add remaining parts"
            ) : (
              "Add build to cart"
            )}
          </Button>
          {receipt.length > 0 && (
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/cart">
                Review your cart <ArrowRight />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            className="mt-3 w-full text-xs text-muted-foreground"
            disabled={adding}
            onClick={() => {
              clear();
              setAcknowledged(false);
              added.current.clear();
              setReceipt([]);
            }}
          >
            <RotateCcw size={14} /> Start a new build
          </Button>
        </aside>
      </div>
      <div
        className="forge-builder-mobile-summary"
        aria-label="Build summary shortcut"
      >
        <div>
          <span>
            {selected.length}/{BUILD_SLOTS.length} parts selected
          </span>
          <strong>{formatPrice(total)}</strong>
          <small>Estimated parts only</small>
        </div>
        <a href="#build-summary">
          Review build <ArrowRight size={16} />
        </a>
      </div>
    </>
  );
}
