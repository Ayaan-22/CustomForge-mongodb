import { CartService } from "@/services/cart-service";

type CheckoutItem = { product: { id: string }; quantity: number };

// Preserve coupons and unchanged items. Failed synchronization must stop checkout.
export async function syncCheckoutCart(items: CheckoutItem[]) {
  const response = await CartService.get();
  if (response.error || !response.data?.cart) {
    throw new Error(response.error?.message || "Unable to load your cart. Please try again.");
  }
  const saved = response.data.cart.items || [];
  for (const item of items) {
    const existing = saved.find(row => row.product.id === item.product.id);
    if (existing?.quantity === item.quantity) continue;
    const result = existing
      ? await CartService.updateItem(item.product.id, { quantity: item.quantity })
      : await CartService.add({ productId: item.product.id, quantity: item.quantity });
    if (result.error) throw new Error(result.error.message);
  }
  for (const item of saved) {
    if (items.some(row => row.product.id === item.product.id)) continue;
    const result = await CartService.removeItem(item.product.id);
    if (result.error) throw new Error(result.error.message);
  }
}
