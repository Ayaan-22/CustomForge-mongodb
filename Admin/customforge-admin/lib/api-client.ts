import type {DashboardOverview,SalesAnalytics,UserAnalytics,OrderAnalytics,ProductStats,InventoryAnalytics} from '@/types/analytics';
/**
 * API Client for CustomForge Admin Dashboard
 * Handles all API requests to /api/v1/admin endpoints
 */

import {
  transformCouponToBackend,
  transformCouponToFrontend,
  type Coupon,
  type CouponPayload,
} from "./coupon-transforms";

import {productFromRow, type ProductRow} from './product-transform';
import type {Page, AdminProductPayload, AdminUserPayload} from '@/types/admin';
import type {LogPage, LogStats} from '@/types/logs';
import { API_BASE as ROOT_API_BASE, request as fetchWithAuth } from './transport';
const API_BASE = ROOT_API_BASE + '/admin';

export const apiClient = {
  // Dashboard & Analytics
  getDashboardOverview: async (period = "30d") => {
    const response = await fetchWithAuth(
      `${API_BASE}/analytics/overview?period=${period}`
    );
    if (!response.ok) {
      console.error(
        `[API Error] getDashboardOverview: ${response.status} ${response.statusText}`
      );
      throw new Error("Failed to fetch dashboard overview");
    }
    return response.json().then((res: {data:DashboardOverview}) => res.data);
  },

  getSalesAnalytics: async (days = 30, grouping = "daily") => {
    const response = await fetchWithAuth(
      `${API_BASE}/analytics/sales?days=${days}&period=${grouping}`
    );
    if (!response.ok) throw new Error("Failed to fetch sales analytics");
    return response.json().then((res: {data:SalesAnalytics}) => res.data);
  },

  getUserAnalytics: async (period = "30d") => {
    const response = await fetchWithAuth(
      `${API_BASE}/analytics/users?days=${period === "1y" ? 365 : parseInt(period, 10)}`
    );
    if (!response.ok) throw new Error("Failed to fetch user analytics");
    return response.json().then((res: {data:UserAnalytics}) => res.data);
  },

  getOrderAnalytics: async (period = "30d") => {
    const response = await fetchWithAuth(
      `${API_BASE}/analytics/orders?days=${period === "1y" ? 365 : parseInt(period, 10)}`
    );
    if (!response.ok) throw new Error("Failed to fetch order analytics");
    return response.json().then((res: {data:OrderAnalytics}) => res.data);
  },

  getProductStats: async () => {
    const response = await fetchWithAuth(`${API_BASE}/analytics/products`);
    if (!response.ok) throw new Error("Failed to fetch product stats");
    return response.json().then((res: {data:ProductStats}) => res.data);
  },

  getInventoryAnalytics: async () => {
    const response = await fetchWithAuth(`${API_BASE}/analytics/inventory`);
    if (!response.ok) throw new Error("Failed to fetch inventory analytics");
    return response.json().then((res: {data:InventoryAnalytics}) => res.data);
  },

  // User Management
  getUsers: async (query?: {
    search?: string;
    role?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {

    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.role) params.append("role", query.role);
    if (query?.isActive) params.append("isActive", query.isActive);
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));

    const response = await fetchWithAuth(
      `${API_BASE}/users?${params.toString()}`
    );

    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  getUserById: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    const body = await response.json();
    return body.data;
  },

  createUser: async (data: AdminUserPayload) => {
    const response = await fetchWithAuth(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  updateUser: async (id: string, data: AdminUserPayload) => {
    const response = await fetchWithAuth(`${API_BASE}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update user");
    return response.json();
  },

  deleteUser: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/users/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete user");
    return response.json();
  },

  // Product Management
  getProducts: async (query?: {
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    availability?: string;
    isActive?: string;
    isFeatured?: string;
    createdFrom?: string;
    createdTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {

    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.category && query.category !== "all")
      params.append("category", query.category);
    if (query?.brand) params.append("brand", query.brand);
    if (query?.minPrice !== undefined) params.append("minPrice", String(query.minPrice));
    if (query?.maxPrice !== undefined) params.append("maxPrice", String(query.maxPrice));
    if (query?.minStock !== undefined) params.append("minStock", String(query.minStock));
    if (query?.maxStock !== undefined) params.append("maxStock", String(query.maxStock));
    if (query?.availability) params.append("availability", query.availability);
    if (query?.isActive) params.append("isActive", query.isActive);
    if (query?.isFeatured) params.append("isFeatured", query.isFeatured);
    if (query?.createdFrom) params.append("createdFrom", query.createdFrom);
    if (query?.createdTo) params.append("createdTo", query.createdTo);
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));

    const response = await fetchWithAuth(
      `${API_BASE}/products?${params.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch products");
    const page: Page<ProductRow> = await response.json();
    return {...page, data: page.data.map(productFromRow)};
  },

  createProduct: async (data: AdminProductPayload) => {

    // Check if we have file uploads
    const imageFiles = data.imageFiles;
    const hasFiles = imageFiles && imageFiles.length > 0;

    if (hasFiles) {
      // Use FormData for file uploads
      const formData = new FormData();

      // Append all fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === "imageFiles") {
          // Append files
          imageFiles.forEach((file: File) => {
            formData.append("images", file);
          });
        } else if (key === "images") {
          // Keep retained URLs; file previews are not database images.
          formData.append("images", JSON.stringify(data.images.filter((image: string) => image.startsWith("https://"))));
        } else if (typeof value === "object" && value !== null) {
          // Stringify objects (specifications, features, dimensions)
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await fetchWithAuth(`${API_BASE}/products`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    } else {
      // No files, use JSON
      const response = await fetchWithAuth(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    }
  },

  updateProduct: async (id: string, data: AdminProductPayload) => {

    // Check if we have file uploads
    const imageFiles = data.imageFiles;
    const hasFiles = imageFiles && imageFiles.length > 0;

    if (hasFiles) {
      // Use FormData for file uploads
      const formData = new FormData();

      // Append all fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === "imageFiles") {
          // Append files
          imageFiles.forEach((file: File) => {
            formData.append("images", file);
          });
        } else if (key === "images") {
          // Keep retained URLs; file previews are not database images.
          formData.append("images", JSON.stringify(data.images.filter((image: string) => image.startsWith("https://"))));
        } else if (typeof value === "object" && value !== null) {
          // Stringify objects (specifications, features, dimensions)
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await fetchWithAuth(`${API_BASE}/products/${id}`, {
        method: "PATCH",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    } else {
      // No files, use JSON
      const response = await fetchWithAuth(`${API_BASE}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    }
  },

  deleteProduct: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/products/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to delete product");
    }
    return response.json();
  },

  toggleProductActive: async (id: string) => {
    const response = await fetchWithAuth(
      `${API_BASE}/products/${id}/toggle-active`,
      {
        method: "PATCH",
      }
    );
    if (!response.ok) throw new Error("Failed to toggle product active status");
    return response.json();
  },

  toggleProductFeature: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/products/${id}/feature`, {
      method: "PATCH",
    });
    if (!response.ok)
      throw new Error("Failed to toggle product feature status");
    return response.json();
  },

  updateProductStock: async (id: string, stock: number) => {
    const response = await fetchWithAuth(`${API_BASE}/products/${id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock }),
    });
    if (!response.ok) throw new Error("Failed to update product stock");
    return response.json();
  },

  getProductReviews: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/products/${id}/reviews`);
    if (!response.ok) throw new Error("Failed to fetch product reviews");
    return response.json();
  },

  deleteProductReview: async (productId: string, reviewId: string) => {
    // Note: The router has two routes for deleting reviews:
    // 1. DELETE /products/:id/reviews (which seems to expect a reviewId in body or query, or delete all?)
    // 2. DELETE /reviews/:id (direct delete by review ID)
    // Based on standard practices, we'll use the direct review delete endpoint
    const response = await fetchWithAuth(`${API_BASE}/reviews/${reviewId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete product review");
    return response.json();
  },

  // Order Management
  getOrders: async (query?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    isPaid?: string;
    minTotal?: number;
    maxTotal?: number;
    createdFrom?: string;
    createdTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));
    if (query?.status && query.status !== "all")
      params.append("status", query.status);
    if (query?.isPaid) params.append("isPaid", query.isPaid);
    if (query?.minTotal !== undefined) params.append("minTotal", String(query.minTotal));
    if (query?.maxTotal !== undefined) params.append("maxTotal", String(query.maxTotal));
    if (query?.createdFrom) params.append("createdFrom", query.createdFrom);
    if (query?.createdTo) params.append("createdTo", query.createdTo);
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    const response = await fetchWithAuth(`${API_BASE}/orders?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch orders");
    return response.json();
  },

  getOrderById: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/orders/${id}`);
    if (!response.ok) throw new Error("Failed to fetch order");
    return response.json();
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await fetchWithAuth(
      `${API_BASE}/orders/${id}/update-status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) throw new Error("Failed to update order status");
    return response.json();
  },

  markOrderAsPaid: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/orders/${id}/mark-paid`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to mark order as paid");
    return response.json();
  },

  deliverOrder: async (id: string) => {
    const response = await fetchWithAuth(
      `${API_BASE}/orders/${id}/mark-delivered`,
      {
        method: "PATCH",
      }
    );
    if (!response.ok) throw new Error("Failed to mark order as delivered");
    return response.json();
  },

  refundOrder: async (id: string) => {
    // Supports both PATCH and POST as per router
    const response = await fetchWithAuth(`${API_BASE}/orders/${id}/refund`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to refund order");
    return response.json();
  },

  approveReturn: async (id: string) => {
    const response = await fetchWithAuth(
      `${API_BASE}/orders/${id}/approve-return`,
      {
        method: "PATCH",
      }
    );
    if (!response.ok) throw new Error("Failed to approve return");
    return response.json();
  },

  processReturn: async (id: string, returnStatus = "completed") => {
    const response = await fetchWithAuth(
      `${API_BASE}/orders/${id}/process-return`,
      {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({returnStatus}),
      }
    );
    if (!response.ok) throw new Error("Failed to process return");
    return response.json();
  },

  // Coupon Management
  getCoupons: async (query: Record<string, string | number> = {}) => {
    const params = new URLSearchParams(Object.entries(query).map(([k,v]) => [k,String(v)]));
    const response = await fetchWithAuth(`${API_BASE}/coupons?${params}`);
    if (!response.ok) throw new Error("Failed to fetch coupons");
    const data = await response.json();

    // Transform backend data to frontend format
    if (Array.isArray(data)) {
      return data.map((coupon: CouponPayload) =>
        transformCouponToFrontend(coupon)
      );
    } else if (data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map((coupon: CouponPayload) =>
          transformCouponToFrontend(coupon)
        ),
      };
    }
    return data;
  },

  getCoupon: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/coupons/${id}`);
    if (!response.ok) throw new Error("Failed to fetch coupon");
    const data = await response.json();

    // Transform backend data to frontend format
    if (data.data) {
      return {
        ...data,
        data: transformCouponToFrontend(data.data),
      };
    }
    return transformCouponToFrontend(data);
  },

  createCoupon: async (data: Coupon) => {

    // Transform frontend data to backend format
    const backendPayload = transformCouponToBackend(data);

    const response = await fetchWithAuth(`${API_BASE}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to create coupon");
    }
    const result = await response.json();

    // Transform response back to frontend format if it contains coupon data
    if (result.data) {
      return {
        ...result,
        data: transformCouponToFrontend(result.data),
      };
    }
    return result;
  },

  updateCoupon: async (id: string, data: Coupon) => {

    // Transform frontend data to backend format
    const backendPayload = transformCouponToBackend(data);

    const response = await fetchWithAuth(`${API_BASE}/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update coupon");
    }
    const result = await response.json();

    // Transform response back to frontend format if it contains coupon data
    if (result.data) {
      return {
        ...result,
        data: transformCouponToFrontend(result.data),
      };
    }
    return result;
  },

  deleteCoupon: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/coupons/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete coupon");
    return response.json();
  },

  toggleCoupon: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/coupons/${id}/toggle`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to toggle coupon");
    return response.json();
  },

  // Review Management
  getReviews: async (query: Record<string, string | number> = {}) => {
    const params = new URLSearchParams(Object.entries(query).map(([k,v]) => [k,String(v)]));
    const response = await fetchWithAuth(`${API_BASE}/reviews?${params}`);
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
  },

  moderateReview: async (
    id: string,
    data: {
      action?: "approve" | "reject";
      isActive?: boolean;
      reportReason?: string;
    }
  ) => {
    const response = await fetchWithAuth(`${API_BASE}/reviews/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to moderate review");
    return response.json();
  },

  deleteReview: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/reviews/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete review");
    return response.json();
  },

  // Log Management
  getLogs: async (page = 1, limit = 50, search = "", level = "all"): Promise<LogPage> => {
    const response = await fetchWithAuth(
      `${API_BASE}/logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${level === "all" ? "" : `&level=${encodeURIComponent(level)}`}`
    );
    if (!response.ok) throw new Error("Failed to fetch logs");
    return response.json();
  },

  getLogDetail: async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE}/logs/${id}`);
    if (!response.ok) throw new Error("Failed to fetch log detail");
    return response.json();
  },

  getAvailableLogDates: async () => {
    const response = await fetchWithAuth(`${API_BASE}/logs/dates/available`);
    if (!response.ok) throw new Error("Failed to fetch available log dates");
    return response.json();
  },

  getLogStats: async (): Promise<LogStats> => {
    const response = await fetchWithAuth(`${API_BASE}/logs/stats`);
    if (!response.ok) throw new Error("Failed to fetch log stats");
    return response.json().then((res) => ({...res.data, date: res.date, timezone: res.timezone}));
  },

  getErrorLogs: async (page = 1, limit = 50) => {
    const response = await fetchWithAuth(
      `${API_BASE}/logs/errors?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch error logs");
    return response.json();
  },

  getAccessLogs: async (page = 1, limit = 50) => {
    const response = await fetchWithAuth(
      `${API_BASE}/logs/access?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch access logs");
    return response.json();
  },
};
