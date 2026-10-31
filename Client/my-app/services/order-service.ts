import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import type { Order, OrderStatus } from "@/lib/types";

export type CreateOrderPayload = {
  shippingAddress?: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };
  shippingAddressId?: string;
  paymentMethod?: "stripe" | "cod";
  idempotencyKey: string;
};

export const OrderService = {
  create(payload: CreateOrderPayload): Promise<ApiResponse<Order>> {
    return apiFetch("/orders", { method: "POST", body: payload });
  },

  list(params?: {page?: number; limit?: number}): Promise<ApiResponse<Order[]>> {
    return apiFetch("/orders", { method: "GET", params });
  },

  get(id: string): Promise<ApiResponse<Order>> {
    return apiFetch(`/orders/${encodeURIComponent(id)}`, { method: "GET" });
  },

  paymentStatus(
    id: string
  ): Promise<ApiResponse<{ isPaid: boolean; status: OrderStatus; paidAt: string | null }>> {
    return apiFetch(`/orders/${encodeURIComponent(id)}/payment-status`, {
      method: "GET",
    });
  },

  cancel(id: string): Promise<ApiResponse<{id:string;status:"cancelled"}>> {
    return apiFetch(`/orders/cancel/${encodeURIComponent(id)}`, {
      method: "POST",
    });
  },

  return(id: string): Promise<ApiResponse<Order>> {
    return apiFetch(`/orders/request-return/${encodeURIComponent(id)}`, {
      method: "POST",
    });
  },
};
