import { beforeEach, describe, expect, it, vi } from "vitest";
const cart = vi.hoisted(() => ({ get: vi.fn(), add: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn() }));
vi.mock("@/services/cart-service", () => ({ CartService: cart }));
import { syncCheckoutCart } from "@/lib/checkout-cart";
const item = (id: string, quantity = 1) => ({ product: { id }, quantity });
beforeEach(() => {
  vi.resetAllMocks();
  cart.add.mockResolvedValue({});
  cart.updateItem.mockResolvedValue({});
  cart.removeItem.mockResolvedValue({});
});
describe("checkout cart preparation", () => {
  it("does not mutate an already synchronized cart or clear its coupon", async () => {
    cart.get.mockResolvedValue({ data: { cart: { items: [item("a")], couponCode: "SAVE" } } });
    await syncCheckoutCart([item("a")]);
    expect(cart.add).not.toHaveBeenCalled();
    expect(cart.updateItem).not.toHaveBeenCalled();
    expect(cart.removeItem).not.toHaveBeenCalled();
  });
  it("syncs guest items and quantities without clearing the cart", async () => {
    cart.get.mockResolvedValue({ data: { cart: { items: [item("a"), item("removed")] } } });
    await syncCheckoutCart([item("a", 2), item("guest")]);
    expect(cart.updateItem).toHaveBeenCalledWith("a", { quantity: 2 });
    expect(cart.add).toHaveBeenCalledWith({ productId: "guest", quantity: 1 });
    expect(cart.removeItem).toHaveBeenCalledWith("removed");
  });
  it("stops checkout if reading the cart fails", async () => {
    cart.get.mockResolvedValue({ error: { message: "Offline" } });
    await expect(syncCheckoutCart([item("a")])).rejects.toThrow("Offline");
    expect(cart.add).not.toHaveBeenCalled();
  });
  it("stops on API error responses instead of ordering a partial cart", async () => {
    cart.get.mockResolvedValue({ data: { cart: { items: [] } } });
    cart.add.mockResolvedValue({ error: { message: "Out of stock" } });
    await expect(syncCheckoutCart([item("a"), item("b")])).rejects.toThrow("Out of stock");
    expect(cart.add).toHaveBeenCalledTimes(1);
  });
});
