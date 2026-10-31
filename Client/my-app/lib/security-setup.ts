import type { ApiResponse } from "./apiClient";
import type { User } from "./types";
import { RequestError } from "./query-result";

export type SecuritySetupStage =
  | "idle"
  | "password"
  | "key"
  | "confirm"
  | "disable"
  | "refresh";
export const normalizeSecurityCode = (value: string) =>
  value.replace(/\s/g, "");
export function validateSecurityInput(
  password: string | undefined,
  token?: string,
) {
  const errors: { password?: string; token?: string } = {};
  if (password !== undefined && !password.trim())
    errors.password = "Enter your current password.";
  if (token !== undefined && !/^\d{6}$/.test(normalizeSecurityCode(token)))
    errors.token = "Enter the six-digit code from your authenticator app.";
  return errors;
}
export function securityRequestData<T>(response: ApiResponse<T>): T | null {
  if (response.error)
    throw new RequestError(response.error.message, response.error.status);
  if (response.status < 200 || response.status >= 300)
    throw new RequestError(
      "The security request wasn’t confirmed. Please try again.",
      response.status,
    );
  return response.data;
}
export function manualSetupKey(data: { secret?: string } | null) {
  const key = typeof data?.secret === "string" ? data.secret.trim() : "";
  if (!key || !/^[a-z2-7]{16,128}={0,6}$/i.test(key))
    throw new Error(
      "A usable setup key wasn’t returned. Try again to create a new key.",
    );
  return key;
}
export function confirmedSecurityUser(
  response: ApiResponse<User | null>,
  userId: string,
): User {
  const user = securityRequestData(response);
  if (!user || user.id !== userId)
    throw new Error(
      "Your account status couldn’t be confirmed. Sign in again if your session changed.",
    );
  if (typeof user.twoFactorEnabled !== "boolean")
    throw new Error(
      "The account response did not include a confirmed two-factor status. Try refreshing status.",
    );
  return user;
}
export function confirmSecurityStatus(
  response: ApiResponse<User | null>,
  userId: string,
  expectedEnabled: boolean,
): User {
  const user = confirmedSecurityUser(response, userId);
  if (user.twoFactorEnabled !== expectedEnabled)
    throw new Error(
      "The change was accepted, but your latest account status hasn’t confirmed it yet. Refresh status before making another change.",
    );
  return user;
}

/** Every async path releases pending, including thrown transport errors. */
export async function securityAction<T>(
  setPending: (pending: boolean) => void,
  request: () => Promise<T>,
): Promise<T> {
  setPending(true);
  try {
    return await request();
  } finally {
    setPending(false);
  }
}

/** A successful mutation and an unavailable status refresh are distinct outcomes. */
export async function changeAndConfirmSecurity(
  change: () => Promise<ApiResponse<unknown>>,
  refresh: () => Promise<ApiResponse<User | null>>,
  userId: string,
  expectedEnabled: boolean,
): Promise<
  { confirmed: true; user: User } | { confirmed: false; message: string }
> {
  securityRequestData(await change());
  try {
    return {
      confirmed: true,
      user: confirmSecurityStatus(await refresh(), userId, expectedEnabled),
    };
  } catch (error) {
    return {
      confirmed: false,
      message:
        error instanceof Error
          ? error.message
          : "The change was accepted, but account status couldn’t refresh. Try refreshing status.",
    };
  }
}
