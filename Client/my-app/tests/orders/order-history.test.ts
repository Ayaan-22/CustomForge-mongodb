import { describe, expect, it } from "vitest";
import { filterOrderPage, orderItemCount, orderDate } from "@/lib/order-history";
import type { Order } from "@/lib/types";

const now = Date.parse("2026-10-05T12:00:00Z");
const orders: Order[] = [
  {
    id: "A12-order",
    userId: "member",
    status: "pending",
    isPaid: false,
    createdAt: "2026-10-01T12:00:00Z",
    items: [{ productId: "gpu", name: "Cyan Graphics Card", quantity: 2 }],
  },
  {
    id: "B34-order",
    userId: "member",
    status: "delivered",
    isPaid: true,
    createdAt: "2026-07-01T12:00:00Z",
    items: [{ productId: "cpu", name: "Processor", quantity: 1 }],
  },
  {
    id: "C56-order",
    userId: "member",
    status: "pending",
    isPaid: false,
    items: [{ productId: "ssd", quantity: 1 }],
  },
];

describe("current-page order discovery", () => {
  it("finds case-insensitive product names or short IDs, including a leading hash", () => {
    expect(
      filterOrderPage(
        orders,
        { query: "graphics", status: "all", days: "all" },
        now,
      ),
    ).toEqual([orders[0]]);
    expect(
      filterOrderPage(
        orders,
        { query: " #b34 ", status: "all", days: "all" },
        now,
      ),
    ).toEqual([orders[1]]);
  });
  it("combines status and date filters without fabricating matches outside the page", () => {
    expect(
      filterOrderPage(
        orders,
        { query: "", status: "pending", days: "30" },
        now,
      ),
    ).toEqual([orders[0]]);
    expect(
      filterOrderPage(
        orders,
        { query: "", status: "delivered", days: "30" },
        now,
      ),
    ).toEqual([]);
    expect(
      filterOrderPage([], { query: "Cyan", status: "all", days: "all" }, now),
    ).toEqual([]);
  });
  it("keeps missing dates for all time and excludes them from a recent-date selection", () => {
    expect(
      filterOrderPage(
        orders,
        { query: "C56", status: "all", days: "all" },
        now,
      ),
    ).toEqual([orders[2]]);
    expect(
      filterOrderPage(
        orders,
        { query: "C56", status: "all", days: "365" },
        now,
      ),
    ).toEqual([]);
    expect(orderDate("invalid-date")).toBeUndefined();
    expect(orderDate(undefined)).toBeUndefined();
    expect(orderDate("2026-10-05T12:00:00Z")?.label).toBe("Oct 5, 2026");
  });
  it("counts quantities rather than lines in the order summary", () => {
    expect(
      orderItemCount({
        items: [
          { productId: "gpu", quantity: 2 },
          { productId: "cpu", quantity: 3 },
        ],
      }),
    ).toBe(5);
  });
});
