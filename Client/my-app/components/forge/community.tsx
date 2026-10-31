"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { ReviewService } from "@/services/review-service";
import { requireSuccess } from "@/lib/query-result";
import { RatingStars } from "@/components/rating-stars";
import type { Product } from "@/lib/types";

export function Community({ product }: { product?: Product }) {
  const reviews = useQuery({
    queryKey: ["reviews", "home", product?.id],
    enabled: !!product,
    queryFn: () =>
      ReviewService.getProductReviews(product!.id, { limit: 3 }).then(
        requireSuccess,
      ),
  });
  return (
    <section className="forge-community forge-container">
      <div>
        <p className="forge-eyebrow">THE CUSTOMFORGE COMMUNITY</p>
        <h2>
          Real gear.
          <br />
          <span className="text-muted-foreground">Real player feedback.</span>
        </h2>
        <p>See what other players think before choosing your next upgrade.</p>
        <Link
          href={product ? `/products/${product.id}#reviews` : "/products"}
          className="forge-text-link"
        >
          Explore community reviews <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="forge-review-cards">
        {reviews.data?.data?.length ? (
          reviews.data.data.map((review) => (
            <article className="forge-review" key={review.id}>
              <RatingStars value={review.rating} />
              <h3>{review.title || "Player feedback"}</h3>
              <p>{review.comment}</p>
              <div className="forge-review-meta">
                <MessageSquare size={15} />
                <span>{product?.name}</span>
              </div>
            </article>
          ))
        ) : (
          <article className="forge-review">
            <MessageSquare size={26} className="text-primary" />
            <h3>
              {reviews.isLoading
                ? "Loading player feedback…"
                : reviews.isError
                  ? "Feedback is temporarily unavailable"
                  : "Your experience matters."}
            </h3>
            <p>
              {reviews.isError
                ? "Open a product page to retry loading its reviews."
                : "Product reviews come from the community. Explore the catalog and share your experience with your gear."}
            </p>
            <Link href="/products" className="forge-text-link">
              Find your next upgrade <ArrowUpRight size={16} />
            </Link>
          </article>
        )}
      </div>
    </section>
  );
}
