"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AuthShell,
  AuthFeedback,
  AuthLoading,
} from "@/components/forge/auth-shell";
import { PasswordInput } from "@/components/forge/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService, type RegisterPayload } from "@/services/auth-service";
import { useToast } from "@/hooks/use-toast";
import {
  captureRegistration,
  runAuthSubmission,
  validateRegistration,
  type RegisterFieldErrors,
} from "@/lib/auth-entry";

export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const submitting = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formData, setFormData] = useState<RegisterPayload>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const disabled = pending || completed;

  useEffect(() => {
    if (requestError) feedbackRef.current?.focus();
  }, [requestError]);

  function updateField(field: keyof RegisterPayload, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === "password" ? { passwordConfirm: undefined } : {}),
    }));
    setRequestError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || completed) return;
    const payload = captureRegistration(formData);
    const errors = validateRegistration(payload);
    setFieldErrors(errors);
    setRequestError(null);
    if (Object.values(errors).some(Boolean)) {
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      else confirmationRef.current?.focus();
      return;
    }

    await runAuthSubmission(submitting, setPending, async () => {
      try {
        const response = await AuthService.register(payload);
        if (response.error) {
          setRequestError(
            response.error.message ||
              "Your account could not be created. Please try again.",
          );
          return;
        }
        if (!response.data?.user) {
          setRequestError(
            "We couldn’t confirm that your account was created. Try signing in or request verification before submitting again.",
          );
          return;
        }
        setCompleted(true);
        setFormData((previous) => ({
          ...previous,
          password: "",
          passwordConfirm: "",
        }));
        toast({
          title: "Registration successful!",
          description: "Please check your email to verify your account.",
        });
        router.replace("/verify-email");
      } catch {
        setRequestError(
          "We couldn’t connect to registration. Please try again. If you already received a verification email, open it before submitting again.",
        );
      }
    });
  }

  return (
    <AuthShell
      variant="register"
      eyebrow="JOIN CUSTOMFORGE"
      title="Make room for your next build."
      description="Create an account to save gear and keep your orders in one place."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="forge-auth-form"
        aria-busy={pending}
      >
        {requestError && (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            className="forge-auth-feedback-focus"
          >
            <AuthFeedback tone="error" title="Registration needs attention">
              {requestError}
            </AuthFeedback>
          </div>
        )}
        {completed && (
          <AuthFeedback tone="success" title="Account created">
            Check your email to verify your account. Opening verification
            guidance…
          </AuthFeedback>
        )}

        <div className="forge-auth-field">
          <Label htmlFor="name">Name</Label>
          <Input
            ref={nameRef}
            id="name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="name-error" className="forge-auth-field-error" role="alert">
              {fieldErrors.name}
            </p>
          )}
        </div>

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
            onChange={(event) => updateField("email", event.target.value)}
            required
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "email-error email-help" : "email-help"
            }
          />
          <p id="email-help" className="forge-auth-field-help">
            We’ll send an email to verify this address before you can sign in.
          </p>
          {fieldErrors.email && (
            <p id="email-error" className="forge-auth-field-error" role="alert">
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
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={formData.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password
                ? "password-error password-help"
                : "password-help"
            }
          />
          <p id="password-help" className="forge-auth-field-help">
            Use 8–128 characters. Spaces and symbols are accepted.
          </p>
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

        <div className="forge-auth-field">
          <Label htmlFor="passwordConfirm">Confirm password</Label>
          <PasswordInput
            ref={confirmationRef}
            id="passwordConfirm"
            name="passwordConfirm"
            visibilityLabel="confirmed password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={formData.passwordConfirm}
            onChange={(event) =>
              updateField("passwordConfirm", event.target.value)
            }
            required
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.passwordConfirm)}
            aria-describedby={
              fieldErrors.passwordConfirm ? "confirmation-error" : undefined
            }
          />
          {fieldErrors.passwordConfirm && (
            <p
              id="confirmation-error"
              className="forge-auth-field-error"
              role="alert"
            >
              {fieldErrors.passwordConfirm}
            </p>
          )}
        </div>

        {pending && (
          <AuthLoading message="Creating your account and requesting verification…" />
        )}
        <Button type="submit" disabled={disabled} className="forge-auth-submit">
          {completed
            ? "Opening verification…"
            : pending
              ? "Creating account…"
              : "Create account"}
          <ArrowRight aria-hidden="true" size={18} />
        </Button>
        <p className="forge-auth-switch">
          Already have an account?{" "}
          <Link href="/login" prefetch={false}>
            Sign in
          </Link>
        </p>
        {requestError && (
          <div className="forge-auth-links">
            <Link href="/verify-email" prefetch={false}>
              Verification guidance
            </Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
