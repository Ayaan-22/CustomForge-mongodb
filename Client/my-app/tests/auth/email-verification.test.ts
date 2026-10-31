import { describe, expect, it, vi } from "vitest";
import {
  createVerificationRequestCache,
  observeVerificationRequest,
  requestEmailVerification,
  verificationRequestMessage,
  verificationToken,
  normalizeAuthenticationCode,
  validAuthenticationCode,
} from "@/lib/email-verification";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("one-use email verification links", () => {
  it("reuses the same in-flight and settled result across effect replay and token revisits", async () => {
    const response = deferred<string>();
    const verify = vi.fn(() => response.promise);
    const request = createVerificationRequestCache(verify);
    const first = request("first");
    expect(request("first")).toBe(first);
    const second = request("second");
    expect(second).not.toBe(first);
    expect(request("first")).toBe(first);
    await Promise.resolve();
    expect(verify.mock.calls).toEqual([["first"], ["second"]]);
    response.resolve("verified");
    await expect(first).resolves.toBe("verified");
    expect(request("first")).toBe(first);
    expect(verify).toHaveBeenCalledTimes(2);
  });
  it("does not consume a one-use link again after an ambiguous failure", async () => {
    const verify = vi.fn(() => {
      throw new Error("Connection lost");
    });
    const request = createVerificationRequestCache(verify);
    const first = request("one-use");
    await expect(first).rejects.toThrow("Connection lost");
    await expect(request("one-use")).rejects.toThrow("Connection lost");
    expect(verify).toHaveBeenCalledTimes(1);
  });
  it("ignores an old token response after navigation while allowing the latest response", async () => {
    const old = deferred<string>();
    const latest = deferred<string>();
    const oldResult = vi.fn();
    const oldError = vi.fn();
    const latestResult = vi.fn();
    const dispose = observeVerificationRequest(
      old.promise,
      oldResult,
      oldError,
    );
    dispose();
    observeVerificationRequest(latest.promise, latestResult, vi.fn());
    latest.resolve("new account verified");
    old.resolve("stale credentials");
    await Promise.resolve();
    expect(oldResult).not.toHaveBeenCalled();
    expect(oldError).not.toHaveBeenCalled();
    expect(latestResult).toHaveBeenCalledWith("new account verified");
  });
  it("suppresses a stale rejection and delivers an active failure for recovery", async () => {
    const stale = deferred<string>();
    const active = deferred<string>();
    const staleError = vi.fn();
    const activeError = vi.fn();
    observeVerificationRequest(stale.promise, vi.fn(), staleError)();
    observeVerificationRequest(active.promise, vi.fn(), activeError);
    stale.reject(new Error("old link"));
    const error = new Error("network unavailable");
    active.reject(error);
    await Promise.resolve();
    await Promise.resolve();
    expect(staleError).not.toHaveBeenCalled();
    expect(activeError).toHaveBeenCalledWith(error);
  });
  it("rejects incomplete or array params without rewriting a valid token", () => {
    expect(verificationToken(undefined)).toBeNull();
    expect(verificationToken("")).toBeNull();
    expect(verificationToken(["token"])).toBeNull();
    expect(verificationToken("encoded/one-use-token")).toBe(
      "encoded/one-use-token",
    );
  });
});

describe("verification resend policy", () => {
  it("uses authenticated resend without sending a guest password", async () => {
    const services = {
      sendVerificationEmail: vi.fn(async () => "accepted"),
      resendVerification: vi.fn(async () => "accepted"),
    };
    await requestEmailVerification(
      {
        signedIn: true,
        email: "different@example.test",
        password: "never send",
      },
      services,
    );
    expect(services.sendVerificationEmail).toHaveBeenCalledWith();
    expect(services.resendVerification).not.toHaveBeenCalled();
  });
  it("uses the guest endpoint with a trimmed email and unchanged password", async () => {
    const services = {
      sendVerificationEmail: vi.fn(async () => "accepted"),
      resendVerification: vi.fn(async () => "accepted"),
    };
    await requestEmailVerification(
      {
        signedIn: false,
        email: "  player@example.test  ",
        password: " space matters ",
      },
      services,
    );
    expect(services.resendVerification).toHaveBeenCalledWith({
      email: "player@example.test",
      password: " space matters ",
    });
    expect(services.sendVerificationEmail).not.toHaveBeenCalled();
  });
  it("retains server wording and does not invent delivery in fallback wording", () => {
    expect(
      verificationRequestMessage("If eligible, a link will be sent."),
    ).toBe("If eligible, a link will be sent.");
    expect(verificationRequestMessage()).toContain(
      "If the request is eligible",
    );
    expect(verificationRequestMessage()).not.toContain("email sent");
  });
});

describe("protected-operation authenticator input", () => {
  it("accepts exactly six digits including leading zeroes", () => {
    expect(validAuthenticationCode("012345")).toBe(true);
    for (const value of ["12345", "1234567", " 123456", "12a456", ""])
      expect(validAuthenticationCode(value)).toBe(false);
  });
  it("supports pasted spaced codes and bounds the supplied code", () => {
    expect(normalizeAuthenticationCode("01 23-45")).toBe("012345");
    expect(normalizeAuthenticationCode("123456789")).toBe("123456");
    expect(normalizeAuthenticationCode("abcdef")).toBe("");
  });
});
