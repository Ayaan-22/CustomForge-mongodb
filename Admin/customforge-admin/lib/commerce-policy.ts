import type { AdminOrder } from "@/types/admin";

export function needsPaymentReview(order: {status?: string; payment_result?: AdminOrder['payment_result']}) {
  return order.status !== 'refunded' && (order.status === 'payment_review' || order.payment_result?.reconciliationRequired === true);
}

/** Mirror the existing API's fulfillment eligibility; payment states are not fulfillment actions. */
export function nextFulfillmentStatus(order: Pick<AdminOrder, "status" | "is_paid" | "payment_method" | "payment_result">): "processing" | "shipped" | "delivered" | null {
  if (needsPaymentReview(order)) return null;
  if (order.status === "shipped") return order.is_paid ? "delivered" : null;
  if (!order.is_paid && order.payment_method !== "cod") return null;
  if (order.status === "pending" || order.status === "paid") return "processing";
  if (order.status === "processing") return "shipped";
  return null;
}

export function canApproveReturn(order: { return_status?: string | null; status?: string; payment_result?: AdminOrder['payment_result'] }): boolean {
  return !needsPaymentReview(order) && order.return_status === "requested";
}

/** Only the dedicated cash-on-delivery workflow may record payment manually. */
export function canRecordCashPayment(order: Pick<AdminOrder, "status" | "is_paid" | "payment_method" | "payment_result">): boolean {
  return !needsPaymentReview(order) && order.payment_method === "cod" && !order.is_paid && !["cancelled", "refunded", "returned"].includes(order.status);
}

/** Analytics and stock queues define low stock as one to five available units. */
export function isLowStock(stock: number): boolean {
  return stock > 0 && stock <= 5;
}
