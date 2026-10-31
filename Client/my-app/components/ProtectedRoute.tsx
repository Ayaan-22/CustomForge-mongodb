"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireEmailVerification?: boolean;
  require2FA?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireEmailVerification = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check email verification requirement
    if (requireEmailVerification && isAuthenticated && !isEmailVerified) {
      router.push("/verify-email");
      return;
    }

    // 2FA check is handled via modal, not redirect
    // The modal will be triggered by specific actions
  }, [
    isAuthenticated,
    isEmailVerified,
    isLoading,
    requireAuth,
    requireEmailVerification,
    router,
    pathname,
  ]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if auth requirements not met
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireEmailVerification && !isEmailVerified) {
    return null;
  }

  return <>{children}</>;
}
