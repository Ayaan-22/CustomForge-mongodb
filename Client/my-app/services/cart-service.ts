import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import type { Cart } from "@/lib/types";

// The Express cart endpoint returns joined products, not just product IDs.
export type CartProduct = {
  id: string; name?: string; images?: string[]; original_price?: number;
  final_price?: number; stock?: number; is_active?: boolean;
};
export type ServerCart = Omit<Cart, "items"> & {
  items: Array<{ product: CartProduct; quantity: number }>;
};
export type CartResponse = {
  cart: ServerCart;
  totals: { subtotal: number; discount: number; finalPrice: number;
    shipping: number; tax: number; total: number;
    items: Array<{ product: { id: string; name: string }; quantity: number; unitPrice: number; lineTotal: number }>;
    coupon: { code: string } | null; couponError: string | null;
    warnings?: Array<{ message: string; productId?: string | null }>;
  };
};

export type AddToCartPayload = { productId: string; quantity: number };
export type UpdateItemPayload = { quantity: number };
export type CouponPayload = { code: string };

export const CartService = {
  get(): Promise<ApiResponse<CartResponse>> {
    return apiFetch("/cart", { method: "GET" });
  },

  add(payload: AddToCartPayload): Promise<ApiResponse<{ cart: Cart }>> {
    return apiFetch("/cart/add", { method: "POST", body: payload });
  },

  clear(): Promise<ApiResponse<{ message: string }>> {
    return apiFetch("/cart", { method: "DELETE" });
  },

  updateItem(
    productId: string,
    payload: UpdateItemPayload
  ): Promise<ApiResponse<{ cart: Cart }>> {
    return apiFetch("/cart/update", {
      method: "PATCH",
      body: { productId, ...payload },
    });
  },

  removeItem(productId: string): Promise<ApiResponse<{ cart: Cart }>> {
    return apiFetch(`/cart/remove/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  },

  applyCoupon(payload: CouponPayload): Promise<ApiResponse<{ cart: Cart }>> {
    return apiFetch("/cart/coupon", { method: "POST", body: payload });
  },

  removeCoupon(): Promise<ApiResponse<{ cart: Cart }>> {
    return apiFetch("/cart/coupon", { method: "DELETE" });
  },
};
