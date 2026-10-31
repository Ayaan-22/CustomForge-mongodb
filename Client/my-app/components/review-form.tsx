"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type {Review} from "@/lib/types";
import { useAddReview, useUpdateReview } from "@/hooks/use-reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  productId: string;
  review?: Review;
  onSuccess?: () => void;
};

export function ReviewForm({ productId, review, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const addReview = useAddReview(productId);
  const updateReview = useUpdateReview(productId);
  const pending = addReview.isPending || updateReview.isPending;

  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(review?.title ?? "");
  const [comment, setComment] = useState(review?.comment ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;

    // Check authentication
    if (!isAuthenticated) {
      toast.error("Please login to leave a review");
      router.push("/login");
      return;
    }

    // Check email verification
    if (!isEmailVerified) {
      toast.error("Please verify your email to leave a review");
      router.push("/verify-email");
      return;
    }

    // Validate
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    try {
      const payload = {rating,comment:comment.trim(),title:title.trim()};
      const response = review ? await updateReview.mutateAsync({reviewId:review.id,payload}) : await addReview.mutateAsync(payload);

      if (response.error) {
        toast.error(response.error.message || "Failed to submit review");
      } else {
        toast.success("Review submitted for moderation. It will appear after approval.");
        // Reset form
        setRating(0);
        setTitle("");
        setComment("");
        onSuccess?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit your review. Please retry.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Rating *</Label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Rate ${star} out of 5`}
              aria-pressed={rating === star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="min-h-11 min-w-11 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-title">Title *</Label>
        <Input
          id="review-title"
          minLength={5}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="review-comment">Your Review *</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={4}
          maxLength={1000}
          minLength={10}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {comment.length}/1000 characters
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : review ? "Save review" : "Submit Review"}
      </Button>
    </form>
  );
}
