import type { Order } from "@/lib/types";
import { orderNeedsPaymentReview } from './order-detail';

export type PaymentPresentation =
  | "confirmed"
  | "review"
  | "delivery"
  | "closed"
  | "unavailable"
  | "missing-total"
  | "expired"
  | "ready";

export function paymentTimeRemaining(order: Pick<Order, 'paymentExpiresAt'>, now = Date.now()): string | null {
  if (!order.paymentExpiresAt) return null;
  const deadline = Date.parse(order.paymentExpiresAt);
  if (!Number.isFinite(deadline)) return null;
  const minutes = Math.ceil(Math.max(0, deadline - now) / 60_000);
  return minutes === 0 ? 'Payment window ended' : `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
}

export function recordedAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function paymentPresentation(order: Order, now = Date.now()): PaymentPresentation {
  if (orderNeedsPaymentReview(order)) return 'review';
  if (["cancelled", "refunded", "returned"].includes(order.status))
    return "closed";
  if (order.isPaid === true) return "confirmed";
  if (!["pending", "processing"].includes(order.status)) return "closed";
  if (order.paymentMethod === "cod") return "delivery";
  if (order.paymentMethod !== "stripe" || order.isPaid !== false)
    return "unavailable";
  if (order.paymentExpiresAt && Date.parse(order.paymentExpiresAt) <= now) return 'expired';
  const cents = recordedAmount(order.total)
    ? Math.round(order.total * 100)
    : NaN;
  if (!Number.isSafeInteger(cents) || cents <= 0) return "missing-total";
  return "ready";
}

// Authorization, amount and existing-session reuse remain owned by the API.
export function stripeCheckoutUrl(value: unknown): string {
  if (typeof value !== "string" || !value)
    throw new Error("Payment checkout is unavailable. Please retry.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid payment checkout address.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "checkout.stripe.com" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("Invalid payment checkout address.");
  }
  return url.href;
}
