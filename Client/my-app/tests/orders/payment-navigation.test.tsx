import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/types";
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "605f0b0e-3047-423d-9aa0-c2a6b3f7c1a8" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/orders",
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "owner", name: "Test account", email: "owner@example.test" },
    isEmailVerified: true,
  }),
}));
import OrderDetailsPage from "@/app/orders/[id]/page";
import OrdersPage from "@/app/orders/page";

const order: Order = {
  id: "605f0b0e-3047-423d-9aa0-c2a6b3f7c1a8",
  userId: "owner",
  status: "pending",
  paymentMethod: "stripe",
  isPaid: false,
  items: [
    {
      productId: "product",
      name: "Gaming power supply",
      price: 159,
      quantity: 1,
    },
  ],
  subtotal: 159,
  tax: 15.9,
  shipping: 0,
  total: 174.9,
};

function render(Page: typeof OrdersPage, record: Order) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["orders", record.id], {
    data: record,
    error: null,
    status: 200,
  });
  client.setQueryData(["orders", "list", 1], {
    data: [record],
    error: null,
    status: 200,
  });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

describe.each([
  ["order details", OrderDetailsPage],
  ["order history", OrdersPage],
] as const)("%s payment navigation", (_name, Page) => {
  it("offers payment for the existing unpaid Stripe order without requiring a success URL parameter", () => {
    const html = render(Page, order);
    expect(html).toContain(`href="/orders/${order.id}/payment"`);
    expect(html).toContain("Continue to payment");
    expect(html).toContain("$174.90");
  });
  it("allows an unpaid processing order to resume checkout", () => {
    expect(render(Page, { ...order, status: "processing" })).toContain(
      "Continue to payment",
    );
  });
  it.each([
    "paid",
    "payment_review",
    "cancelled",
    "refunded",
    "returned",
    "shipped",
    "delivered",
  ] as const)("hides payment for %s orders", (status) => {
    expect(render(Page, { ...order, status })).not.toContain(
      "Continue to payment",
    );
  });
  it("hides payment as soon as the server confirms settlement, even with a pending status", () => {
    expect(render(Page, { ...order, isPaid: true })).not.toContain(
      "Continue to payment",
    );
  });
  it('labels captured payment review and leaves payment/cancellation/return unavailable', () => {
    const html=render(Page,{...order,status:'payment_review',isPaid:true});
    expect(html).toContain('Payment needs review');
    expect(html).not.toContain('Continue to payment');
    expect(html).not.toContain('Cancel order');
    expect(html).not.toContain('Request return');
  });
  it.each(["cod", "paypal", undefined] as const)(
    "does not offer Stripe checkout for method %s",
    (paymentMethod) => {
      expect(render(Page, { ...order, paymentMethod })).not.toContain(
        "Continue to payment",
      );
    },
  );
});
