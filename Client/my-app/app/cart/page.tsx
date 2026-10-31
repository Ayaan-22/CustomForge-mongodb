"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  Cpu,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/forge/product-image";
import { CheckoutTotals } from "@/components/checkout-totals";
import { CheckoutStepper } from "@/components/forge/checkout-stepper";
import { formatPrice } from "@/lib/format";
import { hasCheckoutTotals } from "@/lib/checkout-summary";
import { cartStockState } from "@/lib/cart-presentation";
import "@/app/forge-commerce.css";

export default function CartPage() {
  const {
    items,
    count,
    updateQty,
    removeItem,
    subtotal,
    clear,
    isLoading,
    isPending,
    isRefreshing,
    error,
    retry,
    totals,
  } = useCart();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const hasServerTotal = hasCheckoutTotals(totals);
  const needsServerTotal = isAuthenticated && isEmailVerified;
  const notices = [
    ...new Set([
      ...(totals?.couponError ? [totals.couponError] : []),
      ...(totals?.warnings?.map((warning) => warning.message) ?? []),
      ...items
        .map(
          ({ product, quantity }) =>
            cartStockState(product, quantity).blockingMessage,
        )
        .filter((message): message is string => !!message),
    ]),
  ];
  const checkoutBlocked =
    isPending() ||
    isRefreshing ||
    notices.length > 0 ||
    (needsServerTotal && !hasServerTotal);
  const totalLabel = hasServerTotal ? "Order total" : "Subtotal";
  const shownTotal = hasServerTotal ? totals.total : subtotal;

  const checkoutAction = (mobile = false) =>
    checkoutBlocked ? (
      <Button
        disabled
        className={mobile ? "forge-cart-mobile-action" : "w-full"}
      >
        {isPending() || isRefreshing ? "Updating cart…" : "Review your cart"}
        <ArrowRight size={18} />
      </Button>
    ) : (
      <Button
        asChild
        className={mobile ? "forge-cart-mobile-action" : "w-full"}
      >
        <Link href="/checkout" prefetch={false}>
          Checkout
          <ArrowRight size={18} />
        </Link>
      </Button>
    );

  if (isLoading)
    return (
      <div
        className="forge-container forge-cart-page"
        aria-busy="true"
        aria-label="Loading your cart"
      >
        <p className="forge-eyebrow">ASSEMBLING YOUR LOADOUT</p>
        <h1>Your next level.</h1>
        <div className="forge-cart-layout">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <span className="sr-only" role="status">
          Loading your cart…
        </span>
      </div>
    );

  if (error)
    return (
      <div className="forge-container forge-cart-page">
        <div className="forge-cart-state" role="alert">
          <div className="forge-cart-state-icon">
            <AlertCircle size={36} />
          </div>
          <p className="forge-eyebrow">CONNECTION INTERRUPTED</p>
          <h1>Let’s get your gear back.</h1>
          <p>{error.message}</p>
          <Button onClick={() => retry()}>
            <RefreshCw size={18} />
            Retry cart
          </Button>
        </div>
      </div>
    );

  if (!items.length)
    return (
      <div className="forge-container forge-cart-page">
        <div className="forge-cart-state">
          <div className="forge-cart-state-icon">
            <ShoppingBag size={36} />
          </div>
          <p className="forge-eyebrow">YOUR NEXT UPGRADE STARTS HERE</p>
          <h1>No gear. Yet.</h1>
          <p>
            Find your next favorite peripheral or start putting together your
            dream rig.
          </p>
          <div className="forge-cart-state-actions">
            <Button asChild>
              <Link href="/products" prefetch={false}>
                Explore the shop
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pc-builder" prefetch={false}>
                <Cpu size={18} />
                Build your PC
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="forge-container forge-cart-page">
      <CheckoutStepper step={0} />
      <header className="forge-cart-heading">
        <div>
          <p className="forge-eyebrow">LOCK IN YOUR LOADOUT</p>
          <h1>
            Your next level<span>.</span>
          </h1>
          <p>
            {count} {count === 1 ? "item" : "items"} · {items.length}{" "}
            {items.length === 1 ? "product" : "products"} ready for review
          </p>
        </div>
        <Link href="/products" prefetch={false}>
          <ArrowLeft size={16} />
          Continue shopping
        </Link>
      </header>
      <div className="forge-cart-layout">
        <section
          aria-label="Products in your cart"
          className="forge-cart-products"
        >
          {items.map(({ product, quantity }) => {
            const stock = cartStockState(product, quantity);
            const serverLine = totals?.items.find(
              (item) => item.product.id === product.id,
            );
            const unitPrice =
              serverLine?.unitPrice ??
              product.finalPrice ??
              product.originalPrice;
            const lineTotal = serverLine?.lineTotal ?? unitPrice * quantity;
            const busy = isPending(product.id);
            return (
              <article
                key={product.id}
                className="forge-cart-item"
                aria-busy={busy}
              >
                <Link
                  href={"/products/" + product.id}
                  prefetch={false}
                  className="forge-cart-image"
                >
                  <ProductImage
                    src={product.images[0] || "/gaming-component.jpg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 639px) 88px, 132px"
                    className="object-contain p-2"
                  />
                </Link>
                <div className="forge-cart-item-details">
                  {(product.brand || product.category) && (
                    <p className="forge-cart-meta">
                      {[product.brand, product.category]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  )}
                  <h2>
                    <Link href={"/products/" + product.id} prefetch={false}>
                      {product.name}
                    </Link>
                  </h2>
                  <p
                    className={
                      "forge-cart-stock " +
                      (stock.blockingMessage ? "is-warning" : "")
                    }
                  >
                    {stock.blockingMessage ? (
                      <AlertCircle size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    {stock.label}
                  </p>
                  <p className="forge-cart-unit">
                    {formatPrice(unitPrice)} <span>/ each</span>
                  </p>
                </div>
                <div className="forge-cart-item-controls">
                  <div
                    className="forge-cart-quantity"
                    aria-label={"Quantity for " + product.name}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Decrease quantity for " + product.name}
                      disabled={quantity <= 1 || busy}
                      onClick={() => updateQty(product.id, quantity - 1)}
                    >
                      <Minus size={16} />
                    </Button>
                    <span aria-live="polite">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Increase quantity for " + product.name}
                      disabled={busy || !stock.canIncrease}
                      onClick={() => updateQty(product.id, quantity + 1)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <strong className="forge-cart-line-total">
                    {formatPrice(lineTotal)}
                  </strong>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="forge-cart-remove"
                    aria-label={"Remove " + product.name + " from cart"}
                    disabled={busy}
                    onClick={() => removeItem(product.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                {stock.blockingMessage && (
                  <p className="forge-cart-item-notice" role="status">
                    {stock.blockingMessage}
                  </p>
                )}
              </article>
            );
          })}
          <div className="forge-cart-list-footer">
            <p>
              Prices and availability are checked again before your order is
              placed.
            </p>
            <Button
              variant="ghost"
              onClick={() => clear()}
              disabled={isPending()}
            >
              <Trash2 size={16} />
              Clear cart
            </Button>
          </div>
        </section>
        <aside
          className="forge-cart-summary"
          aria-labelledby="cart-summary-title"
        >
          <p className="forge-eyebrow">THE FINAL CHECK</p>
          <h2 id="cart-summary-title">Order summary</h2>
          <div className="forge-cart-summary-count">
            <ShoppingBag size={17} />
            <span>
              {count} {count === 1 ? "item" : "items"} in your loadout
            </span>
          </div>
          {notices.length > 0 && (
            <div className="forge-cart-alert" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>Your cart needs a quick review</strong>
                {notices.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>
          )}
          {hasServerTotal ? (
            <CheckoutTotals totals={totals} />
          ) : (
            <>
              <dl className="forge-cart-subtotal">
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </dl>
              <p className="forge-cart-note">
                {needsServerTotal
                  ? "Waiting for shipping, tax and your full order total."
                  : "Sign in at checkout to see shipping, tax and your full order total."}
              </p>
            </>
          )}
          {isRefreshing && (
            <p className="forge-cart-note" role="status">
              Refreshing prices and availability…
            </p>
          )}
          {needsServerTotal && (!hasServerTotal || notices.length > 0) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => retry()}
              disabled={isRefreshing || isPending()}
            >
              <RefreshCw size={16} />
              Refresh cart
            </Button>
          )}
          {checkoutAction()}
          <p className="forge-cart-note">
            Review shipping and payment before placing your order.
          </p>
          <Link
            href="/pc-builder"
            prefetch={false}
            className="forge-cart-builder-link"
          >
            <Cpu size={20} />
            <span>
              Building a PC?
              <small>Check your selected parts in the builder.</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <div className="forge-cart-mobile-bar" aria-label="Cart checkout action">
        <div>
          <span>{totalLabel}</span>
          <strong>{formatPrice(shownTotal)}</strong>
        </div>
        {checkoutAction(true)}
      </div>
    </div>
  );
}
