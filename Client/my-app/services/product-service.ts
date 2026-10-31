import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import type { Product } from "@/lib/types";

export type ProductsQuery = {
  q?: string;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  category?: string;
  brand?: string;
  brands?: string;
  specs?: string;
  features?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  discounted?: boolean;
};

export type CatalogFacets = {
  available: boolean;
  candidateLimit: number;
  scopeTotal: number | null;
  scope: string;
  reason: string | null;
  brands: { value: string; count: number }[];
  specs: {
    key: string;
    label: string;
    options: { value: string; label: string; count: number }[];
  }[];
};

export const ProductService = {
  list(params?: ProductsQuery): Promise<ApiResponse<Product[]>> {
    return apiFetch("/products", { method: "GET", params, skipAuth: true });
  },

  facets(params?: ProductsQuery): Promise<ApiResponse<CatalogFacets>> {
    return apiFetch("/products/facets", {
      method: "GET",
      params,
      skipAuth: true,
    });
  },

  top(): Promise<ApiResponse<Product[]>> {
    return apiFetch("/products/top", { method: "GET", skipAuth: true });
  },

  search(q: string): Promise<ApiResponse<Product[]>> {
    return apiFetch("/products/search", {
      method: "GET",
      params: { q },
      skipAuth: true,
    });
  },

  brands(): Promise<ApiResponse<string[]>> {
    return apiFetch("/products/brands", { method: "GET", skipAuth: true });
  },

  categories(): Promise<ApiResponse<string[]>> {
    return apiFetch("/products/categories", { method: "GET", skipAuth: true });
  },

  featured(): Promise<ApiResponse<Product[]>> {
    return apiFetch("/products/featured", { method: "GET", skipAuth: true });
  },

  byCategory(category: string): Promise<ApiResponse<Product[]>> {
    return apiFetch(`/products/category/${encodeURIComponent(category)}`, {
      method: "GET",
      skipAuth: true,
    });
  },

  get(id: string): Promise<ApiResponse<Product>> {
    return apiFetch(`/products/${encodeURIComponent(id)}`, {
      method: "GET",
      skipAuth: true,
    });
  },

  related(id: string): Promise<ApiResponse<Product[]>> {
    return apiFetch(`/products/${encodeURIComponent(id)}/related`, {
      method: "GET",
      skipAuth: true,
    });
  },

  addToWishlist(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/wishlist/${encodeURIComponent(id)}`, {
      method: "POST",
    });
  },

  removeFromWishlist(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch(`/users/wishlist/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
