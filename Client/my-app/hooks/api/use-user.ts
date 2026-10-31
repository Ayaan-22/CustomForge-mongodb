"use client";
import { requireSuccess } from "@/lib/query-result";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserService, type UpdateMePayload } from "@/services/user-service";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => UserService.me().then(requireSuccess),
    staleTime: 30_000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["users", "update-me"],
    mutationFn: (payload: UpdateMePayload) => UserService.updateMe(payload).then(requireSuccess),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useDeleteMe() {
  return useMutation({
    mutationKey: ["users", "delete-me"],
    mutationFn: () => UserService.deleteMe().then(requireSuccess),
  });
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => UserService.wishlist().then(requireSuccess),
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => UserService.orders().then(requireSuccess),
    refetchOnWindowFocus: false,
  });
}
