"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {useQueryClient} from "@tanstack/react-query";
import {ApiError} from "@/lib/transport";
import {toast} from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { AdminBrand } from "@/components/admin-brand";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  loading: boolean;
  login: (data: Parameters<typeof authClient.login>[0]) => Promise<void>;
  register: (data: unknown) => Promise<void>;
  logout: () => Promise<void>;
  requiresTwoFactor: boolean;
  submitTwoFactor: (
    token: string,
    email: string,
    password: string
  ) => Promise<void>;
}

import { createContext, useContext } from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = usePathname();
  const { user, accessToken, requiresTwoFactor, setRequiresTwoFactor } =
    useAuthStore();

  const initialNavigation = useRef({ pathname, router });

  useEffect(() => {
    const { pathname, router } = initialNavigation.current;
    const checkAuth = async () => {
      try {
        await authClient.refreshToken();
      } catch {
        if (pathname?.startsWith("/admin") && !useAuthStore.getState().accessToken) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const login = async (data: Parameters<typeof authClient.login>[0]) => {
    try {
      const response = await authClient.login(data);

      if (response.data?.user) {
        const userData = response.data.user;

        if (userData.role !== "admin") {
          throw new Error("Access denied: Admin role required");
        }

        if (!userData.isEmailVerified) {
          router.push("/verify-email");
          return;
        }
      }

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "2FA_REQUIRED") {
        setRequiresTwoFactor(true);
      } else {
        throw err;
      }
    }
  };

  const submitTwoFactor = async (
    twoFactorToken: string,
    email: string,
    password: string
  ) => {
    {
      const response = await authClient.verifyTwoFactorForLogin(
        email,
        password,
        twoFactorToken
      );

      if (response.data?.user) {
        const userData = response.data.user;

        if (userData.role !== "admin") {
          throw new Error("Access denied: Admin role required");
        }

        if (!userData.isEmailVerified) {
          router.push("/verify-email");
          return;
        }
      }

      setRequiresTwoFactor(false);
      router.push("/admin/dashboard");
    }
  };

  const register = async (data: unknown) => {
    await authClient.register(data);
    router.push("/login?registered=true");
  };

  const logout = async () => {
    try { await authClient.logout(); qc.clear(); router.replace('/login'); }
    catch { toast.error('Sign out failed. Please retry to end your server session.'); }
  };
  useEffect(() => {
    if (!loading && pathname.startsWith('/admin') && (!accessToken || user?.role !== 'admin')) router.replace('/login');
  }, [loading, pathname, accessToken, user?.role, router]);
  useEffect(() => {
    const off = useAuthStore.subscribe((state, previous) => {
      if (previous.user?.id !== state.user?.id) qc.clear();
    });
    return off;
  }, [qc]);
  if (!loading && pathname.startsWith('/admin') && (!accessToken || user?.role !== 'admin')) return null;

  if (loading) {
    return (
      <div className="fa-boot" role="status" aria-live="polite" aria-busy="true">
        <div>
          <AdminBrand />
          <Loader2 className="fa-loader" aria-hidden />
          <p>Opening your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        requiresTwoFactor,
        submitTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
