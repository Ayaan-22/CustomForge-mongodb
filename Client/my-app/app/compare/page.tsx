"use client";
import "@/app/forge-collections.css";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/forge/product-image";
import { useQueries } from "@tanstack/react-query";
import {
  GitCompareArrows,
  X,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useForgeStore } from "@/lib/forge-store";
import { ProductService } from "@/services/product-service";
import { RequestError, requireSuccess } from "@/lib/query-result";
import { comparisonRows } from "@/lib/product-comparison";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComparePage() {
  const selected = useForgeStore((store) => store.comparison);
  const toggle = useForgeStore((store) => store.toggleCompare);
  const clear = useForgeStore((store) => store.clearComparison);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const queries = useQueries({
    queries: selected.map((product) => ({
      queryKey: ["products", product.id],
      queryFn: () => ProductService.get(product.id).then(requireSuccess),
    })),
  });
  // Failed refreshes never borrow snapshot prices/specs from persisted intent.
  // Keep the selected column so one unavailable product cannot erase the others.
  const products = queries.map((query) =>
    query.isError ? undefined : query.data?.data || undefined,
  );
  const loadedCount = products.filter(Boolean).length;
  const refreshing = queries.filter((query) => query.isFetching).length;
  const failedCount = queries.filter(
    (query) => query.isError || (!query.isPending && !query.data?.data),
  ).length;
  const allRows = comparisonRows(products);
  const showDifferences = differencesOnly && loadedCount >= 2;
  const rows = showDifferences
    ? allRows.filter((row) => row.different)
    : allRows;
  const differentCount = allRows.filter((row) => row.different).length;
  return (
    <>
      <section className="forge-page-heading">
        <div className="forge-container">
          <p className="forge-eyebrow">
            <GitCompareArrows size={16} /> SPEC FOR SPEC
          </p>
          <h1>Choose with confidence.</h1>
          <p>
            Compare live prices and published specifications. Find the details
            that matter to your next upgrade.
          </p>
        </div>
      </section>
      <div className="forge-container forge-collection-page">
        {!selected.length ? (
          <div className="forge-empty forge-collection-empty">
            <div className="forge-collection-orbit">
              <GitCompareArrows size={40} />
            </div>
            <p className="forge-eyebrow">YOUR NEXT DECISION</p>
            <h2>Give your contenders a side-by-side.</h2>
            <p>
              Add up to four products using the compare icon on a card. Your
              selection stays on this device.
            </p>
            <Button asChild>
              <Link href="/products" prefetch={false}>
                Find your contenders <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="forge-collection-toolbar">
              <div>
                <p className="forge-eyebrow">THE SHORTLIST</p>
                <h2>{selected.length} of 4 contenders</h2>
                <p role="status" aria-live="polite">
                  {refreshing
                    ? `Refreshing ${refreshing} ${refreshing === 1 ? "product" : "products"}…`
                    : `${loadedCount} refreshed${failedCount ? ` · ${failedCount} need attention` : ""}`}
                </p>
              </div>
              <div className="forge-collection-toolbar-actions">
                <Button asChild variant="outline">
                  <Link href="/products" prefetch={false}>
                    <Plus size={16} />
                    {selected.length < 4
                      ? "Add a contender"
                      : "Browse alternatives"}
                  </Link>
                </Button>
                <Button variant="ghost" onClick={clear}>
                  Clear comparison
                </Button>
              </div>
            </div>
            <div className="forge-comparison-controls">
              <label className="forge-comparison-toggle">
                <input
                  type="checkbox"
                  checked={differencesOnly}
                  disabled={loadedCount < 2}
                  onChange={(event) => setDifferencesOnly(event.target.checked)}
                />
                <span>Differences only</span>
                <small>
                  {loadedCount >= 2
                    ? `${differentCount} ${differentCount === 1 ? "row" : "rows"}`
                    : "Refresh two products to compare"}
                </small>
              </label>
              <p id="comparison-help">
                Scroll across to see every contender. Missing values stay
                unverified; similar specifications don’t certify compatibility.
              </p>
            </div>
            {new Set(
              products.filter(Boolean).map((product) => product!.category),
            ).size > 1 && (
              <p className="forge-collection-notice">
                You’re comparing different categories. Specifications stay
                grouped by category so unrelated attributes aren’t treated as
                equivalent.
              </p>
            )}
            <div
              className="forge-comparison-scroll"
              role="region"
              aria-label="Product comparison table"
              aria-describedby="comparison-help"
              tabIndex={0}
            >
              <table className="forge-comparison-table" style={{"--forge-comparison-columns":selected.length} as CSSProperties}>
                <caption className="sr-only">
                  {showDifferences
                    ? "Published differences"
                    : "Published overview and specifications"}{" "}
                  for selected products. Each unavailable product has its own
                  retry and remove controls.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="forge-comparison-corner">
                      <span className="forge-eyebrow">YOUR CRITERIA</span>
                      <strong>
                        {showDifferences
                          ? "What’s different"
                          : "The full picture"}
                      </strong>
                      <span>Live catalog details</span>
                    </th>
                    {selected.map((snapshot, index) => {
                      const query = queries[index];
                      const product = products[index];
                      const unavailable =
                        query.error instanceof RequestError &&
                        query.error.status === 404;
                      return (
                        <th
                          scope="col"
                          key={snapshot.id}
                          className="forge-comparison-product"
                        >
                          <button
                            type="button"
                            className="forge-comparison-remove"
                            onClick={() => toggle(snapshot)}
                            aria-label={`Remove ${snapshot.name} from comparison`}
                          >
                            <X size={16} />
                          </button>
                          {product ? (
                            <>
                              <Link
                                className="forge-comparison-product-link"
                                href={`/products/${product.id}`}
                                prefetch={false}
                              >
                                <div className="forge-comparison-image">
                                  <ProductImage
                                    src={
                                      product.images[0] ||
                                      "/gaming-component.jpg"
                                    }
                                    alt={product.name}
                                    fill
                                    sizes="160px"
                                    className="object-contain"
                                  />
                                </div>
                                <span>
                                  {product.brand} / {product.category}
                                </span>
                                <strong>{product.name}</strong>
                              </Link>
                              <span className="forge-comparison-product-state">
                                {query.isFetching
                                  ? "Refreshing details…"
                                  : product.availability}
                              </span>
                            </>
                          ) : query.isPending ? (
                            <>
                              <Skeleton className="h-20 w-full" />
                              <strong>{snapshot.name}</strong>
                              <span role="status">
                                Loading current details…
                              </span>
                            </>
                          ) : (
                            <div className="forge-comparison-product-error">
                              <AlertTriangle size={22} />
                              <strong>{snapshot.name}</strong>
                              <span>
                                {unavailable
                                  ? "Listing unavailable"
                                  : "Details couldn’t refresh"}
                              </span>
                              <p>
                                {unavailable
                                  ? "This item may have left the catalog."
                                  : "Your other contenders remain available."}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={query.isFetching}
                                onClick={() => query.refetch()}
                              >
                                <RefreshCw size={14} />
                                {query.isFetching ? "Refreshing…" : "Try again"}
                              </Button>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.key}
                      className={
                        row.different ? "forge-comparison-difference" : ""
                      }
                    >
                      <th scope="row">
                        {row.label}
                        {row.different && (
                          <span className="forge-comparison-difference-tag">
                            Different
                          </span>
                        )}
                        {row.section === "specifications" &&
                          (index === 0 ||
                            rows[index - 1].section !== "specifications") && (
                            <span className="forge-comparison-source">
                              Published specifications
                            </span>
                          )}
                      </th>
                      {row.cells.map((value, column) => (
                        <td
                          key={selected[column].id}
                          className={`${row.key === "price" ? "forge-comparison-price " : ""}${value.kind !== "value" ? "forge-comparison-unknown" : ""}`}
                        >
                          {products[column]
                            ? value.text
                            : queries[column].isPending
                              ? "Loading…"
                              : "Unavailable"}
                          {products[column] && value.kind === "conflict" && (
                            <small>
                              Conflicting listing values · verify before buying
                            </small>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {showDifferences && !rows.length && (
                    <tr>
                      <td
                        colSpan={selected.length + 1}
                        className="forge-comparison-no-differences"
                      >
                        The refreshed products have the same published values.
                        Missing information still needs verification.
                      </td>
                    </tr>
                  )}
                  <tr className="forge-comparison-explore">
                    <th scope="row">Next move</th>
                    {selected.map((product, index) => (
                      <td key={product.id}>
                        {products[index] ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/products/${product.id}`}
                              prefetch={false}
                            >
                              View product <ArrowRight size={14} />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => toggle(product)}
                          >
                            Remove contender
                          </Button>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="forge-collection-footnote">
              Prices and availability come from the latest successful catalog
              response. Refresh failures are isolated per product. “Not listed”
              means the catalog cannot confirm that detail.
            </p>
          </>
        )}
      </div>
    </>
  );
}
