"use client";
import { requireSuccess } from "@/lib/query-result";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrderService,
  type CreateOrderPayload,
} from "@/services/order-service";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => OrderService.list().then(requireSuccess),
    refetchOnWindowFocus: false,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => OrderService.get(id).then(requireSuccess),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "create"],
    mutationFn: (payload: CreateOrderPayload) => OrderService.create(payload).then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function usePaymentStatus(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId, "payment-status"],
    queryFn: () => OrderService.paymentStatus(orderId).then(requireSuccess),
    enabled: !!orderId,
    refetchInterval: 5000,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "cancel"],
    mutationFn: (orderId: string) => OrderService.cancel(orderId).then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useReturnOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "return"],
    mutationFn: (orderId: string) => OrderService.return(orderId).then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
