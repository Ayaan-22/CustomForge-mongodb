import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import type { User, Product, Order, Review } from "@/lib/types";

// Types
export type AdminDashboardStats = {
  totalSales: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
};

export type SalesAnalytics = {
  date: string;
  sales: number;
  orders: number;
}[];

export type UserAnalytics = {
  date: string;
  users: number;
}[];

export type ProductStats = {
  total: number;
  active: number;
  outOfStock: number;
  topSelling: Product[];
};

export type CreateUserPayload = Partial<User> & { password: string };
export type UpdateUserPayload = Partial<User>;

export type CreateProductPayload = FormData; // Multipart
export type UpdateProductPayload = FormData; // Multipart

export type CreateCouponPayload = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expirationDate?: string;
  usageLimit?: number;
  minPurchaseAmount?: number;
};

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export type LogEntry = {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  meta?: any;
};

export const AdminService = {
  // Analytics
  getDashboardOverview(): Promise<ApiResponse<AdminDashboardStats>> {
    return apiFetch("/admin/analytics/overview", { method: "GET" });
  },
  getSalesAnalytics(period?: string): Promise<ApiResponse<SalesAnalytics>> {
    return apiFetch("/admin/analytics/sales", {
      method: "GET",
      params: { period },
    });
  },
  getUserAnalytics(period?: string): Promise<ApiResponse<UserAnalytics>> {
    return apiFetch("/admin/analytics/users", {
      method: "GET",
      params: { period },
    });
  },
  getProductStats(): Promise<ApiResponse<ProductStats>> {
    return apiFetch("/admin/analytics/products", { method: "GET" });
  },
  getInventoryAnalytics(): Promise<ApiResponse<any>> {
    return apiFetch("/admin/analytics/inventory", { method: "GET" });
  },
  getOrderAnalytics(period?: string): Promise<ApiResponse<any>> {
    return apiFetch("/admin/analytics/orders", {
      method: "GET",
      params: { period },
    });
  },

  // User Management
  getUsers(
    params?: any
  ): Promise<ApiResponse<{ users: User[]; count: number }>> {
    return apiFetch("/admin/users", { method: "GET", params });
  },
  createUser(payload: CreateUserPayload): Promise<ApiResponse<{ user: User }>> {
    return apiFetch("/admin/users", { method: "POST", body: payload });
  },
  getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  },
  updateUser(
    id: string,
    payload: UpdateUserPayload
  ): Promise<ApiResponse<{ user: User }>> {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Product Management
  getProducts(
    params?: any
  ): Promise<ApiResponse<{ products: Product[]; count: number }>> {
    return apiFetch("/admin/products", { method: "GET", params });
  },
  createProduct(
    payload: CreateProductPayload
  ): Promise<ApiResponse<{ product: Product }>> {
    // Note: apiFetch handles FormData automatically if body is FormData
    return apiFetch("/admin/products", { method: "POST", body: payload });
  },
  updateProduct(
    id: string,
    payload: UpdateProductPayload
  ): Promise<ApiResponse<{ product: Product }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  toggleProductActive(id: string): Promise<ApiResponse<{ product: Product }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}/toggle-active`, {
      method: "PATCH",
    });
  },
  toggleProductFeature(id: string): Promise<ApiResponse<{ product: Product }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}/feature`, {
      method: "PATCH",
    });
  },
  updateProductStock(
    id: string,
    quantity: number
  ): Promise<ApiResponse<{ product: Product }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}/stock`, {
      method: "PATCH",
      body: { quantity },
    });
  },
  getProductReviews(id: string): Promise<ApiResponse<{ reviews: Review[] }>> {
    return apiFetch(`/admin/products/${encodeURIComponent(id)}/reviews`, {
      method: "GET",
    });
  },
  deleteProductReview(
    productId: string,
    reviewId: string
  ): Promise<ApiResponse<{ message: string }>> {
    // Note: adminRoutes.js defines DELETE /products/:id/reviews but controller is deleteProductReview
    // Wait, route is router.route("/products/:id/reviews").delete(deleteProductReview)
    // But deleteProductReview usually takes reviewId.
    // Let's check adminController.js for deleteProductReview signature.
    // Assuming it takes reviewId from body or query?
    // Actually route is /products/:id/reviews.
    // This seems like it deletes ALL reviews or specific?
    // Let's assume it deletes specific review passed in body or query for now.
    // Actually, looking at adminRoutes.js line 126: .delete(deleteProductReview)
    // And line 159: router.delete("/reviews/:id", deleteProductReview);
    // So there are two ways. The second one is cleaner.
    return apiFetch(`/admin/reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
  },

  // Order Management
  getOrders(
    params?: any
  ): Promise<ApiResponse<{ orders: Order[]; count: number }>> {
    return apiFetch("/admin/orders", { method: "GET", params });
  },
  getOrder(id: string): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  },
  updateOrderStatus(
    id: string,
    status: string
  ): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/update-status`, {
      method: "PATCH",
      body: { status },
    });
  },
  markOrderPaid(id: string): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/mark-paid`, {
      method: "PATCH",
    });
  },
  markOrderDelivered(id: string): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/mark-delivered`, {
      method: "PATCH",
    });
  },
  processRefund(
    id: string,
    amount?: number,
    reason?: string
  ): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/refund`, {
      method: "PATCH",
      body: { amount, reason },
    });
  },
  approveReturn(id: string): Promise<ApiResponse<{ order: Order }>> {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/approve-return`, {
      method: "PATCH",
    });
  },

  // Coupon Management
  getCoupons(
    params?: any
  ): Promise<ApiResponse<{ coupons: any[]; count: number }>> {
    return apiFetch("/admin/coupons", { method: "GET", params });
  },
  createCoupon(
    payload: CreateCouponPayload
  ): Promise<ApiResponse<{ coupon: any }>> {
    return apiFetch("/admin/coupons", { method: "POST", body: payload });
  },
  getCoupon(id: string): Promise<ApiResponse<{ coupon: any }>> {
    return apiFetch(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  },
  updateCoupon(
    id: string,
    payload: UpdateCouponPayload
  ): Promise<ApiResponse<{ coupon: any }>> {
    return apiFetch(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteCoupon(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  toggleCoupon(id: string): Promise<ApiResponse<{ coupon: any }>> {
    return apiFetch(`/admin/coupons/${encodeURIComponent(id)}/toggle`, {
      method: "PATCH",
    });
  },

  // Review Management
  getAllReviews(
    params?: any
  ): Promise<ApiResponse<{ reviews: Review[]; count: number }>> {
    return apiFetch("/admin/reviews", { method: "GET", params });
  },
  moderateReview(
    id: string,
    approved: boolean
  ): Promise<ApiResponse<{ review: Review }>> {
    return apiFetch(`/admin/reviews/${encodeURIComponent(id)}/moderate`, {
      method: "PATCH",
      body: { approved },
    });
  },
  deleteReview(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/admin/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Logs
  getLogs(
    params?: any
  ): Promise<ApiResponse<{ logs: LogEntry[]; count: number }>> {
    return apiFetch("/admin/logs", { method: "GET", params });
  },
  getLogStats(): Promise<ApiResponse<any>> {
    return apiFetch("/admin/logs/stats", { method: "GET" });
  },
  getLog(id: string): Promise<ApiResponse<{ log: LogEntry }>> {
    return apiFetch(`/admin/logs/${encodeURIComponent(id)}`, { method: "GET" });
  },
};
