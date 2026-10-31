"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  ShoppingBag,
  ShieldCheck,
  Package,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { ProductService } from "@/services/product-service";
import { requireSuccess } from "@/lib/query-result";
import { formatPrice, finalPrice } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistButton } from "@/components/wishlist-button";
import { ReviewList } from "@/components/review-list";
import { MyProductReview } from "@/components/my-product-review";
import { RatingStars } from "@/components/rating-stars";
import { ProductGrid } from "@/components/product-grid";
import { ProductExtraDetails } from "@/components/product-extra-details";
import { ProductCardEmpty, ProductCardError } from "@/components/product-card";
import { ProductMedia } from "@/components/forge/product-media";
import { CompareButton } from "@/components/forge/compare-button";
import { CompatibilityPanel } from "@/components/forge/compatibility-panel";
import { ProductFAQ } from "@/components/forge/product-faq";
import { Reveal } from "@/components/forge/experience";
import { announceCartAddition } from "@/components/forge/mini-cart";
import { ProductSections } from "@/components/forge/product-sections";
import { getProductHighlights } from "@/lib/product-highlights";
import {
  ProductSetupGuide,
  ProductStory,
  ProductSupport,
} from "@/components/forge/product-story";
import { ProductComplements } from "@/components/forge/product-complements";
import "@/app/forge-product-depth.css";

export default function ProductPage() {
  const id = useParams().id as string;
  const { addToCart, isPending } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const query = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const response = await ProductService.get(id);
      if (response.error?.status === 404)
        return { ...response, data: null, error: null };
      return requireSuccess(response);
    },
  });
  const related = useQuery({
    queryKey: ["products", id, "related"],
    queryFn: () => ProductService.related(id).then(requireSuccess),
    enabled: !!query.data?.data,
  });
  if (query.isLoading)
    return (
      <div className="forge-container forge-product-detail" aria-busy="true">
        <div className="forge-detail-layout">
          <Skeleton className="aspect-square" />
          <div className="space-y-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  if (query.isError)
    return (
      <div className="forge-container py-12">
        <ProductCardError
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  const product = query.data?.data;
  if (!product)
    return (
      <div className="forge-container py-12">
        <ProductCardEmpty
          title="This upgrade is off the grid."
          description="The product is unavailable or has been removed. Explore the rest of the catalog."
        />
      </div>
    );
  const price =
    product.finalPrice ??
    finalPrice(product.originalPrice, product.discountPercentage);
  const unavailable = product.availability === "Out of Stock";
  const specs = product.specifications?.filter((s) => s.key && s.value) ?? [];
  const highlights = getProductHighlights(product);
  const demo =
    product.sku.startsWith("CF-DEMO-") || /\(Demo\)/i.test(product.name);
  async function add() {
    if (!product) return;
    try {
      await addToCart(product, quantity);
      setAdded(true);
      announceCartAddition();
    } catch {
      /* Existing cart hook reports failures. */
    }
  }
  return (
    <div className="forge-container forge-product-detail">
      <div className="forge-mobile-buybar">
        <div>
          <strong>{formatPrice(price)}</strong>
          <span>{product.availability}</span>
        </div>
        <Button
          aria-label="Add item from mobile buy bar"
          disabled={unavailable || isPending(id)}
          onClick={add}
        >
          <ShoppingBag />
          {isPending(id)
            ? "Adding…"
            : unavailable
              ? "Out of stock"
              : "Add to cart"}
        </Button>
      </div>
      <nav className="forge-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={12} />
        <Link href="/products">Shop</Link>
        <ChevronRight size={12} />
        <Link
          href={`/products?category=${encodeURIComponent(product.category)}`}
        >
          {product.category}
        </Link>
        <ChevronRight size={12} />
        <span className="text-foreground">{product.name}</span>
      </nav>
      <ProductSections
        sections={[
          { id: "overview", label: "Overview" },
          { id: "features", label: "The upgrade" },
          ...(specs.length
            ? [{ id: "specifications", label: "Specifications" }]
            : []),
          { id: "compatibility", label: "Compatibility" },
          { id: "support", label: "Warranty" },
          { id: "questions", label: "Store guide" },
          { id: "reviews", label: "Reviews" },
        ]}
      />
      <div className="forge-detail-layout" id="overview">
        <div>
          <ProductMedia key={product.id} product={product} />
          {highlights.length > 0 && (
            <div className="forge-spec-highlights">
              {highlights.map((spec) => (
                <div key={spec.label}>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="forge-buy-box">
          <p className="forge-eyebrow">
            {product.brand} / {product.category}
          </p>
          <h1>{product.name}</h1>
          <p className="text-xs leading-relaxed font-mono text-muted-foreground">
            SKU / {product.sku}
          </p>
          {demo && (
            <p className="forge-demo-notice">
              Demo listing. Images, specifications, price and inventory are
              illustrative.
            </p>
          )}
          <a
            href="#reviews"
            className="mt-4 inline-flex min-h-8 items-center gap-3"
          >
            <RatingStars value={product.ratings.average} />
            <span className="text-xs text-muted-foreground">
              {product.ratings.totalReviews} reviews
            </span>
          </a>
          <div className="forge-buy-price">
            <strong>{formatPrice(price)}</strong>
            {!!product.discountPercentage && (
              <>
                <del>{formatPrice(product.originalPrice)}</del>
                <span>SAVE {product.discountPercentage}%</span>
              </>
            )}
          </div>
          <p className="flex items-center gap-2 text-xs">
            <span
              className={
                unavailable
                  ? "h-1.5 w-1.5 rounded-full bg-destructive"
                  : "forge-status-dot"
              }
            />
            {product.availability}
            {typeof product.stock === "number" && product.stock > 0 && (
              <span className="text-muted-foreground">
                / {product.stock} available
              </span>
            )}
          </p>
          <div className="forge-buy-controls">
            <div>
              <Button
                variant="ghost"
                size="icon"
                disabled={quantity <= 1 || isPending(id)}
                onClick={() => setQuantity((q) => q - 1)}
                aria-label="Decrease quantity"
              >
                <Minus />
              </Button>
              <span className="font-mono text-xs" aria-live="polite">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  isPending(id) ||
                  (product.stock != null && quantity >= product.stock)
                }
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <Plus />
              </Button>
            </div>
            <Button
              className="forge-buy-add"
              disabled={unavailable || isPending(id)}
              onClick={add}
            >
              {added ? <Check /> : <ShoppingBag />}
              {isPending(id) ? (
                <span className="forge-processing">
                  <i />
                  Adding…
                </span>
              ) : unavailable ? (
                "Out of stock"
              ) : added ? (
                "Add more"
              ) : (
                "Add to cart"
              )}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <WishlistButton productId={id} className="text-xs" />
            <CompareButton product={product} label />
          </div>
          <div className="forge-buy-perks">
            <span>
              <ShieldCheck />
              Secure payment through Stripe
            </span>
            <span>
              <Package />
              Track your order in your account
            </span>
            {product.warranty && (
              <span>
                <ShieldCheck />
                {product.warranty}
              </span>
            )}
          </div>
          <Link href="/pc-builder" className="forge-text-link">
            Make this part of your next build <ArrowRight size={16} />
          </Link>
          <a href="#compatibility" className="forge-fit-link">
            Will it fit your build? <ArrowRight size={16} />
          </a>
        </aside>
        <div className="forge-detail-secondary lg:col-start-1">
          <Reveal>
            <ProductStory product={product} />
          </Reveal>
          {specs.length > 0 && (
            <section className="forge-product-story" id="specifications">
              <p className="forge-eyebrow">UNDER THE HOOD</p>
              <h2>The details that matter.</h2>
              <table className="forge-spec-table">
                <caption className="sr-only">
                  {product.name} specifications
                </caption>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.key}>
                      <th scope="row">{spec.key}</th>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <div className="mt-8">
            <ProductExtraDetails product={product} />
          </div>
          <section id="compatibility" className="forge-product-story">
            <p className="forge-eyebrow">PLAN YOUR NEXT UPGRADE</p>
            <h2>Check your build.</h2>
            <ProductSetupGuide product={product} />
            <CompatibilityPanel product={product} />
          </section>
          <ProductSupport product={product} />
          <div id="questions">
            <ProductFAQ product={product} />
          </div>
          <section id="reviews" className="forge-product-story">
            <p className="forge-eyebrow">FROM THE COMMUNITY</p>
            <h2>Player feedback.</h2>
            <ReviewList productId={id} />
            <MyProductReview productId={id} />
          </section>
        </div>
      </div>
      <ProductComplements key={product.id} product={product} />
      <section className="forge-section">
        <div className="forge-section-heading">
          <div>
            <p className="forge-eyebrow">COMPARE YOUR OPTIONS</p>
            <h2>More in {product.category}.</h2>
          </div>
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="forge-text-link"
          >
            Explore {product.category} <ArrowRight size={16} />
          </Link>
        </div>
        <ProductGrid
          products={(related.data?.data ?? []).slice(0, 4)}
          isLoading={related.isLoading}
          isError={related.isError}
          errorMessage={related.error?.message}
          onRetry={() => related.refetch()}
          loadingCount={4}
        />
      </section>
    </div>
  );
}
