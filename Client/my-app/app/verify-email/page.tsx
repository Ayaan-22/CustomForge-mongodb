"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthService } from "@/services/auth-service";
import { requireSuccess } from "@/lib/query-result";
import {
  requestEmailVerification,
  verificationRequestMessage,
} from "@/lib/email-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthShell,
  AuthFeedback,
  AuthLoading,
} from "@/components/forge/auth-shell";
import { PasswordInput } from "@/components/forge/password-input";

type Feedback = {
  owner: string;
  tone: "error" | "success";
  message: string;
} | null;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isEmailVerified, isLoading } = useAuth();
  const owner = user?.id || "guest";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const currentOwner = useRef(owner);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentOwner.current = owner;
    setPassword("");
    setFeedback(null);
  }, [owner]);
  useEffect(() => {
    if (isEmailVerified) router.replace("/profile");
  }, [isEmailVerified, router]);
  useEffect(() => {
    if (feedback?.owner === owner) feedbackRef.current?.focus();
  }, [feedback, owner]);
  useEffect(
    () => () => {
      currentOwner.current = "unmounted";
    },
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setFeedback(null);
    const requestOwner = owner;
    try {
      const response = requireSuccess(
        await requestEmailVerification(
          { signedIn: Boolean(user), email, password },
          AuthService,
        ),
      );
      if (currentOwner.current !== requestOwner) return;
      setPassword("");
      setFeedback({
        owner: requestOwner,
        tone: "success",
        message: verificationRequestMessage(response.data?.message),
      });
    } catch (error) {
      if (currentOwner.current !== requestOwner) return;
      setFeedback({
        owner: requestOwner,
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to request a verification link. Please try again.",
      });
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account verification"
      title="Make it official."
      description={
        user
          ? "Confirm your email to unlock checkout and account features."
          : "A fresh link gets you back on track. Use the email and password you registered with."
      }
      variant="verify"
    >
      {isLoading || isEmailVerified ? (
        <AuthLoading
          message={
            isEmailVerified ? "Opening your account…" : "Checking your account…"
          }
        />
      ) : (
        <form onSubmit={submit} className="forge-auth-form" aria-busy={pending}>
          {user ? (
            <div className="forge-auth-recipient">
              <Mail aria-hidden="true" />
              <div>
                <span className="forge-auth-field-help">Account email</span>
                <p>{user.email}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="forge-auth-field">
                <Label htmlFor="verification-email">Email address</Label>
                <Input
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFeedback(null);
                  }}
                  disabled={pending}
                  placeholder="you@example.com"
                />
              </div>
              <div className="forge-auth-field">
                <Label htmlFor="verification-password">Password</Label>
                <PasswordInput
                  id="verification-password"
                  autoComplete="current-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFeedback(null);
                  }}
                  disabled={pending}
                  aria-describedby="verification-password-help"
                />
                <p
                  id="verification-password-help"
                  className="forge-auth-field-help"
                >
                  Use your account password to request a new verification link.
                </p>
              </div>
            </>
          )}
          {feedback?.owner === owner && (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              className="forge-auth-result-focus"
            >
              <AuthFeedback
                tone={feedback.tone}
                title={
                  feedback.tone === "error"
                    ? "Request needs another try"
                    : "Request accepted"
                }
              >
                {feedback.message}
              </AuthFeedback>
            </div>
          )}
          {pending && (
            <AuthLoading message="Requesting a fresh verification link…" />
          )}
          <Button
            className="forge-auth-submit"
            type="submit"
            disabled={pending}
          >
            <RefreshCw aria-hidden="true" />
            {pending ? "Requesting link…" : "Resend verification link"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </Button>
          <p className="forge-auth-field-help">
            Check your spam folder and open the newest link. A new request
            replaces older verification links.
          </p>
          <div className="forge-auth-links">
            <Link href="/login">Back to sign in</Link>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
