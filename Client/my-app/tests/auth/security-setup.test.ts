import { describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "@/lib/apiClient";
import type { User } from "@/lib/types";
import {
  changeAndConfirmSecurity,
  confirmedSecurityUser,
  confirmSecurityStatus,
  manualSetupKey,
  normalizeSecurityCode,
  securityAction,
  securityRequestData,
  validateSecurityInput,
} from "@/lib/security-setup";
const ok = <T>(data: T | null): ApiResponse<T> => ({
  data,
  error: null,
  status: 200,
});
const account = (enabled: boolean): User => ({
  id: "account",
  name: "Test",
  email: "test@example.test",
  role: "user",
  isEmailVerified: true,
  twoFactorEnabled: enabled,
});

describe("two-factor setup validation and failure recovery", () => {
  it("validates six numeric digits and preserves leading zeros without silently removing letters", () => {
    expect(validateSecurityInput("pass", "012345")).toEqual({});
    expect(normalizeSecurityCode("012 345")).toBe("012345");
    for (const code of [
      "12345",
      "1234567",
      "123a45",
      "１２３４５６",
      "-12345",
      "",
    ])
      expect(validateSecurityInput(undefined, code).token).toBeTruthy();
    expect(validateSecurityInput("   ").password).toBeTruthy();
  });
  it("rejects successful responses without a usable manual secret rather than entering setup", () => {
    for (const data of [
      null,
      {},
      { secret: "" },
      { secret: "otpauth://bad" },
      { secret: "not a valid key" },
    ])
      expect(() => manualSetupKey(data)).toThrow(/usable setup key/);
    expect(manualSetupKey({ secret: "JBSWY3DPEHPK3PXP" })).toBe(
      "JBSWY3DPEHPK3PXP",
    );
  });
  it("releases pending after a thrown request and permits a successful retry", async () => {
    const pending = vi.fn();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce(ok({ secret: "JBSWY3DPEHPK3PXP" }));
    await expect(
      securityAction(pending, async () =>
        manualSetupKey(securityRequestData(await request())),
      ),
    ).rejects.toThrow("Connection lost");
    expect(pending.mock.calls).toEqual([[true], [false]]);
    await expect(
      securityAction(pending, async () =>
        manualSetupKey(securityRequestData(await request())),
      ),
    ).resolves.toBe("JBSWY3DPEHPK3PXP");
    expect(pending.mock.calls).toEqual([[true], [false], [true], [false]]);
  });
  it("releases pending for API-envelope errors and missing-secret recovery", async () => {
    const pending = vi.fn();
    await expect(
      securityAction(pending, async () =>
        securityRequestData({
          data: null,
          error: { message: "Incorrect password", status: 401 },
          status: 401,
        }),
      ),
    ).rejects.toThrow("Incorrect password");
    await expect(
      securityAction(pending, async () =>
        manualSetupKey(securityRequestData(ok({}))),
      ),
    ).rejects.toThrow(/setup key/);
    expect(pending.mock.calls).toEqual([[true], [false], [true], [false]]);
  });
  it("requires an explicit matching server user/status rather than an optimistic enabled flag", () => {
    expect(
      confirmSecurityStatus(ok(account(true)), "account", true),
    ).toMatchObject({ twoFactorEnabled: true });
    expect(() =>
      confirmSecurityStatus(ok(account(false)), "account", true),
    ).toThrow(/hasn’t confirmed/);
    expect(() =>
      confirmSecurityStatus(
        ok({ ...account(true), id: "different" }),
        "account",
        true,
      ),
    ).toThrow(/account status/);
    expect(() => confirmSecurityStatus(ok(null), "account", true)).toThrow(
      /account status/,
    );
  });
  it("never attempts status confirmation after rejected verification or disable requests", async () => {
    const refresh = vi.fn().mockResolvedValue(ok(account(true)));
    const change = vi
      .fn()
      .mockResolvedValue({
        data: null,
        error: { message: "Invalid verification code", status: 400 },
        status: 400,
      });
    await expect(
      changeAndConfirmSecurity(change, refresh, "account", true),
    ).rejects.toThrow("Invalid verification code");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("returns an honest accepted-but-unconfirmed state after a refresh failure and allows refresh-only retry", async () => {
    const change = vi.fn().mockResolvedValue(ok(null));
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error("Account refresh unavailable"))
      .mockResolvedValueOnce(ok(account(true)));
    const pending = vi.fn();
    await expect(
      securityAction(pending, () =>
        changeAndConfirmSecurity(change, refresh, "account", true),
      ),
    ).resolves.toEqual({
      confirmed: false,
      message: "Account refresh unavailable",
    });
    expect(pending.mock.calls).toEqual([[true], [false]]);
    const confirmed = await securityAction(pending, async () =>
      confirmSecurityStatus(await refresh(), "account", true),
    );
    expect(confirmed.twoFactorEnabled).toBe(true);
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("confirms disabling only when the server user explicitly reports false", async () => {
    const change = vi.fn().mockResolvedValue(ok(null));
    expect(
      await changeAndConfirmSecurity(
        change,
        async () => ok(account(true)),
        "account",
        false,
      ),
    ).toMatchObject({ confirmed: false });
    expect(
      await changeAndConfirmSecurity(
        change,
        async () => ok(account(false)),
        "account",
        false,
      ),
    ).toMatchObject({ confirmed: true, user: { twoFactorEnabled: false } });
  });
  it("does not treat omitted account metadata as disabled or a malformed key as usable", () => {
    expect(() =>
      confirmedSecurityUser(
        ok({ ...account(false), twoFactorEnabled: undefined }),
        "account",
      ),
    ).toThrow(/confirmed two-factor status/);
    expect(() =>
      manualSetupKey({ secret: 123 } as unknown as { secret?: string }),
    ).toThrow(/usable setup key/);
  });
});
