import { describe, expect, it } from "vitest";
import { couponDateForSubmit, couponFormDate } from "@/lib/coupon-dates";

describe("editing campaign dates", () => {
  it("preserves a coupon with no start restriction or expiry", () => {
    expect(couponFormDate(null)).toBe("");
    expect(couponDateForSubmit(null, null)).toBeNull();
    expect(couponDateForSubmit("", null)).toBeNull();
  });
  it("retains the original time when the displayed date is unchanged", () => {
    const original = "2026-10-05T18:30:00.000Z";
    expect(couponDateForSubmit(couponFormDate(original), original)).toBe(original);
  });
  it("uses the selected day when an administrator changes the date", () => {
    expect(couponDateForSubmit("2026-10-07", "2026-10-05T18:30:00.000Z")).toBe("2026-10-07T00:00:00.000Z");
    expect(couponDateForSubmit(null, "2026-10-05T18:30:00.000Z")).toBeNull();
  });
});
