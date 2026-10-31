import { describe, expect, it } from "vitest";
import { canApproveReturn, canRecordCashPayment, isLowStock, nextFulfillmentStatus } from "@/lib/commerce-policy";

describe("fulfillment controls follow existing payment and status rules", () => {
  it('blocks fulfillment, returns, and manual payment for orders awaiting payment reconciliation', () => {
    const order={status:'payment_review',is_paid:true,payment_method:'stripe',return_status:'requested'};
    expect(nextFulfillmentStatus(order)).toBeNull();
    expect(canApproveReturn(order)).toBe(false);
    expect(canRecordCashPayment(order)).toBe(false);
    expect(nextFulfillmentStatus({...order,status:'paid',payment_result:{reconciliationRequired:true}})).toBeNull();
  });
  it("offers processing for a paid checkout", () => {
    expect(nextFulfillmentStatus({status:"paid",is_paid:true,payment_method:"stripe"})).toBe("processing");
  });
  it("keeps unpaid card checkouts out of fulfillment", () => {
    expect(nextFulfillmentStatus({status:"pending",is_paid:false,payment_method:"stripe"})).toBeNull();
    expect(nextFulfillmentStatus({status:"processing",is_paid:false,payment_method:"stripe"})).toBeNull();
  });
  it("allows COD processing/shipping but requires payment before delivery", () => {
    expect(nextFulfillmentStatus({status:"pending",is_paid:false,payment_method:"cod"})).toBe("processing");
    expect(nextFulfillmentStatus({status:"processing",is_paid:false,payment_method:"cod"})).toBe("shipped");
    expect(nextFulfillmentStatus({status:"shipped",is_paid:false,payment_method:"cod"})).toBeNull();
    expect(nextFulfillmentStatus({status:"shipped",is_paid:true,payment_method:"cod"})).toBe("delivered");
  });
  it.each(["delivered","cancelled","returned","refunded"])("offers no fulfillment transition for %s", status => {
    expect(nextFulfillmentStatus({status,is_paid:true,payment_method:"stripe"})).toBeNull();
  });
  it("approves an actual return request rather than any delivered order", () => {
    expect(canApproveReturn({return_status:"requested"})).toBe(true);
    for (const return_status of [undefined,"none","approved","completed"]) expect(canApproveReturn({return_status})).toBe(false);
  });
  it("can record outstanding COD payment before delivery, but never card payment or a closed order", () => {
    const unpaid = {status:"shipped",is_paid:false,payment_method:"cod"};
    expect(canRecordCashPayment(unpaid)).toBe(true);
    expect(canRecordCashPayment({...unpaid,is_paid:true})).toBe(false);
    expect(canRecordCashPayment({...unpaid,payment_method:"stripe"})).toBe(false);
    for (const status of ["cancelled","refunded","returned"]) expect(canRecordCashPayment({...unpaid,status})).toBe(false);
  });
});

describe("stock warnings use the same boundary as inventory analytics", () => {
  it("includes five available units but excludes sold out and six units", () => {
    expect(isLowStock(0)).toBe(false);
    expect(isLowStock(1)).toBe(true);
    expect(isLowStock(5)).toBe(true);
    expect(isLowStock(6)).toBe(false);
  });
});
