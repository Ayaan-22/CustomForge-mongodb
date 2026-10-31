import { apiFetch, type ApiResponse } from "@/lib/apiClient";
import type { Review } from "@/lib/types";

export type AddReviewPayload = {
  rating: number;
  comment: string;
  title: string;
};

export type UpdateReviewPayload = Partial<AddReviewPayload>;

export type ReviewsQuery = {
  page?: number;
  limit?: number;
};

type ReviewRow = {
  id: string; product_id: string; rating: number; title: string; comment: string;
  created_at: string; updated_at?: string; is_active: boolean;
};

async function normalizeReview(request: Promise<ApiResponse<ReviewRow>>): Promise<ApiResponse<Review>> {
  const response = await request;
  const row = response.data;
  return {...response, data: row ? {
    id: row.id, productId: row.product_id, rating: row.rating, title: row.title,
    comment: row.comment, createdAt: row.created_at, updatedAt: row.updated_at, isActive: row.is_active,
  } : null};
}

export const ReviewService = {
  mine(productId:string):Promise<ApiResponse<Review | null>> {return apiFetch(`/reviews/products/${encodeURIComponent(productId)}/mine`);},
  // Get reviews for a product (public)
  getProductReviews(
    productId: string,
    query?: ReviewsQuery
  ): Promise<ApiResponse<Review[]>> {
    return apiFetch(`/products/${encodeURIComponent(productId)}/reviews`, {
      method: "GET",
      params: query,
      skipAuth: true,
    });
  },

  // Add a review (authenticated, verified users only)
  addReview(
    productId: string,
    payload: AddReviewPayload
  ): Promise<ApiResponse<Review>> {
    return normalizeReview(apiFetch<ReviewRow>(`/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: payload,
    }));
  },

  // Update own review
  updateReview(
    reviewId: string,
    payload: UpdateReviewPayload
  ): Promise<ApiResponse<Review>> {
    return normalizeReview(apiFetch<ReviewRow>(`/reviews/${encodeURIComponent(reviewId)}`, {
      method: "PATCH",
      body: payload,
    }));
  },

  // Delete own review
  deleteReview(reviewId: string): Promise<ApiResponse<null>> {
    return apiFetch(`/reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
  },
};
