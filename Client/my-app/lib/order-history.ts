import type { Order, OrderStatus } from "./types";

export type OrderHistoryFilters = {
  query: string;
  status: "all" | OrderStatus;
  days: "all" | "30" | "90" | "365";
};
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  payment_review: "Payment needs review",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

/** This intentionally filters only the supplied API page, never claims account-wide search. */
export function filterOrderPage(
  orders: Order[],
  filters: OrderHistoryFilters,
  now = Date.now(),
) {
  const search = filters.query.trim().toLowerCase().replace(/^#/, "");
  const cutoff =
    filters.days === "all"
      ? undefined
      : now - Number(filters.days) * 24 * 60 * 60 * 1000;
  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status)
      return false;
    if (cutoff !== undefined) {
      const created = order.createdAt ? Date.parse(order.createdAt) : NaN;
      if (!Number.isFinite(created) || created < cutoff) return false;
    }
    return (
      !search ||
      order.id.toLowerCase().includes(search) ||
      order.items.some((item) => item.name?.toLowerCase().includes(search))
    );
  });
}

export function orderItemCount(order: Pick<Order, "items">) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function orderDate(date: string | undefined) {
  const timestamp = date ? Date.parse(date) : NaN;
  if (!Number.isFinite(timestamp)) return undefined;
  return {
    iso: new Date(timestamp).toISOString(),
    label: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(timestamp),
  };
}
