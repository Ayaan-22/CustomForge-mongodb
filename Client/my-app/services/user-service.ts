import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import { WishlistItemSchema } from "@/lib/schema";
import type {
  Order,
  User,
  WishlistItem,
  Address,
  PaymentMethod,
} from "@/lib/types";

export type UpdateMePayload = Partial<
  Pick<User, "name" | "avatar" | "phone" | "address">
>;
export type AddressPayload = Omit<Address, "id" | "isDefault" | "userId" | "line1" | "line2">;
export type UpdateAddressPayload = Partial<AddressPayload>;

export const UserService = {
  me(): Promise<ApiResponse<User | null>> {
    return apiFetch("/users/me", { method: "GET" });
  },

  updateMe(
    payload: UpdateMePayload,
    twoFactorToken?: string
  ): Promise<ApiResponse<User>> {
    return apiFetch("/users/profile", {
      method: "PATCH",
      body: payload,
      headers: twoFactorToken ? { "x-2fa-token": twoFactorToken } : undefined,
    });
  },

  deleteMe(twoFactorToken?: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch("/users/delete-account", {
      method: "DELETE",
      headers: twoFactorToken ? { "x-2fa-token": twoFactorToken } : undefined,
    });
  },

  changePassword(
    payload: import("./auth-service").UpdatePasswordPayload,
    twoFactorToken?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiFetch("/auth/update-password", {
      method: "PATCH",
      body: payload,
      headers: twoFactorToken ? { "x-2fa-token": twoFactorToken } : undefined,
    });
  },

  async wishlist(): Promise<ApiResponse<WishlistItem[]>> {
    const response = await apiFetch<unknown>("/users/wishlist", { method: "GET" });
    if (response.error) return { ...response, data: null };
    const parsed = WishlistItemSchema.array().safeParse(response.data);
    if (!parsed.success) return {
      data: null, status: 502,
      error: { status: 502, message: "Unable to load your saved items. Please try again." },
    };
    return { ...response, data: parsed.data };
  },

  addToWishlist(productId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/wishlist/${encodeURIComponent(productId)}`, {
      method: "POST",
    });
  },

  removeFromWishlist(
    productId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/wishlist/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  },

  orders(): Promise<ApiResponse<Order[]>> {
    return apiFetch("/orders", { method: "GET" });
  },

  getAddresses(): Promise<ApiResponse<Address[]>> {
    return apiFetch("/users/addresses", { method: "GET" });
  },

  addAddress(
    payload: AddressPayload
  ): Promise<ApiResponse<{ address: Address }>> {
    return apiFetch("/users/addresses", { method: "POST", body: payload });
  },

  updateAddress(
    id: string,
    payload: UpdateAddressPayload
  ): Promise<ApiResponse<{ address: Address }>> {
    return apiFetch(`/users/addresses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },

  setDefaultAddress(id: string): Promise<ApiResponse<{ address: Address }>> {
    return apiFetch(`/users/addresses/${encodeURIComponent(id)}/default`, {
      method: "PATCH",
    });
  },

  deleteAddress(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/addresses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return apiFetch("/users/payment-methods", { method: "GET" });
  },

  addPaymentMethod(
    payload: any
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return apiFetch("/users/payment-methods", {
      method: "POST",
      body: payload,
    });
  },

  updatePaymentMethod(
    id: string,
    payload: any
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return apiFetch(`/users/payment-methods/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },

  setDefaultPaymentMethod(
    id: string
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return apiFetch(
      `/users/payment-methods/${encodeURIComponent(id)}/default`,
      { method: "PATCH" }
    );
  },

  deletePaymentMethod(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/payment-methods/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
