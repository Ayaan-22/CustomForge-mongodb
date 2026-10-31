"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type RouteGuardProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerified?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
};

export function RouteGuard({
  children,
  requireAuth = false,
  requireVerified = false,
  requireAdmin = false,
  redirectTo,
}: RouteGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isEmailVerified, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo || "/login");
      return;
    }

    // Check email verification requirement
    if (requireVerified && isAuthenticated && !isEmailVerified) {
      router.push("/verify-email");
      return;
    }

    // Check admin requirement
    if (requireAdmin && isAuthenticated && user?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [
    isAuthenticated,
    isEmailVerified,
    isLoading,
    requireAuth,
    requireVerified,
    requireAdmin,
    router,
    user,
    redirectTo,
  ]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if requirements not met
  if (requireAuth && !isAuthenticated) return null;
  if (requireVerified && !isEmailVerified) return null;
  if (requireAdmin && user?.role !== "admin") return null;

  return <>{children}</>;
}

// Convenience components for specific guard types
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <RouteGuard requireAuth>{children}</RouteGuard>;
}

export function VerifiedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth requireVerified>
      {children}
    </RouteGuard>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth requireAdmin>
      {children}
    </RouteGuard>
  );
}
