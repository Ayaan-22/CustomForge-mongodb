import { describe, expect, it } from "vitest";
import { cartStockState } from "@/lib/cart-presentation";
import type { Product } from "@/lib/types";

const product = { availability: "In Stock" } as Product;
describe("cart stock presentation", () => {
  it("leaves unknown stock for checkout validation", () => {
    for (const stock of [undefined, NaN, Infinity, -1, 1.5]) {
      expect(cartStockState({ ...product, stock }, 2)).toMatchObject({
        canIncrease: true,
        blockingMessage: null,
        label: "Stock checked at checkout",
      });
    }
  });
  it("prevents increases at a known limit while allowing the existing quantity", () => {
    expect(cartStockState({ ...product, stock: 2 }, 2)).toMatchObject({
      canIncrease: false,
      blockingMessage: null,
    });
  });
  it("requires a reduction when the cart exceeds known stock", () => {
    expect(
      cartStockState({ ...product, stock: 2 }, 3).blockingMessage,
    ).toContain("Only 2 available");
  });
  it("blocks zero stock, inactive listings and explicitly unavailable items", () => {
    for (const candidate of [
      { ...product, stock: 0 },
      { ...product, isActive: false },
      { ...product, availability: "Out of Stock" as const },
    ]) {
      expect(cartStockState(candidate, 1)).toMatchObject({
        canIncrease: false,
        label: "Unavailable",
      });
      expect(cartStockState(candidate, 1).blockingMessage).toBeTruthy();
    }
  });
  it("keeps preorder status explicit instead of claiming ready stock", () => {
    expect(
      cartStockState({ ...product, availability: "Preorder" }, 1).label,
    ).toBe("Preorder");
  });
});
