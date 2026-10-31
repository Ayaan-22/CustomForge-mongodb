"use client";
import { requireSuccess } from "@/lib/query-result";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AuthService,
  type LoginPayload,
  type RegisterPayload,
  type UpdatePasswordPayload,
  type Verify2FAPayload,
  type Enable2FAPayload,
  type ForgotPasswordPayload,
  type ResetPasswordPayload,
} from "@/services/auth-service";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => AuthService.health().then(requireSuccess),
    staleTime: 60_000,
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: (payload: RegisterPayload) => AuthService.register(payload).then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: (payload: LoginPayload) => AuthService.login(payload).then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: () => AuthService.logout().then(requireSuccess),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useEnable2fa() {
  return useMutation({
    mutationKey: ["auth", "2fa", "enable"],
    mutationFn: (payload: Enable2FAPayload) => AuthService.enable2fa(payload).then(requireSuccess),
  });
}

export function useVerify2fa() {
  return useMutation({
    mutationKey: ["auth", "2fa", "verify"],
    mutationFn: (payload: Verify2FAPayload) => AuthService.verify2fa(payload).then(requireSuccess),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationKey: ["auth", "forgot-password"],
    mutationFn: (payload: ForgotPasswordPayload) =>
      AuthService.forgotPassword(payload).then(requireSuccess),
  });
}

export function useResetPassword(token: string) {
  return useMutation({
    mutationKey: ["auth", "reset-password", token],
    mutationFn: (payload: ResetPasswordPayload) =>
      AuthService.resetPassword(token, payload).then(requireSuccess),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationKey: ["auth", "update-password"],
    mutationFn: (payload: UpdatePasswordPayload) =>
      AuthService.updatePassword(payload).then(requireSuccess),
  });
}
