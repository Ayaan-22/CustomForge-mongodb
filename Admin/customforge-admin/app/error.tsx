"use client";

import Link from "next/link";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/patterns/error-state";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminAuthShell eyebrow="Let’s get you back" title="This page couldn’t load" description="Reload the page to continue to your CustomForge workspace."><ErrorState message="An unexpected error interrupted this view." onRetry={reset} retryLabel="Reload page"><Button asChild variant="link" className="mt-3"><Link href="/login">Return to sign in</Link></Button></ErrorState></AdminAuthShell>;
}
