import { describe, expect, it } from "vitest";
import {
  hasInvoicePricing,
  orderActionEligibility,
  orderReturnMessage,
  recordedLineTotal,
  recordedOrderAmount,
  recordedOrderDate,
} from "@/lib/order-detail";
import type { Order } from "@/lib/types";

describe("server-recorded order detail presentation", () => {
  it("allows cancellation only for pending, unpaid COD orders", () => {
    expect(
      orderActionEligibility({
        status: "pending",
        isPaid: false,
        paymentMethod: "cod",
      }).canCancel,
    ).toBe(true);
    expect(
      orderActionEligibility({
        status: "pending",
        isPaid: true,
        paymentMethod: "cod",
      }).canCancel,
    ).toBe(false);
    expect(
      orderActionEligibility({
        status: "pending",
        isPaid: false,
        paymentMethod: "stripe",
      }).canCancel,
    ).toBe(false);
    expect(
      orderActionEligibility({
        status: "processing",
        isPaid: false,
        paymentMethod: "cod",
      }).canCancel,
    ).toBe(false);
  });
  it("offers a first return only for delivered orders", () => {
    expect(
      orderActionEligibility({
        status: "delivered",
        isPaid: false,
        paymentMethod: "stripe",
      }).canReturn,
    ).toBe(true);
    expect(
      orderActionEligibility({
        status: "shipped",
        isPaid: true,
        paymentMethod: "cod",
      }).canReturn,
    ).toBe(false);
    expect(
      orderActionEligibility({
        status: "returned",
        isPaid: true,
        paymentMethod: "cod",
      }).canReturn,
    ).toBe(false);
  });
  it.each(['requested', 'approved', 'rejected', 'completed', 'unknown'])('prevents a duplicate return when its recorded state is %s', (returnStatus) => {
    expect(orderActionEligibility({status:'delivered',isPaid:true,paymentMethod:'cod',returnStatus}).canReturn).toBe(false);
    expect(orderReturnMessage(returnStatus)).toBeTruthy();
  });
  it('shows recorded return progress without promising a refund', () => {
    expect(orderReturnMessage('none')).toBeNull();
    expect(orderReturnMessage(undefined)).toBeNull();
    expect(orderReturnMessage('requested')).toContain('awaiting review');
    expect(orderReturnMessage('approved')).toContain('A refund has not been confirmed');
    expect(orderActionEligibility({status:'delivered',isPaid:true,returnStatus:'none'}).canReturn).toBe(true);
  });
  it("distinguishes known zero from missing, nonfinite or negative values", () => {
    expect(recordedOrderAmount(0)).toBe(true);
    expect(recordedOrderAmount(undefined)).toBe(false);
    expect(recordedOrderAmount("0")).toBe(false);
    expect(recordedOrderAmount(NaN)).toBe(false);
    expect(recordedOrderAmount(Infinity)).toBe(false);
    expect(recordedOrderAmount(-1)).toBe(false);
  });
  it("does not fabricate a line price from incomplete item data", () => {
    expect(recordedLineTotal({ quantity: 2 })).toBeUndefined();
    expect(recordedLineTotal({ price: 0, quantity: 2 })).toBe(0);
    expect(recordedLineTotal({ price: 25.5, quantity: 2 })).toBe(51);
    expect(recordedLineTotal({ price: 25, quantity: 0 })).toBeUndefined();
    expect(recordedLineTotal({ price: 25, quantity: 1.5 })).toBeUndefined();
  });
  it("gates incomplete invoice exports even when a server total is known", () => {
    const pricing: Pick<
      Order,
      "subtotal" | "discount" | "shipping" | "tax" | "total" | "items"
    > = {
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      items: [{ productId: "item", quantity: 1, price: 0 }],
    };
    expect(hasInvoicePricing(pricing)).toBe(true);
    expect(hasInvoicePricing({ ...pricing, tax: undefined })).toBe(false);
    expect(
      hasInvoicePricing({
        ...pricing,
        total: 100,
        items: [{ productId: "item", quantity: 1 }],
      }),
    ).toBe(false);
    expect(hasInvoicePricing({ ...pricing, items: [] })).toBe(false);
  });
  it("keeps missing or malformed dates unrecorded", () => {
    expect(recordedOrderDate(undefined)).toBeUndefined();
    expect(recordedOrderDate("not-a-date")).toBeUndefined();
    expect(recordedOrderDate("2026-10-05T12:00:00Z")?.toISOString()).toBe(
      "2026-10-05T12:00:00.000Z",
    );
  });
});
