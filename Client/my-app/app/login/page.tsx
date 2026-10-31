"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  AuthShell,
  AuthFeedback,
  AuthLoading,
} from "@/components/forge/auth-shell";
import { PasswordInput } from "@/components/forge/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/services/auth-service";
import { useToast } from "@/hooks/use-toast";
import { safeRedirect } from "@/lib/safe-redirect";
import {
  captureLoginCredentials,
  createLoginPayload,
  runAuthSubmission,
  validateAuthenticatorCode,
  validateLogin,
  type LoginCredentials,
  type LoginFieldErrors,
} from "@/lib/auth-entry";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const submitting = React.useRef(false);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);
  const feedbackRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  const [challenge, setChallenge] = React.useState<LoginCredentials | null>(
    null,
  );
  const [twoFactorToken, setTwoFactorToken] = React.useState("");
  const [formData, setFormData] = React.useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<LoginFieldErrors>({});
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const disabled = isLoading || signedIn;

  React.useEffect(() => {
    if (challenge && !isLoading) codeRef.current?.focus();
  }, [challenge, isLoading]);

  React.useEffect(() => {
    if (requestError) feedbackRef.current?.focus();
  }, [requestError]);

  function updateCredentials(field: keyof LoginCredentials, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setRequestError(null);
  }

  function backToSignIn() {
    if (submitting.current || signedIn) return;
    // Discard the challenge and its secrets; a changed account starts a fresh login.
    setChallenge(null);
    setTwoFactorToken("");
    setFormData((previous) => ({ ...previous, password: "" }));
    setFieldErrors({});
    setRequestError(null);
    requestAnimationFrame(() => passwordRef.current?.focus());
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || signedIn) return;
    const credentials = challenge ?? captureLoginCredentials(formData);
    const errors: LoginFieldErrors = challenge
      ? { twoFactorToken: validateAuthenticatorCode(twoFactorToken) }
      : validateLogin(credentials);
    setFieldErrors(errors);
    setRequestError(null);
    if (errors.email || errors.password || errors.twoFactorToken) {
      if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      else codeRef.current?.focus();
      return;
    }

    await runAuthSubmission(submitting, setIsLoading, async () => {
      try {
        const response = await AuthService.login(
          createLoginPayload(
            credentials,
            challenge ? twoFactorToken : undefined,
          ),
        );
        if (response.error) {
          if (response.error.is2FARequired && !challenge) {
            // Keep the exact credentials used for this challenge until server success.
            setChallenge(credentials);
            setTwoFactorToken("");
            setFormData((previous) => ({ ...previous, password: "" }));
            return;
          }
          setRequestError(
            response.error.message ||
              "Sign in could not be completed. Please try again.",
          );
          return;
        }
        if (!response.data?.token || !response.data.user) {
          setRequestError(
            "Your session could not be confirmed. Please try signing in again.",
          );
          return;
        }
        setSignedIn(true);
        setChallenge(null);
        setTwoFactorToken("");
        setFormData((previous) => ({ ...previous, password: "" }));
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        router.replace(safeRedirect(searchParams.get("redirect")));
      } catch {
        setRequestError(
          "We couldn’t connect to your account. Please try again.",
        );
      }
    });
  }

  return (
    <AuthShell
      variant="login"
      eyebrow={challenge ? "ACCOUNT PROTECTION" : "WELCOME BACK"}
      title={challenge ? "Confirm it’s you." : "Your next session starts here."}
      description={
        challenge
          ? "Complete the authenticator check to continue signing in."
          : "Sign in to manage your saved gear and orders."
      }
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="forge-auth-form"
        aria-busy={isLoading}
      >
        {requestError && (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            className="forge-auth-feedback-focus"
          >
            <AuthFeedback tone="error" title="Sign in needs attention">
              {requestError}
            </AuthFeedback>
          </div>
        )}
        {!challenge ? (
          <>
            <div className="forge-auth-field">
              <Label htmlFor="email">Email address</Label>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={255}
                value={formData.email}
                onChange={(event) =>
                  updateCredentials("email", event.target.value)
                }
                required
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p
                  id="email-error"
                  className="forge-auth-field-error"
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div className="forge-auth-field">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                ref={passwordRef}
                id="password"
                name="password"
                autoComplete="current-password"
                minLength={8}
                maxLength={128}
                value={formData.password}
                onChange={(event) =>
                  updateCredentials("password", event.target.value)
                }
                required
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
              />
              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="forge-auth-field-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <AuthFeedback tone="info" title="Authenticator required">
              Enter the current code from your authenticator app for{" "}
              {challenge.email}.
            </AuthFeedback>
            <div className="forge-auth-field">
              <Label htmlFor="twoFactorToken">
                6-digit authentication code
              </Label>
              <Input
                ref={codeRef}
                id="twoFactorToken"
                name="twoFactorToken"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                className="forge-auth-otp"
                placeholder="000000"
                value={twoFactorToken}
                onChange={(event) => {
                  setTwoFactorToken(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  setFieldErrors({});
                  setRequestError(null);
                }}
                required
                disabled={disabled}
                maxLength={6}
                aria-invalid={Boolean(fieldErrors.twoFactorToken)}
                aria-describedby={
                  fieldErrors.twoFactorToken
                    ? "code-error code-help"
                    : "code-help"
                }
              />
              <p id="code-help" className="forge-auth-field-help">
                Use your authenticator app, rather than an email verification
                code.
              </p>
              {fieldErrors.twoFactorToken && (
                <p
                  id="code-error"
                  className="forge-auth-field-error"
                  role="alert"
                >
                  {fieldErrors.twoFactorToken}
                </p>
              )}
            </div>
          </>
        )}

        {isLoading && (
          <AuthLoading
            message={
              challenge
                ? "Checking your authentication code…"
                : "Checking your sign-in details…"
            }
          />
        )}
        <Button type="submit" className="forge-auth-submit" disabled={disabled}>
          {signedIn
            ? "Opening your account…"
            : isLoading
              ? "Signing in…"
              : challenge
                ? "Verify and sign in"
                : "Sign in"}
          {challenge ? (
            <ShieldCheck aria-hidden="true" size={18} />
          ) : (
            <ArrowRight aria-hidden="true" size={18} />
          )}
        </Button>

        {challenge ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={backToSignIn}
            disabled={disabled}
          >
            Back to sign in
          </Button>
        ) : (
          <>
            <div className="forge-auth-links">
              <Link href="/verify-email" prefetch={false}>
                Resend verification email
              </Link>
              <Link href="/forgot-password" prefetch={false}>
                Forgot password?
              </Link>
            </div>
            <p className="forge-auth-switch">
              New to CustomForge?{" "}
              <Link href="/register" prefetch={false}>
                Create an account
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
