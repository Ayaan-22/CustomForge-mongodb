"use client";
import "@/app/forge-cards.css";
import { useState } from "react";
import Link from "next/link";
import { ProductImage as Image } from "@/components/forge/product-image";
import {
  AlertCircle,
  ShoppingBag,
  Star,
  Check,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, finalPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useCart } from "@/hooks/use-cart";
import { WishlistButton } from "@/components/wishlist-button";
import { CompareButton } from "@/components/forge/compare-button";
import { QuickView } from "@/components/forge/quick-view";
import { announceCartAddition } from "@/components/forge/mini-cart";
import { cn } from "@/lib/utils";
import { getProductHighlights } from "@/lib/product-highlights";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { addToCart, isPending } = useCart();
  const [added, setAdded] = useState(false);
  const [requestedAlternate, setRequestedAlternate] = useState<string>();
  const [loadedAlternate, setLoadedAlternate] = useState<string>();
  const [failedAlternate, setFailedAlternate] = useState<string>();
  const [imageHovered, setImageHovered] = useState(false);
  const [imageFocused, setImageFocused] = useState(false);
  const discount = product.discountPercentage || 0;
  const price =
    product.finalPrice ?? finalPrice(product.originalPrice, discount);
  const unavailable = product.availability === "Out of Stock";
  const href = `/products/${product.id}`;
  const primaryImage = product.images[0] || "/gaming-component.jpg";
  const alternateImage = product.images.find(
    (source, index) => index > 0 && source && source !== primaryImage,
  );
  const highlights = getProductHighlights(product);
  const isDemo =
    product.sku.startsWith("CF-DEMO-") || /\(demo\)/i.test(product.name);
  const showAlternate =
    alternateImage &&
    loadedAlternate === alternateImage &&
    failedAlternate !== alternateImage &&
    (imageHovered || imageFocused);
  // Use the same responsive source for both views. Alternates are mounted only
  // after deliberate pointer/focus intent, keeping untouched grids lightweight.
  const imageSizes =
    "(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 45vw, (max-width: 1279px) 33vw, 330px";
  return (
    <article
      className={cn("forge-product-card forge-decision-card group", className)}
    >
      <div
        className="forge-product-image"
        onPointerEnter={(event) => {
          if (event.pointerType === "touch") return;
          setImageHovered(true);
          if (alternateImage) setRequestedAlternate(alternateImage);
        }}
        onPointerLeave={() => setImageHovered(false)}
        onFocus={() => {
          setImageFocused(true);
          if (alternateImage) setRequestedAlternate(alternateImage);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setImageFocused(false);
          }
        }}
      >
        <Link href={href} className="forge-card-image-link absolute inset-0">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            sizes={imageSizes}
            className={cn("forge-card-photo", showAlternate && "is-obscured")}
          />
          {alternateImage && requestedAlternate === alternateImage && (
            <Image
              src={alternateImage}
              alt=""
              aria-hidden="true"
              fill
              sizes={imageSizes}
              loading="eager"
              onLoad={() => setLoadedAlternate(alternateImage)}
              onError={() => setFailedAlternate(alternateImage)}
              className={cn(
                "forge-card-photo forge-image-secondary",
                showAlternate && "is-visible",
              )}
            />
          )}
        </Link>
        <QuickView product={product} />
        {isDemo && <span className="forge-card-media-note">Demo listing</span>}
      </div>
      {discount > 0 ? (
        <span className="forge-product-badge">SAVE {discount}%</span>
      ) : product.isFeatured ? (
        <span className="forge-product-badge is-featured">FORGE PICK</span>
      ) : null}
      <WishlistButton
        productId={product.id}
        variant="icon"
        className="forge-card-wishlist"
      />
      <div className="forge-card-body">
        <div className="forge-card-meta">
          <span>{product.brand}</span>
          <span>{product.category}</span>
        </div>
        <Link href={href} className="forge-card-title line-clamp-2">
          {product.name}
        </Link>
        {highlights.length > 0 && (
          <dl className="forge-card-highlights" aria-label="Key specifications">
            {highlights.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="forge-card-rating">
          <Star size={12} />
          {product.ratings.totalReviews > 0 ? (
            <>
              <strong>{product.ratings.average.toFixed(1)}</strong>
              <span>({product.ratings.totalReviews} reviews)</span>
            </>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
        <div className="mt-auto">
          <div className="forge-card-pricing">
            <strong>{formatPrice(price)}</strong>
            {discount > 0 && <del>{formatPrice(product.originalPrice)}</del>}
          </div>
          <p
            className={cn("forge-card-stock", unavailable && "is-unavailable")}
          >
            <i />
            {product.availability}
          </p>
        </div>
      </div>
      <div className="forge-card-actions">
        <Button
          className="forge-add"
          disabled={unavailable || isPending(product.id)}
          onClick={async () => {
            try {
              await addToCart(product);
              setAdded(true);
              announceCartAddition();
            } catch {
              return;
            }
          }}
          aria-label={`${unavailable ? "Out of stock" : isPending(product.id) ? "Adding…" : added ? "Add another" : "Add to cart"}: ${product.name}`}
        >
          {added ? <Check size={15} /> : <ShoppingBag size={15} />}
          {unavailable ? (
            "Out of stock"
          ) : isPending(product.id) ? (
            <span className="forge-processing">
              <i />
              Adding…
            </span>
          ) : added ? (
            "Add another"
          ) : (
            "Add to cart"
          )}
        </Button>
        <CompareButton product={product} />
      </div>
    </article>
  );
}

export { ProductCardSkeleton } from "./forge/shelf-skeleton";
export function ProductCardError({
  message = "We couldn't load the catalog. Please try again.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "forge-empty rounded-lg border border-destructive/30 bg-card p-6",
        className,
      )}
      role="alert"
    >
      <AlertCircle size={32} />
      <h2>Connection interrupted.</h2>
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reconnect to the catalog
        </Button>
      )}
    </div>
  );
}
export function ProductCardEmpty({
  title = "No gear in this loadout.",
  description = "Try a different category or adjust your filters.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "forge-empty rounded-lg border border-dashed bg-card p-6",
        className,
      )}
    >
      <PackageSearch size={36} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Button asChild variant="outline">
        <Link href="/products">Explore all gear</Link>
      </Button>
    </div>
  );
}
