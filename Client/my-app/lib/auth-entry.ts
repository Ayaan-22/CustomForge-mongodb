import { z } from "zod";
import type { LoginPayload, RegisterPayload } from "@/services/auth-service";

export type LoginCredentials = Pick<LoginPayload, "email" | "password">;
export type LoginFieldErrors = Partial<
  Record<"email" | "password" | "twoFactorToken", string>
>;
export type RegisterFieldErrors = Partial<
  Record<keyof RegisterPayload, string>
>;

const emailSchema = z.string().email().max(255);

function emailError(email: string): string | undefined {
  if (!email) return "Enter your email address.";
  if (email.length > 255)
    return "Use an email address with 255 characters or fewer.";
  if (!emailSchema.safeParse(email).success)
    return "Enter a valid email address.";
}

function passwordError(password: string): string | undefined {
  if (!password) return "Enter your password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
}

/** Snapshot credentials before the server asks for an authenticator challenge. */
export function captureLoginCredentials(
  values: LoginCredentials,
): LoginCredentials {
  return { email: values.email, password: values.password };
}

export function validateLogin(values: LoginCredentials): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = emailError(values.email);
  const password = passwordError(values.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return errors;
}

export function validateAuthenticatorCode(token: string): string | undefined {
  if (!/^\d{6}$/.test(token))
    return "Enter the 6-digit code from your authenticator app.";
}

export function createLoginPayload(
  credentials: LoginCredentials,
  twoFactorToken?: string,
): LoginPayload {
  return {
    ...credentials,
    ...(twoFactorToken === undefined ? {} : { twoFactorToken }),
  };
}

export function captureRegistration(values: RegisterPayload): RegisterPayload {
  return { ...values };
}

/** Match the published register schema bounds, then check exact password equality. */
export function validateRegistration(
  values: RegisterPayload,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (values.name.length < 2)
    errors.name = "Enter a name with at least 2 characters.";
  else if (values.name.length > 100)
    errors.name = "Use a name with 100 characters or fewer.";
  const email = emailError(values.email);
  const password = passwordError(values.password);
  const confirmation = passwordError(values.passwordConfirm);
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (confirmation) {
    errors.passwordConfirm = values.passwordConfirm
      ? confirmation
      : "Confirm your password.";
  } else if (values.password !== values.passwordConfirm) {
    errors.passwordConfirm = "Your passwords do not match.";
  }
  return errors;
}

/** A synchronous ref lock prevents a second request before React renders pending. */
export async function runAuthSubmission(
  guard: { current: boolean },
  setPending: (pending: boolean) => void,
  request: () => Promise<void>,
): Promise<boolean> {
  if (guard.current) return false;
  guard.current = true;
  try {
    setPending(true);
    await request();
    return true;
  } finally {
    guard.current = false;
    setPending(false);
  }
}
