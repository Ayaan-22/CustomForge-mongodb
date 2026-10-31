"use client";

import type React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AuthFeedback,
  AuthLoading,
  AuthShell,
} from "@/components/forge/auth-shell";
import { PasswordInput } from "@/components/forge/password-input";
import { AuthService } from "@/services/auth-service";
import {
  isInvalidResetLink,
  recoveryErrorMessage,
  recoveryRequest,
  validateRecoveryPasswords,
  type RecoveryFieldErrors,
} from "@/lib/auth-recovery";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [errors, setErrors] = useState<RecoveryFieldErrors>({});
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || complete || invalidLink || !token) return;
    const form = event.currentTarget;
    setError(undefined);
    const validation = validateRecoveryPasswords(password, passwordConfirm);
    setErrors(validation);
    const firstField = validation.password
      ? "password"
      : validation.passwordConfirm
        ? "passwordConfirm"
        : null;
    if (firstField) {
      (form.elements.namedItem(firstField) as HTMLInputElement | null)?.focus();
      return;
    }
    try {
      const response = await recoveryRequest(submitting, setPending, () =>
        AuthService.resetPassword(token, { password, passwordConfirm }),
      );
      if (!response) return;
      setPassword("");
      setPasswordConfirm("");
      setComplete(true);
      router.push("/profile");
    } catch (failure) {
      setInvalidLink(isInvalidResetLink(failure));
      setError(recoveryErrorMessage(failure));
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }

  const unavailable = invalidLink || !token;
  return (
    <AuthShell
      variant="recovery"
      eyebrow="ACCOUNT RECOVERY / NEW PASSWORD"
      title={
        complete
          ? "You’re back in."
          : unavailable
            ? "Let’s get a fresh link."
            : "Reset. Refocus. Return."
      }
      description={
        complete
          ? "Your password was updated. Continue to your CustomForge account."
          : unavailable
            ? "This password reset link is invalid or has expired. Request a new link to continue."
            : "Choose a new password for your account. Use 8–128 characters and keep it unique."
      }
    >
      {complete ? (
        <div className="forge-auth-form">
          <AuthFeedback tone="success" title="Password updated">
            Your new password is ready to use.
          </AuthFeedback>
          <Button className="forge-auth-submit" asChild>
            <Link href="/profile" prefetch={false}>
              Continue to account <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </Button>
        </div>
      ) : unavailable ? (
        <div className="forge-auth-form">
          <div
            ref={feedback}
            tabIndex={-1}
            className="forge-auth-feedback-focus"
          >
            <AuthFeedback tone="error" title="Reset link unavailable">
              {error ||
                "Open the complete link from your reset email, or request a new one."}
            </AuthFeedback>
          </div>
          <Button className="forge-auth-submit" asChild>
            <Link href="/forgot-password" prefetch={false}>
              Request a new reset link{" "}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </Button>
          <div className="forge-auth-links">
            <Link href="/login" prefetch={false}>
              <ArrowLeft aria-hidden="true" size={16} /> Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form
          className="forge-auth-form"
          onSubmit={onSubmit}
          noValidate
          aria-busy={pending}
        >
          {error && (
            <div
              ref={feedback}
              tabIndex={-1}
              className="forge-auth-feedback-focus"
            >
              <AuthFeedback tone="error" title="Password couldn’t be updated">
                {error}
              </AuthFeedback>
            </div>
          )}
          <div className="forge-auth-field">
            <Label htmlFor="reset-password">New password</Label>
            <PasswordInput
              id="reset-password"
              name="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              disabled={pending}
              visibilityLabel="new password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "reset-password-error" : "reset-password-help"
              }
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  passwordConfirm: undefined,
                }));
              }}
            />
            {errors.password ? (
              <p
                id="reset-password-error"
                className="forge-auth-field-error"
                role="alert"
              >
                {errors.password}
              </p>
            ) : (
              <p id="reset-password-help" className="forge-auth-field-help">
                Use a unique password. Spaces and pasted passwords are
                supported.
              </p>
            )}
          </div>
          <div className="forge-auth-field">
            <Label htmlFor="reset-password-confirm">Confirm new password</Label>
            <PasswordInput
              id="reset-password-confirm"
              name="passwordConfirm"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={passwordConfirm}
              disabled={pending}
              visibilityLabel="confirmation password"
              aria-invalid={Boolean(errors.passwordConfirm)}
              aria-describedby={
                errors.passwordConfirm
                  ? "reset-password-confirm-error"
                  : undefined
              }
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                setErrors((current) => ({
                  ...current,
                  passwordConfirm: undefined,
                }));
              }}
            />
            {errors.passwordConfirm && (
              <p
                id="reset-password-confirm-error"
                className="forge-auth-field-error"
                role="alert"
              >
                {errors.passwordConfirm}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="forge-auth-submit"
            disabled={pending}
          >
            {pending ? "Updating password…" : "Reset password"}
            {!pending && <ArrowRight aria-hidden="true" size={18} />}
          </Button>
          {pending && <AuthLoading message="Updating your account password…" />}
          <div className="forge-auth-links">
            <Link href="/login" prefetch={false}>
              <ArrowLeft aria-hidden="true" size={16} /> Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
