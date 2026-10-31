import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({
  token: "opaque-reset-token" as string | undefined,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: route.token }),
  useRouter: () => ({ push: vi.fn() }),
}));

import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/[token]/page";

beforeEach(() => {
  route.token = "opaque-reset-token";
});

describe("recovery route accessibility and link handling", () => {
  it("labels the email field and exposes a non-prefetched sign-in action", () => {
    const html = renderToStaticMarkup(<ForgotPasswordPage />);
    expect(html).toContain('for="recovery-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('maxLength="255"');
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("We sent a password reset link");
  });

  it("supports password managers and separate labeled visibility controls without exposing the URL token", () => {
    const html = renderToStaticMarkup(<ResetPasswordPage />);
    expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(html.match(/maxLength="128"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Show new password"');
    expect(html).toContain('aria-label="Show confirmation password"');
    expect(html).not.toContain(route.token);
  });

  it("offers new-link recovery immediately when no valid route token exists", () => {
    route.token = undefined;
    const html = renderToStaticMarkup(<ResetPasswordPage />);
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain("Reset link unavailable");
    expect(html).not.toContain('name="password"');
    expect(html).toContain('role="alert"');
  });
});
