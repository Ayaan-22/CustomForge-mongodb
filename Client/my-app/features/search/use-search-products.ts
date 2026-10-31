"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductService } from "@/services/product-service";

export function useSearchProducts(q: string, page = 1) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ["products", "search", trimmed, page],
    queryFn: async () => {
      const res = await ProductService.list({q: trimmed, page, limit: 20});
      if (res.error) throw new Error(res.error.message);
      return res;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}
