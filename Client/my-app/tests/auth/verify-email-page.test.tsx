import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const fixture = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  isEmailVerified: false,
  isLoading: false,
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => fixture }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import VerifyEmailPage from "@/app/verify-email/page";

afterEach(() => {
  fixture.user = null;
  fixture.isEmailVerified = false;
  fixture.isLoading = false;
});

describe("verification recovery presentation", () => {
  it("offers email and password recovery to guests with correct autocomplete", () => {
    const html = renderToStaticMarkup(<VerifyEmailPage />);
    expect(html).toContain('type="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Resend verification link");
    expect(html).not.toContain("Account email");
  });
  it("shows the signed-in recipient without a guest credential form", () => {
    fixture.user = { id: "sample", email: "player@example.test" };
    const html = renderToStaticMarkup(<VerifyEmailPage />);
    expect(html).toContain("player@example.test");
    expect(html).toContain("Account email");
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain('type="email"');
  });
  it("waits for account restoration before offering either resend path", () => {
    fixture.isLoading = true;
    const html = renderToStaticMarkup(<VerifyEmailPage />);
    expect(html).toContain("Checking your account");
    expect(html).not.toContain("Resend verification link");
  });
  it("keeps verified accounts in an honest redirecting state", () => {
    fixture.isEmailVerified = true;
    const html = renderToStaticMarkup(<VerifyEmailPage />);
    expect(html).toContain("Opening your account");
    expect(html).not.toContain("Resend verification link");
  });
});
