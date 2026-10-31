import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/types";
import {
  paymentPresentation,
  recordedAmount,
  stripeCheckoutUrl,
  paymentTimeRemaining,
} from "@/lib/payment-presentation";

const order: Order = {
  id: "saved-order",
  userId: "owner",
  status: "pending",
  isPaid: false,
  paymentMethod: "stripe",
  total: 174.9,
  items: [],
};

describe("payment presentation", () => {
  it('closes unpaid Stripe payment exactly at the server deadline while preserving confirmed payments and COD', () => {
    const now=Date.parse('2026-10-09T12:00:00Z');
    const timed={...order,paymentExpiresAt:new Date(now).toISOString()};
    expect(paymentPresentation(timed,now-1)).toBe('ready');
    expect(paymentPresentation(timed,now)).toBe('expired');
    expect(paymentPresentation({...timed,isPaid:true},now)).toBe('confirmed');
    expect(paymentPresentation({...timed,paymentMethod:'cod'},now)).toBe('delivery');
    expect(paymentTimeRemaining(timed,now)).toBe('Payment window ended');
    expect(paymentTimeRemaining(timed,now-90*60_000)).toBe('1h 30m left');
  });
  it('distinguishes captured payments needing merchant review from successful fulfillment', () => {
    expect(paymentPresentation({...order,status:'payment_review',isPaid:true})).toBe('review');
    expect(paymentPresentation({...order,isPaid:true,paymentResult:{reconciliationRequired:true}})).toBe('review');
    expect(paymentPresentation({...order,status:'refunded',isPaid:true,paymentResult:{reconciliationRequired:true}})).toBe('closed');
  });
  it.each(["pending", "processing"] as const)(
    "allows a saved unpaid %s Stripe order",
    (status) => {
      expect(paymentPresentation({ ...order, status })).toBe("ready");
    },
  );
  it.each(["cancelled", "refunded", "returned"] as const)(
    "keeps %s orders closed even when historically paid",
    (status) => {
      expect(paymentPresentation({ ...order, status, isPaid: true })).toBe(
        "closed",
      );
    },
  );
  it.each(["shipped", "delivered", "paid"] as const)(
    "does not offer payment for an unsettled %s record",
    (status) => {
      expect(paymentPresentation({ ...order, status })).toBe("closed");
    },
  );
  it("requires confirmed settlement and preserves payment-method meaning", () => {
    expect(paymentPresentation({ ...order, isPaid: true })).toBe("confirmed");
    expect(paymentPresentation({ ...order, paymentMethod: "cod" })).toBe(
      "delivery",
    );
    expect(paymentPresentation({ ...order, paymentMethod: "paypal" })).toBe(
      "unavailable",
    );
    expect(paymentPresentation({ ...order, paymentMethod: undefined })).toBe(
      "unavailable",
    );
    expect(
      paymentPresentation({ ...order, isPaid: undefined } as unknown as Order),
    ).toBe("unavailable");
  });
  it.each([undefined, NaN, Infinity, -12, 0, 0.001, Number.MAX_SAFE_INTEGER])(
    "blocks an invalid total %s",
    (total) => {
      expect(paymentPresentation({ ...order, total })).toBe("missing-total");
    },
  );
  it("retains recorded zero shipping but rejects absent or malformed values", () => {
    expect(recordedAmount(0)).toBe(true);
    for (const value of [undefined, null, "0", NaN, Infinity, -1])
      expect(recordedAmount(value)).toBe(false);
  });
});

describe("Stripe handoff address", () => {
  it("allows only the HTTPS provider host", () => {
    expect(
      stripeCheckoutUrl(
        "https://checkout.stripe.com/c/pay/cs_test_example#session",
      ),
    ).toBe("https://checkout.stripe.com/c/pay/cs_test_example#session");
  });
  it.each([
    undefined,
    "",
    "not a url",
    "/checkout",
    "http://checkout.stripe.com/pay",
    "https://checkout.stripe.com.evil.test/pay",
    "https://evil.test/checkout.stripe.com",
    "https://checkout.stripe.com@evil.test/pay",
    "https://user:password@checkout.stripe.com/pay",
    "https://checkout.stripe.com:444/pay",
    "javascript:alert(1)",
  ])("rejects unsafe checkout URL %s", (value) => {
    expect(() => stripeCheckoutUrl(value)).toThrow();
  });
});
