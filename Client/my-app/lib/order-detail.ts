import type { Order, OrderItem } from "./types";

export function orderNeedsPaymentReview(order: Pick<Order, 'status' | 'paymentResult'>) {
  return order.status !== 'refunded' && (order.status === 'payment_review' || order.paymentResult?.reconciliationRequired === true);
}

/** Display eligibility mirrors the existing order actions; the server rechecks it. */
export function orderActionEligibility(
  order: Pick<Order, "status" | "isPaid" | "paymentMethod" | "paymentResult">,
) {
  return {
    canCancel:
      !orderNeedsPaymentReview(order) && order.status === "pending" &&
      !order.isPaid &&
      order.paymentMethod === "cod",
    canReturn: !orderNeedsPaymentReview(order) && order.status === "delivered",
  };
}

export function recordedOrderAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function recordedLineTotal(
  item: Pick<OrderItem, "price" | "quantity">,
): number | undefined {
  if (
    !recordedOrderAmount(item.price) ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1
  )
    return undefined;
  const total = item.price * item.quantity;
  return recordedOrderAmount(total) ? total : undefined;
}

/** The existing invoice defaults absent prices to zero, so incomplete exports are gated. */
export function hasInvoicePricing(
  order: Pick<
    Order,
    "subtotal" | "discount" | "shipping" | "tax" | "total" | "items"
  >,
) {
  return (
    [
      order.subtotal,
      order.discount,
      order.shipping,
      order.tax,
      order.total,
    ].every(recordedOrderAmount) &&
    order.items.length > 0 &&
    order.items.every((item) => recordedLineTotal(item) !== undefined)
  );
}

export function recordedOrderDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
