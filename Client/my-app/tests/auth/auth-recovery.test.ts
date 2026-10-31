import { describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "@/lib/apiClient";
import { RequestError } from "@/lib/query-result";
import {
  isInvalidResetLink,
  recoveryErrorMessage,
  recoveryRequest,
  validateRecoveryEmail,
  validateRecoveryPasswords,
} from "@/lib/auth-recovery";

const ok = <T>(data: T): ApiResponse<T> => ({ data, error: null, status: 200 });

describe("password recovery validation", () => {
  it("accepts a trimmed valid email and rejects malformed or oversized addresses", () => {
    expect(validateRecoveryEmail("  player@example.test  ")).toEqual({});
    for (const email of [
      "",
      "player",
      "player@",
      "player@example",
      `${"x".repeat(250)}@example.test`,
    ])
      expect(validateRecoveryEmail(email).email).toBeTruthy();
  });

  it("matches server password limits without adding character requirements or trimming secrets", () => {
    for (const password of [
      "12345678",
      "a".repeat(128),
      "  words with spaces  ",
    ])
      expect(validateRecoveryPasswords(password, password)).toEqual({});
    for (const password of ["", "short", "a".repeat(129)]) {
      const errors = validateRecoveryPasswords(password, password);
      expect(errors.password).toBeTruthy();
      expect(errors.passwordConfirm).toBeTruthy();
    }
    expect(
      validateRecoveryPasswords("  password", "password").passwordConfirm,
    ).toContain("match");
  });

  it("targets confirmation when the new password is valid but confirmation differs", () => {
    expect(
      validateRecoveryPasswords("valid passphrase", "different passphrase"),
    ).toEqual({
      passwordConfirm: "Your passwords don’t match.",
    });
  });

  it("recognizes the actual invalid/expired reset-token API response", () => {
    expect(
      isInvalidResetLink(
        new RequestError("Token is invalid or has expired", 400),
      ),
    ).toBe(true);
    expect(
      isInvalidResetLink(new RequestError("Invalid reset token", 400)),
    ).toBe(true);
  });

  it("keeps network, server, rate-limit, password-validation and CSRF failures retryable", () => {
    for (const error of [
      new Error("Token is invalid or has expired"),
      new RequestError("Passwords do not match", 400),
      new RequestError("Invalid CSRF token", 403),
      new RequestError("Failed to verify token", 500),
      new RequestError("Too many requests", 429),
      new RequestError("Unable to connect", 0),
    ])
      expect(isInvalidResetLink(error)).toBe(false);
  });
});

describe("password recovery request lifecycle", () => {
  it("releases the synchronous guard and pending state after a thrown request, allowing retry", async () => {
    const guard = { current: false };
    const pending = vi.fn();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce(ok({ message: "Accepted" }));
    await expect(recoveryRequest(guard, pending, request)).rejects.toThrow(
      "Connection lost",
    );
    expect(guard.current).toBe(false);
    expect(pending.mock.calls).toEqual([[true], [false]]);
    await expect(recoveryRequest(guard, pending, request)).resolves.toEqual(
      ok({ message: "Accepted" }),
    );
    expect(pending.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it("rejects an API envelope with its status so expired-link recovery can be distinguished", async () => {
    const guard = { current: false };
    const pending = vi.fn();
    const result: ApiResponse<unknown> = {
      data: null,
      error: { message: "Token is invalid or has expired", status: 400 },
      status: 400,
    };
    await expect(
      recoveryRequest(guard, pending, async () => result),
    ).rejects.toMatchObject({ status: 400 });
    expect(guard.current).toBe(false);
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });

  it("does not interpret a non-success status without an error envelope as accepted", async () => {
    const guard = { current: false };
    const pending = vi.fn();
    await expect(
      recoveryRequest(guard, pending, async () => ({
        data: null,
        error: null,
        status: 503,
      })),
    ).rejects.toMatchObject({ status: 503 });
    expect(guard.current).toBe(false);
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("blocks concurrent submissions before a render can disable the button", async () => {
    const guard = { current: false };
    const pending = vi.fn();
    let finish!: (response: ApiResponse<{ message: string }>) => void;
    const request = vi.fn(
      () =>
        new Promise<ApiResponse<{ message: string }>>((resolve) => {
          finish = resolve;
        }),
    );
    const first = recoveryRequest(guard, pending, request);
    expect(guard.current).toBe(true);
    await expect(recoveryRequest(guard, pending, request)).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    expect(pending.mock.calls).toEqual([[true]]);
    finish(ok({ message: "Accepted" }));
    await first;
    expect(guard.current).toBe(false);
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps real API error messages and provides a safe fallback for non-Error failures", () => {
    expect(
      recoveryErrorMessage(new RequestError("Error sending email", 500)),
    ).toBe("Error sending email");
    expect(recoveryErrorMessage(null)).toContain("try again");
  });
});
