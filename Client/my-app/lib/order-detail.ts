import type { Order, OrderItem } from "./types";

export function orderNeedsPaymentReview(order: Pick<Order, 'status' | 'paymentResult'>) {
  return order.status !== 'refunded' && (order.status === 'payment_review' || order.paymentResult?.reconciliationRequired === true);
}

/** The server rechecks eligibility; recorded returns cannot be requested again. */
export function orderActionEligibility(
  order: Pick<Order, "status" | "isPaid" | "paymentMethod" | "paymentResult" | "returnStatus">,
) {
  return {
    canCancel:
      !orderNeedsPaymentReview(order) && order.status === "pending" &&
      !order.isPaid &&
      order.paymentMethod === "cod",
    canReturn: !orderNeedsPaymentReview(order) && order.status === "delivered" &&
      (!order.returnStatus || order.returnStatus === "none"),
  };
}

export function orderReturnMessage(status: Order['returnStatus']) {
  if (!status || status === 'none') return null;
  const messages: Record<string, string> = {
    requested: 'Your return request is awaiting review.',
    approved: 'Your return request has been approved. A refund has not been confirmed.',
    rejected: 'Your return request was declined. Contact the store for more information.',
    completed: 'Your return has been completed. Contact the store about any refund reconciliation.',
  };
  return messages[status] || 'A return is already recorded for this order. Contact the store for its current status.';
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
