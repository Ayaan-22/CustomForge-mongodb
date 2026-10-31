import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "saved-order" }),
}));
import PaymentPage from "@/app/orders/[id]/payment/page";

const order: Order = {
  id: "saved-order",
  userId: "owner",
  status: "pending",
  isPaid: false,
  paymentMethod: "stripe",
  total: 174.9,
  subtotal: 159,
  shipping: 0,
  tax: 15.9,
  items: [
    { productId: "psu", name: "Gaming power supply", quantity: 1, price: 159 },
  ],
};
function render(record: Order) {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  query.setQueryData(["orders", record.id], {
    data: record,
    error: null,
    status: 200,
  });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={query}>
      <PaymentPage />
    </QueryClientProvider>,
  );
  query.clear();
  return html;
}
describe("saved-order payment UI", () => {
  it('shows the payment deadline and stops offering payment once it ends', () => {
    const future=render({...order,paymentExpiresAt:new Date(Date.now()+90*60_000).toISOString()});
    expect(future).toContain('Pay within two hours');
    const expired=render({...order,paymentExpiresAt:new Date(Date.now()-1).toISOString()});
    expect(expired).toContain('Payment window ended.');
    expect(expired).not.toContain('Pay $174.90 with Stripe');
  });
  it('explains a captured payment needing review without asking the customer to pay again', () => {
    const html=render({...order,status:'payment_review',isPaid:true});
    expect(html).toContain('Payment needs review.');
    expect(html).toContain('Do not pay again; contact store support with your order number.');
    expect(html).not.toContain('Pay $174.90 with Stripe');
    expect(html).not.toContain('Payment confirmed.');
  });
  it("offers the exact saved total and directs card entry to Stripe", () => {
    const html = render(order);
    expect(html).toContain("Pay $174.90 with Stripe");
    expect(html).toContain("Gaming power supply");
    expect(html).toContain("Stripe handles your card information.");
    expect(html).not.toContain("Create order");
  });
  it("does not fabricate a missing total", () => {
    const html = render({ ...order, total: undefined });
    expect(html).toContain("Order total needs a refresh.");
    expect(html).toContain("Not recorded");
    expect(html).not.toContain("with Stripe");
  });
  it("shows settled and delivery states without a payment button", () => {
    expect(render({ ...order, isPaid: true })).toContain("Payment confirmed.");
    const html = render({ ...order, paymentMethod: "cod" });
    expect(html).toContain("Pay on delivery.");
    expect(html).not.toContain("with Stripe");
  });
  it("does not present refunded payment as a fresh success", () => {
    const html = render({ ...order, status: "refunded", isPaid: true });
    expect(html).toContain("Payment is unavailable for this order.");
    expect(html).not.toContain("Payment confirmed.");
  });
  it("labels missing line prices without replacing them with zero", () => {
    const html = render({
      ...order,
      items: [{ productId: "psu", name: "Gaming power supply", quantity: 1 }],
    });
    expect(html).toContain("Not recorded");
    expect(html).not.toContain("$0.00");
  });
});
