"use client";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import { orderNeedsPaymentReview } from '@/lib/order-detail';
import { paymentTimeRemaining } from '@/lib/payment-presentation';
import { usePaymentClock } from '@/hooks/use-payment-clock';

export function OrderPaymentAction({ order, compact = false }: {
  order: Pick<Order, "id" | "paymentMethod" | "isPaid" | "status" | "paymentResult" | "paymentExpiresAt">;
  compact?: boolean;
}) {
  const now = usePaymentClock(order.isPaid === false ? order.paymentExpiresAt : undefined);
  const remaining = paymentTimeRemaining(order, now);
  const expired = remaining === 'Payment window ended';
  // This only exposes navigation. The payment endpoint rechecks ownership,
  // settlement and the existing Stripe session before opening checkout.
  if (orderNeedsPaymentReview(order) || order.paymentMethod !== "stripe" || order.isPaid !== false ||
      !["pending", "processing"].includes(order.status)) return null;
  if (expired) return compact ? null : (
    <section aria-label="Order payment" className="mb-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Payment window ended</h2>
      <p className="text-sm text-muted-foreground">We’re checking payment before automatically cancelling this unpaid order. If you already paid, wait for confirmation.</p>
    </section>
  );

  const button = (
    <Button asChild className={compact ? "" : "w-full sm:w-auto"}>
      <Link href={`/orders/${encodeURIComponent(order.id)}/payment`}>
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        Continue to payment
      </Link>
    </Button>
  );

  if (compact) return button;
  return (
    <section aria-label="Order payment" className="mb-6 flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-semibold">Payment pending</h2>
        <p className="text-sm text-muted-foreground">Your order is saved. Continue to secure Stripe Checkout to complete payment.</p>
        {remaining && <p className="text-sm text-muted-foreground" suppressHydrationWarning>{remaining}. Unpaid orders are cancelled after the deadline.</p>}
      </div>
      {button}
    </section>
  );
}
