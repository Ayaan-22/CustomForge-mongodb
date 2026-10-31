"use client";

import { useState } from "react";
import { useProductReviews } from "@/hooks/use-reviews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ReviewListProps = {
  productId: string;
};

export function ReviewList({ productId }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useProductReviews(productId, {
    page,
    limit: 20,
  });
  const reviews = data?.data;
  const pages = Math.max(1, Math.ceil((data?.pagination?.total ?? 0) / 20));
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load reviews.{" "}
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No reviews yet. Be the first to review this product!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5">
        <p className="forge-eyebrow">RATING BREAKDOWN / THIS PAGE</p>
        <p className="my-3 text-xs text-muted-foreground">
          Distribution of the {reviews.length} reviews shown below.
        </p>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviews.filter(
            (r) => Math.round(r.rating) === star,
          ).length;
          return (
            <div className="my-2 flex items-center gap-3 text-xs" key={star}>
              <span className="w-10">{star} stars</span>
              <div className="h-1.5 flex-1 rounded bg-muted">
                <div
                  className="h-full rounded bg-primary"
                  style={{ width: `${(count / reviews.length) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </div>
      {reviews.map((review) => {
        return (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div
                      className="flex"
                      role="img"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {review.userName || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {review.createdAt &&
                        formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                        })}
                    </span>
                  </div>

                  {review.title && (
                    <h4 className="font-semibold mb-1">{review.title}</h4>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {pages > 1 && (
        <nav
          aria-label="Review pages"
          className="flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous reviews
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next reviews
          </Button>
        </nav>
      )}
    </div>
  );
}
