import { z } from "zod";
import type { ApiResponse } from "./apiClient";
import { RequestError } from "./query-result";

export type RecoveryFieldErrors = {
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

const recoveryEmail = z.string().email().max(255);

export function validateRecoveryEmail(email: string): RecoveryFieldErrors {
  return recoveryEmail.safeParse(email.trim()).success
    ? {}
    : { email: "Enter a valid email address, up to 255 characters." };
}

/** Matches the server's length limits without changing a password's whitespace. */
export function validateRecoveryPasswords(
  password: string,
  passwordConfirm: string,
): RecoveryFieldErrors {
  const errors: RecoveryFieldErrors = {};
  if (password.length < 8 || password.length > 128)
    errors.password = "Use 8–128 characters for your new password.";
  if (passwordConfirm.length < 8 || passwordConfirm.length > 128)
    errors.passwordConfirm =
      "Re-enter your new password, using 8–128 characters.";
  else if (password !== passwordConfirm)
    errors.passwordConfirm = "Your passwords don’t match.";
  return errors;
}

/** Only the actual reset-token rejection makes the form unusable, not all 400s. */
export function isInvalidResetLink(error: unknown): boolean {
  return (
    error instanceof RequestError &&
    error.status === 400 &&
    /token.*(?:invalid|expired)|(?:invalid|expired).*token/i.test(error.message)
  );
}

export function recoveryErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request couldn’t be completed. Check your connection and try again.";
}

/** The synchronous guard closes the gap before React renders a disabled button. */
export async function recoveryRequest<T>(
  guard: { current: boolean },
  setPending: (pending: boolean) => void,
  request: () => Promise<ApiResponse<T>>,
): Promise<ApiResponse<T> | null> {
  if (guard.current) return null;
  guard.current = true;
  setPending(true);
  try {
    const response = await request();
    if (response.error)
      throw new RequestError(response.error.message, response.error.status);
    if (response.status < 200 || response.status >= 300)
      throw new RequestError(
        "The server hasn’t confirmed this request. Please try again.",
        response.status,
      );
    return response;
  } finally {
    guard.current = false;
    setPending(false);
  }
}
