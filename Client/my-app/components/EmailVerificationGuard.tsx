"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface EmailVerificationGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function EmailVerificationGuard({
  children,
  fallback,
}: EmailVerificationGuardProps) {
  const { isAuthenticated, isEmailVerified } = useAuth();
  const router = useRouter();

  // If not authenticated, don't show anything
  if (!isAuthenticated) {
    return fallback || null;
  }

  // If email not verified, show fallback or redirect button
  if (!isEmailVerified) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <button
        onClick={() => router.push("/verify-email")}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
      >
        Verify Email to Continue
      </button>
    );
  }

  // Email verified, show children
  return <>{children}</>;
}
