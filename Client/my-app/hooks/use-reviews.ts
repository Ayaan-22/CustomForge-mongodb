"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReviewService,
  type AddReviewPayload,
  type UpdateReviewPayload,
  type ReviewsQuery,
} from "@/services/review-service";
import { requireSuccess } from "@/lib/query-result";

export function useProductReviews(productId: string, query?: ReviewsQuery) {
  return useQuery({
    queryKey: ["reviews", productId, query],
    queryFn: () => ReviewService.getProductReviews(productId, query).then(requireSuccess),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAddReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["reviews", "add", productId],
    mutationFn: (payload: AddReviewPayload) =>
      ReviewService.addReview(productId, payload).then(requireSuccess),
    onSuccess: () => {
      // Invalidate reviews for this product
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      // Invalidate product data to refresh rating
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      queryClient.invalidateQueries({queryKey:["my-review",productId]});
    },
  });
}

export function useUpdateReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["reviews", "update"],
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: UpdateReviewPayload;
    }) => ReviewService.updateReview(reviewId, payload).then(requireSuccess),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      queryClient.invalidateQueries({queryKey:["my-review",productId]});
    },
  });
}

export function useDeleteReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["reviews", "delete"],
    mutationFn: (reviewId: string) => ReviewService.deleteReview(reviewId).then(requireSuccess),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      queryClient.invalidateQueries({queryKey:["my-review",productId]});
    },
  });
}
