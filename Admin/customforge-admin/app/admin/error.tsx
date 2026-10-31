"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/patterns/error-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState title="This view hit a snag" message="We couldn’t display this page. Reload the view or return to the overview." onRetry={reset} retryLabel="Reload view">
      <Button asChild variant="link" className="mt-4"><Link href="/admin/dashboard">Return to overview</Link></Button>
    </ErrorState>
  );
}
