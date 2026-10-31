"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AuthShell,
  AuthFeedback,
  AuthLoading,
} from "@/components/forge/auth-shell";
import { AuthService } from "@/services/auth-service";
import {
  createVerificationRequestCache,
  observeVerificationRequest,
  verificationToken,
} from "@/lib/email-verification";

type VerificationState = {
  token: string | null;
  status: "ready" | "verifying" | "success" | "error";
  message: string;
};

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const token = verificationToken(params.token);
  const [result, setResult] = useState<VerificationState>({
    token,
    status: "ready",
    message: "",
  });
  const request = useRef(
    createVerificationRequestCache(AuthService.verifyEmail),
  );
  const resultHeading = useRef<HTMLDivElement>(null);
  const stopObserving = useRef<(() => void) | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    stopObserving.current?.();
    submitting.current = false;
    setResult({ token, status: "ready", message: "" });
    if (!token) {
      setResult({
        token,
        status: "error",
        message:
          "This verification link is incomplete. Request a new link to continue.",
      });
      return;
    }
    return () => stopObserving.current?.();
  }, [token]);

  function confirmVerification() {
    if (!token || current.status !== 'ready' || submitting.current) return;
    submitting.current = true;
    setResult({ token, status: 'verifying', message: '' });
    // Loading an email link never consumes it. Only this explicit action submits.
    stopObserving.current = observeVerificationRequest(
      request.current(token),
      (response) => {
        if (response.error) {
          setResult({
            token,
            status: "error",
            message: response.error.message,
          });
        } else {
          setResult({
            token,
            status: "success",
            message:
              response.data?.message || "Your email address is verified.",
          });
        }
      },
      () => {
        setResult({
          token,
          status: "error",
          message:
            "We could not confirm this link. Request a fresh link, or sign in if you already verified your email.",
        });
      },
    );
  }

  const current =
    result.token === token
      ? result
      : { token, status: "ready", message: "" };
  useEffect(() => {
    if (current.status === 'success' || current.status === 'error') resultHeading.current?.focus();
  }, [current.status, token]);

  return (
    <AuthShell
      eyebrow="Account verification"
      title={
        current.status === "success"
          ? "You're verified."
          : current.status === "error"
            ? "Let's recover your link."
            : "One final checkpoint."
      }
      description={
        current.status === "success"
          ? "Your account is ready for its next upgrade."
          : "Confirm your email to keep your account and orders connected."
      }
      variant="verify"
    >
      {current.status === 'ready' ? (
        <div className="forge-auth-form">
          <p className="forge-auth-field-help">Select confirm to verify your email address and open your account. Opening this link alone does not verify your email.</p>
          <Button type="button" className="forge-auth-submit" onClick={confirmVerification}>
            <CheckCircle2 aria-hidden="true" /> Confirm email address <ArrowRight aria-hidden="true" />
          </Button>
          <div className="forge-auth-links"><Link href="/login">Back to sign in</Link></div>
        </div>
      ) : current.status === "verifying" ? (
        <AuthLoading message="Checking your verification link…" />
      ) : (
        <div className="forge-auth-form">
          <div
            ref={resultHeading}
            tabIndex={-1}
            className="forge-auth-result-focus"
          >
            <AuthFeedback
              tone={current.status === "success" ? "success" : "error"}
              title={
                current.status === "success"
                  ? "Email verified"
                  : "Link could not be verified"
              }
            >
              {current.message}
            </AuthFeedback>
          </div>
          {current.status === "success" ? (
            <>
              <div className="forge-auth-field-help">
                Continue to your account to review your profile and security
                settings.
              </div>
              <Button asChild className="forge-auth-submit">
                <Link href="/profile">
                  <CheckCircle2 aria-hidden="true" /> Continue to account{" "}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="forge-auth-field-help">
                Links may expire or have already been used. Request a new one
                and open the newest email.
              </p>
              <Button asChild className="forge-auth-submit">
                <Link href="/verify-email">
                  <RefreshCw aria-hidden="true" /> Request a new link
                </Link>
              </Button>
            </>
          )}
          <div className="forge-auth-links">
            <Link href="/login">
              {current.status === "error"
                ? "Already verified? Sign in"
                : "Back to sign in"}
            </Link>
            <Link href="/products">Explore the store</Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
