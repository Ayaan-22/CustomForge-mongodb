"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AdminAuthShell } from "@/components/admin-auth-shell";

export default function VerifyEmailPrompt() {
  const resend = useMutation({ mutationFn: authClient.sendVerificationEmail });
  return <AdminAuthShell eyebrow="Confirm your address" title="Verify your email" description="Open the verification link in your inbox, then return to sign in." footer={<>Already verified? <Link href="/login">Continue to sign in <ArrowRight aria-hidden className="inline h-3 w-3" /></Link></>}>
    <div className="faa-result"><span className="faa-result-icon"><Mail aria-hidden /></span><h2>Your inbox is the next stop</h2><p>Confirming your email helps protect your account. Admin workspace permissions are assigned separately.</p></div>
    <button type="button" disabled={resend.isPending} onClick={() => resend.mutate()} className="faa-submit">{resend.isPending ? <><Loader2 aria-hidden className="faa-spinning" /> Requesting verification...</> : "Resend verification email"}</button>
    {resend.error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{resend.error.message}</p></div> : null}
    {resend.isSuccess ? <div role="status" className="faa-notice"><CheckCircle aria-hidden /><p>Verification email requested. Check your inbox and spam folder.</p></div> : null}
  </AdminAuthShell>;
}
