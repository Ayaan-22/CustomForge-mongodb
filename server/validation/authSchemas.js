import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  passwordConfirm: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  twoFactorToken: z.string().min(6).max(12).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
  passwordConfirm: z.string().min(8).max(128),
});

