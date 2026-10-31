"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductImage as Image } from "@/components/forge/product-image";
import {
  ShoppingBag,
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cartStockState } from "@/lib/cart-presentation";
import { hasCheckoutTotals } from "@/lib/checkout-summary";

export function announceCartAddition() {
  window.dispatchEvent(new Event("forge-cart-added"));
}

export function MiniCart() {
  const [open, setOpen] = useState(false);
  const {
    items,
    count,
    subtotal,
    isLoading,
    error,
    retry,
    updateQty,
    removeItem,
    isPending,
    isRefreshing,
    totals,
  } = useCart();
  const hasServerTotal = hasCheckoutTotals(totals);
  const cartIssue =
    totals?.couponError ||
    totals?.warnings?.[0]?.message ||
    items
      .map(
        ({ product, quantity }) =>
          cartStockState(product, quantity).blockingMessage,
      )
      .find(Boolean);
  const checkoutBlocked =
    !!error ||
    isPending() ||
    isRefreshing ||
    !!cartIssue ||
    (!!totals && !hasServerTotal);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("forge-cart-added", show);
    return () => window.removeEventListener("forge-cart-added", show);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="forge-nav-icon forge-cart-trigger"
          aria-label={`Open cart, ${count} items`}
        >
          <ShoppingBag size={20} />
          {count > 0 && <span className="forge-cart-count">{count}</span>}
          <span className="hidden xl:inline">Cart</span>
        </button>
      </SheetTrigger>
      <SheetContent className="forge-mini-cart w-full sm:max-w-md">
        <SheetHeader>
          <p className="forge-eyebrow">YOUR NEXT UPGRADE</p>
          <SheetTitle className="text-2xl">
            Your loadout <span className="text-primary">({count})</span>
          </SheetTitle>
          <SheetDescription>Review your gear before checkout.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : error ? (
            <div role="alert">
              <p>{error.message}</p>
              <Button onClick={() => retry()}>Retry cart</Button>
            </div>
          ) : !items.length ? (
            <div className="forge-empty">
              <ShoppingBag size={44} />
              <h2>No gear. Yet.</h2>
              <p>Your next upgrade is waiting in the shop.</p>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/products">
                  Explore the shop <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <article key={product.id} className="forge-mini-item">
                <Link
                  href={`/products/${product.id}`}
                  onClick={() => setOpen(false)}
                  className="relative h-20 w-20 overflow-hidden rounded-lg"
                >
                  <Image
                    src={product.images[0] || "/gaming-component.jpg"}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/products/${product.id}`}
                    onClick={() => setOpen(false)}
                    className="line-clamp-2 text-sm font-semibold"
                  >
                    {product.name}
                  </Link>
                  <p className="my-2 font-mono text-primary">
                    {formatPrice(product.finalPrice ?? product.originalPrice)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Decrease ${product.name} quantity`}
                      disabled={quantity <= 1 || isPending(product.id)}
                      onClick={() => updateQty(product.id, quantity - 1)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-5 text-center" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Increase ${product.name} quantity`}
                      disabled={
                        isPending(product.id) ||
                        !cartStockState(product, quantity).canIncrease
                      }
                      onClick={() => updateQty(product.id, quantity + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${product.name}`}
                  disabled={isPending(product.id)}
                  onClick={() => removeItem(product.id)}
                >
                  <Trash2 />
                </Button>
              </article>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="space-y-4 border-t p-5">
            <div className="flex justify-between">
              <span>{hasServerTotal ? "Order total" : "Subtotal"}</span>
              <strong className="font-mono text-xl">
                {formatPrice(hasServerTotal ? totals.total : subtotal)}
              </strong>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasServerTotal
                ? "Includes the shipping, tax and discounts currently returned for your cart."
                : "Shipping, taxes and discounts are shown at checkout."}
            </p>
            {cartIssue && (
              <p role="alert" className="text-xs text-destructive">
                {cartIssue}
              </p>
            )}
            {checkoutBlocked ? (
              <Button disabled className="w-full">
                {isPending() || isRefreshing
                  ? "Updating cart…"
                  : "Review your cart"}
              </Button>
            ) : (
              <Button asChild className="w-full" onClick={() => setOpen(false)}>
                <Link href="/checkout" prefetch={false}>
                  Secure checkout <ArrowRight />
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <Link href="/cart" prefetch={false}>
                View full cart
              </Link>
            </Button>
            <p className="flex justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} />
              Payment details stay with the payment provider
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
