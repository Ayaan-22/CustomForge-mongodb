"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  outOf = 5,
  className,
}: {
  value: number;
  outOf?: number;
  className?: string;
}) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      aria-label={`${value} out of ${outOf} stars`}
    >
      {Array.from({ length: outOf }).map((_, i) => {
        const filled = i < full || (i === full && hasHalf);
        return (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              filled ? "fill-primary text-primary" : "text-muted-foreground"
            )}
            aria-hidden="true"
          />
        );
      })}
      <span className="ml-1 text-xs text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
