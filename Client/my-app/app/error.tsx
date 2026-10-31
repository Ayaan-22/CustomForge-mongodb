"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/patterns/error-state";
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront error", error.digest || error.message);
  }, [error]);
  return (
    <div className="forge-container py-16">
      <ErrorState
        title="A quick system reset."
        message="Something interrupted this page. Your saved loadout is still on this device. Try reconnecting."
        retryLabel="Retry this page"
        onRetry={reset}
      />
    </div>
  );
}
