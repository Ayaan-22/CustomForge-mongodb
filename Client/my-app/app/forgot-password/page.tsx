"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthFeedback,
  AuthLoading,
  AuthShell,
} from "@/components/forge/auth-shell";
import { AuthService } from "@/services/auth-service";
import {
  recoveryErrorMessage,
  recoveryRequest,
  validateRecoveryEmail,
} from "@/lib/auth-recovery";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) result.current?.focus();
  }, [submitted]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || submitted) return;
    setError(undefined);
    const validation = validateRecoveryEmail(email);
    setFieldError(validation.email);
    if (validation.email) {
      emailInput.current?.focus();
      return;
    }
    try {
      const response = await recoveryRequest(submitting, setPending, () =>
        AuthService.forgotPassword({ email: email.trim() }),
      );
      if (response) setSubmitted(true);
    } catch (failure) {
      setError(recoveryErrorMessage(failure));
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }

  return (
    <AuthShell
      variant="recovery"
      eyebrow="ACCOUNT RECOVERY"
      title={submitted ? "Check your inbox." : "Get back in the game."}
      description={
        submitted
          ? "Your reset request was accepted. Look for a CustomForge email with your next step."
          : "Enter the email connected to your account to request a password reset link."
      }
    >
      {submitted ? (
        <div
          ref={result}
          tabIndex={-1}
          className="forge-auth-form forge-auth-result-focus"
        >
          <AuthFeedback tone="success" title="Reset request accepted">
            Check your inbox and spam folder for the latest reset link.
          </AuthFeedback>
          <p className="forge-auth-field-help">
            Open the latest reset email and choose a new password. If the link
            no longer works, request another one.
          </p>
          <Button className="forge-auth-submit" asChild>
            <Link href="/login" prefetch={false}>
              Back to sign in <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </Button>
          <div className="forge-auth-links">
            <Button
              variant="ghost"
              onClick={() => {
                setSubmitted(false);
                requestAnimationFrame(() => emailInput.current?.focus());
              }}
            >
              Use a different email or request again
            </Button>
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
              <AuthFeedback
                tone="error"
                title="Reset request couldn’t complete"
              >
                {error}
              </AuthFeedback>
            </div>
          )}
          <div className="forge-auth-field">
            <Label htmlFor="recovery-email">Email address</Label>
            <Input
              ref={emailInput}
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={255}
              required
              disabled={pending}
              value={email}
              placeholder="you@example.com"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "recovery-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError(undefined);
              }}
            />
            {fieldError && (
              <p
                id="recovery-email-error"
                className="forge-auth-field-error"
                role="alert"
              >
                {fieldError}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="forge-auth-submit"
            disabled={pending}
          >
            {pending ? "Requesting reset link…" : "Send reset link"}
            {!pending && <ArrowRight aria-hidden="true" size={18} />}
          </Button>
          {pending && <AuthLoading message="Submitting your reset request…" />}
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
