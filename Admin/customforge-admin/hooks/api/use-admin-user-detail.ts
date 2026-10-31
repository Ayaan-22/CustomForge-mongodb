"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AdminUserDetail } from "@/types/admin";

export function useAdminUserDetail(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: async (): Promise<AdminUserDetail> => {
      if (!userId) throw new Error("User id required");
      return apiClient.getUserById(userId);
    },
    enabled: Boolean(userId && enabled),
    staleTime: 30_000,
  });
}
