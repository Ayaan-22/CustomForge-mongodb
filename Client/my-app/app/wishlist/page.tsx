"use client";
import "@/app/forge-collections.css";
import { useState } from "react";
import Link from "next/link";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import {
  Heart,
  ArrowRight,
  RefreshCw,
  Trash2,
  AlertTriangle,
  GitCompareArrows,
  SlidersHorizontal,
} from "lucide-react";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/lib/auth-context";
import { ProductService } from "@/services/product-service";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { ForgeSelectField } from "@/components/forge/select-field";
import { RequestError, requireSuccess } from "@/lib/query-result";
import type { ApiResponse } from "@/lib/apiClient";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function SavedProduct({
  productId,
  query,
}: {
  productId: string;
  query: UseQueryResult<ApiResponse<Product>, Error>;
}) {
  const remove = useRemoveFromWishlist();
  const product = query.isError ? undefined : query.data?.data;
  async function removeItem() {
    try {
      await remove.mutateAsync(productId);
      toast.success("Removed from your wishlist");
    } catch {
      toast.error("Couldn't remove this item. Try again.");
    }
  }
  if (query.isPending) return <ProductCardSkeleton />;
  if (!product) {
    const unavailable =
      query.error instanceof RequestError && query.error.status === 404;
    return (
      <article className="forge-saved-error">
        <AlertTriangle size={30} />
        <span className="forge-eyebrow">SAVED ITEM</span>
        <h3>
          {unavailable ? "Listing unavailable." : "Connection interrupted."}
        </h3>
        <p>
          {unavailable
            ? "This item is no longer available in the catalog. Your saved selection stays here until you remove it."
            : "We couldn’t refresh this item. Your other saved products are ready to explore."}
        </p>
        <div>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={15} />
            {query.isFetching ? "Refreshing…" : "Try again"}
          </Button>
          <Button
            variant="ghost"
            disabled={remove.isPending}
            onClick={removeItem}
          >
            <Trash2 size={15} />
            {remove.isPending ? "Removing…" : "Remove saved item"}
          </Button>
        </div>
      </article>
    );
  }
  return (
    <div className="forge-saved-product">
      <ProductCard product={product} />
      <div className="forge-saved-product-footer">
        <span>
          {query.isFetching
            ? "Refreshing details…"
            : "Saved for your next upgrade"}
        </span>
        <Button
          variant="ghost"
          disabled={remove.isPending}
          onClick={removeItem}
          aria-label={`Remove ${product.name} from wishlist`}
        >
          <Trash2 size={14} />
          {remove.isPending ? "Removing…" : "Remove"}
        </Button>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const wishlist = useWishlist();
  const auth = useAuth();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("saved");
  const ids = [...new Set((wishlist.data || []).map((item) => item.productId))];
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", id],
      queryFn: () => ProductService.get(id).then(requireSuccess),
    })),
  });
  const entries = ids.map((id, index) => ({
    id,
    query: queries[index],
    product: queries[index].isError
      ? undefined
      : queries[index].data?.data || undefined,
    index,
  }));
  const categories = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.product ? [entry.product.category] : [],
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const selectedCategory =
    category === "All" || categories.includes(category) ? category : "All";
  const visible = entries
    .filter(
      (entry) =>
        selectedCategory === "All" ||
        entry.product?.category === selectedCategory,
    )
    .sort((a, b) => {
      if (sort === "name")
        return (a.product?.name || "\uffff").localeCompare(
          b.product?.name || "\uffff",
        );
      if (sort === "price")
        return (
          (a.product?.finalPrice ?? a.product?.originalPrice ?? Infinity) -
            (b.product?.finalPrice ?? b.product?.originalPrice ?? Infinity) ||
          a.index - b.index
        );
      return a.index - b.index;
    });
  const pending = queries.filter((query) => query.isFetching).length;
  const ready = entries.filter((entry) => entry.product).length;
  const failed = entries.filter(
    (entry) => !entry.query.isPending && !entry.product,
  ).length;
  const loading = wishlist.isLoading || auth.isLoading;
  return (
    <>
      <section className="forge-page-heading">
        <div className="forge-container">
          <p className="forge-eyebrow">
            <Heart size={16} /> THE GEAR YOU’RE EYEING
          </p>
          <h1>Your next upgrades. Saved.</h1>
          <p>
            A collection of your contenders, ready whenever you are. Revisit the
            specs, compare your picks and make room for your next level.
          </p>
        </div>
      </section>
      <div className="forge-container forge-collection-page">
        {auth.isAuthenticated && !auth.isEmailVerified ? (
          <div className="forge-empty forge-collection-empty">
            <Heart size={40} />
            <h2>Your account wishlist awaits.</h2>
            <p>
              Verify your email to load and manage your account’s saved gear.
            </p>
            <Button asChild>
              <Link href="/account" prefetch={false}>
                Open your account <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <>
            <p className="forge-collection-loading" role="status">
              Opening your saved collection…
            </p>
            <div className="forge-saved-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </>
        ) : wishlist.error ? (
          <div className="forge-empty forge-collection-empty" role="alert">
            <AlertTriangle size={40} />
            <h2>Your collection couldn’t connect.</h2>
            <p>
              We couldn’t load your saved items. Reconnect to pick up where you
              left off.
            </p>
            <Button
              variant="outline"
              disabled={wishlist.isFetching}
              onClick={() => wishlist.refetch()}
            >
              <RefreshCw size={16} />
              {wishlist.isFetching ? "Reconnecting…" : "Try again"}
            </Button>
          </div>
        ) : !ids.length ? (
          <div className="forge-empty forge-collection-empty">
            <div className="forge-collection-orbit">
              <Heart size={40} />
            </div>
            <p className="forge-eyebrow">ROOM FOR YOUR NEXT LEVEL</p>
            <h2>Every great loadout starts with a wish.</h2>
            <p>
              Tap the heart on any product to save it here. Explore a few
              contenders before choosing your upgrade.
            </p>
            <Button asChild>
              <Link href="/products" prefetch={false}>
                Discover your next upgrade <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="forge-collection-toolbar">
              <div>
                <p className="forge-eyebrow">YOUR COLLECTION</p>
                <h2>
                  {ids.length} saved{" "}
                  {ids.length === 1 ? "contender" : "contenders"}
                </h2>
                <p role="status" aria-live="polite">
                  {pending
                    ? `Refreshing ${pending} ${pending === 1 ? "item" : "items"}…`
                    : `${ready} ready to explore${failed ? ` · ${failed} need attention` : ""}`}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/compare" prefetch={false}>
                  <GitCompareArrows size={16} />
                  Open comparison <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <div className="forge-saved-controls">
              <div className="forge-saved-curation-label">
                <SlidersHorizontal size={16} />
                <span>Curate your collection</span>
              </div>
              <ForgeSelectField
                id="wishlist-category"
                label="Category"
                value={selectedCategory}
                onValueChange={setCategory}
                options={[
                  { value: "All", label: "All saved gear" },
                  ...categories.map((value) => ({ value, label: value })),
                ]}
              />
              <ForgeSelectField
                id="wishlist-sort"
                label="Order"
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: "saved", label: "Saved order" },
                  { value: "name", label: "Name: A–Z" },
                  { value: "price", label: "Price: low to high" },
                ]}
              />
            </div>
            {selectedCategory !== "All" && (
              <p className="forge-collection-footnote">
                Showing {visible.length} refreshed {selectedCategory}{" "}
                {visible.length === 1 ? "item" : "items"}.
                {pending || failed
                  ? " Switch to All saved gear to see items still loading or unavailable."
                  : ""}
              </p>
            )}
            <div className="forge-saved-grid">
              {visible.map((entry) => (
                <SavedProduct
                  key={entry.id}
                  productId={entry.id}
                  query={entry.query}
                />
              ))}
            </div>
            <div className="forge-collection-guidance">
              <div>
                <Heart size={18} />
                <p>
                  {auth.isAuthenticated ? (
                    "Your saved selection belongs to your account."
                  ) : (
                    <>
                      This wishlist stays on this device.{" "}
                      <Link href="/login" prefetch={false}>
                        Sign in
                      </Link>{" "}
                      to sync your saved items to a verified account.
                    </>
                  )}
                </p>
              </div>
              <p>
                Compare up to four picks using their compare icons. Prices and
                availability refresh from the catalog; saving an item doesn’t
                reserve stock.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
