import { describe, expect, it, vi } from "vitest";
import {
  captureLoginCredentials,
  captureRegistration,
  createLoginPayload,
  runAuthSubmission,
  validateAuthenticatorCode,
  validateLogin,
  validateRegistration,
} from "@/lib/auth-entry";

const validRegistration = {
  name: "Alex",
  email: "alex@example.com",
  password: "build ready 42",
  passwordConfirm: "build ready 42",
};

describe("auth entry validation", () => {
  it("accepts published minimum and maximum name/password bounds", () => {
    for (const [nameLength, passwordLength] of [
      [2, 8],
      [100, 128],
    ]) {
      const password = "x".repeat(passwordLength);
      expect(
        validateRegistration({
          ...validRegistration,
          name: "a".repeat(nameLength),
          password,
          passwordConfirm: password,
        }),
      ).toEqual({});
      expect(
        validateLogin({ email: validRegistration.email, password }),
      ).toEqual({});
    }
  });

  it("reports every invalid required field before a registration request", () => {
    expect(
      validateRegistration({
        name: "",
        email: "",
        password: "",
        passwordConfirm: "",
      }),
    ).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
        passwordConfirm: expect.any(String),
      }),
    );
  });

  it("rejects password values outside the API bounds in both entries", () => {
    for (const password of ["x".repeat(7), "x".repeat(129)]) {
      expect(
        validateLogin({ email: validRegistration.email, password }).password,
      ).toBeTruthy();
      const errors = validateRegistration({
        ...validRegistration,
        password,
        passwordConfirm: password,
      });
      expect(errors.password).toBeTruthy();
      expect(errors.passwordConfirm).toBeTruthy();
    }
    expect(
      validateRegistration({ ...validRegistration, name: "a".repeat(101) })
        .name,
    ).toBeTruthy();
  });

  it("accepts a valid 255-character email and rejects 256 characters", () => {
    const email = `${"g".repeat(64)}@${["a".repeat(63), "b".repeat(63), "c".repeat(58), "com"].join(".")}`;
    expect(email).toHaveLength(255);
    expect(
      validateLogin({ email, password: validRegistration.password }),
    ).toEqual({});
    expect(
      validateLogin({
        email: `g${email}`,
        password: validRegistration.password,
      }).email,
    ).toBeTruthy();
    expect(
      validateRegistration({ ...validRegistration, email: `g${email}` }).email,
    ).toBeTruthy();
  });

  it("rejects invalid email and exact password mismatches", () => {
    expect(
      validateLogin({
        email: "not-an-email",
        password: validRegistration.password,
      }).email,
    ).toBeTruthy();
    expect(
      validateRegistration({
        ...validRegistration,
        passwordConfirm: `${validRegistration.password} `,
      }),
    ).toEqual({ passwordConfirm: "Your passwords do not match." });
  });

  it("requires six numeric authenticator characters and preserves leading zeros", () => {
    expect(validateAuthenticatorCode("001234")).toBeUndefined();
    for (const code of ["", "12345", "1234567", "12 456", "abcdef"]) {
      expect(validateAuthenticatorCode(code)).toBeTruthy();
    }
  });
});

describe("auth request snapshots", () => {
  it("keeps challenge credentials separate from edited form values", () => {
    const form = {
      email: "Alex@example.com",
      password: "  keep these bytes  ",
    };
    const challenge = captureLoginCredentials(form);
    form.email = "other@example.com";
    form.password = "changed password";
    expect(createLoginPayload(challenge, "001234")).toEqual({
      email: "Alex@example.com",
      password: "  keep these bytes  ",
      twoFactorToken: "001234",
    });
    expect(createLoginPayload(challenge)).not.toHaveProperty("twoFactorToken");
    expect(challenge).not.toHaveProperty("twoFactorToken");
  });

  it("does not trim, lowercase or otherwise alter submitted values", () => {
    const form = {
      ...validRegistration,
      name: " Alex ",
      email: "Alex@example.com",
      password: "  spaces matter  ",
      passwordConfirm: "  spaces matter  ",
    };
    const payload = captureRegistration(form);
    expect(payload).toEqual(form);
    expect(payload).not.toBe(form);
    expect(validateRegistration(payload)).toEqual({});
    expect(
      validateLogin(
        captureLoginCredentials({
          email: " alex@example.com ",
          password: form.password,
        }),
      ).email,
    ).toBeTruthy();
  });
});

describe("auth submission lock", () => {
  it("blocks a duplicate request synchronously before pending renders", async () => {
    const guard = { current: false };
    const setPending = vi.fn();
    let release!: () => void;
    const request = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const first = runAuthSubmission(guard, setPending, request);
    expect(guard.current).toBe(true);
    expect(await runAuthSubmission(guard, setPending, request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe(true);
    expect(guard.current).toBe(false);
    expect(setPending.mock.calls).toEqual([[true], [false]]);
  });

  it("releases pending after a rejection and permits a retry", async () => {
    const guard = { current: false };
    const setPending = vi.fn();
    await expect(
      runAuthSubmission(guard, setPending, async () => {
        throw new Error("network failure");
      }),
    ).rejects.toThrow("network failure");
    expect(guard.current).toBe(false);
    expect(setPending.mock.calls).toEqual([[true], [false]]);
    expect(await runAuthSubmission(guard, setPending, async () => {})).toBe(
      true,
    );
    expect(guard.current).toBe(false);
  });

  it("also releases the ref when a request throws before returning a promise", async () => {
    const guard = { current: false };
    const setPending = vi.fn();
    await expect(
      runAuthSubmission(guard, setPending, () => {
        throw new Error("sync failure");
      }),
    ).rejects.toThrow("sync failure");
    expect(guard.current).toBe(false);
    expect(setPending.mock.calls).toEqual([[true], [false]]);
  });

  it("does not unlock an already active submission", async () => {
    const guard = { current: true };
    const setPending = vi.fn();
    const request = vi.fn();
    expect(await runAuthSubmission(guard, setPending, request)).toBe(false);
    expect(guard.current).toBe(true);
    expect(setPending).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
