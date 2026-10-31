"use client";
import { requireSuccess } from "@/lib/query-result";

import { useQuery } from "@tanstack/react-query";
import {
  ProductService,
  type ProductsQuery,
} from "@/services/product-service";

export function useProducts(params?: ProductsQuery) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => ProductService.list(params).then(requireSuccess),
    placeholderData: (previousData) => previousData,
  });
}

export function useTopProducts() {
  return useQuery({
    queryKey: ["products", "top"],
    queryFn: () => ProductService.top().then(requireSuccess),
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => ProductService.featured().then(requireSuccess),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => ProductService.get(id).then(requireSuccess),
    enabled: !!id,
  });
}

export function useRelatedProducts(id: string) {
  return useQuery({
    queryKey: ["products", id, "related"],
    queryFn: () => ProductService.related(id).then(requireSuccess),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["products", "categories"],
    queryFn: () => ProductService.categories().then(requireSuccess),
  });
}
