"use client";

import type React from "react";
import { useState } from "react";
import { AlertCircle, ArrowRight, Mail, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AdminAuthShell, getAdminAuthErrorMessage } from "@/components/admin-auth-shell";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await authClient.forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(getAdminAuthErrorMessage(err, "Failed to process request"));
    } finally {
      setLoading(false);
    }
  };

  return <AdminAuthShell eyebrow="Account recovery" title="Let's get you back in" description="Enter your account email to request password reset instructions." back>
    {error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{error}</p></div> : null}
    {success ? <div className="faa-result" role="status"><span className="faa-result-icon"><Mail aria-hidden /></span><h2>Reset instructions requested</h2><p>We received your request for <strong>{email}</strong>. If this email matches an eligible account, use the reset instructions when they arrive.</p><p>Check your inbox and spam folder.</p><button type="button" onClick={() => { setSuccess(false); setEmail(""); }} className="faa-text-button">Try another email</button></div> : <form onSubmit={handleSubmit} className="faa-form">
      <div className="faa-field"><label htmlFor="recovery-email">Email address</label><div className="faa-input-wrap"><Mail aria-hidden /><input id="recovery-email" type="email" required aria-label="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div></div>
      <button type="submit" disabled={loading} className="faa-submit">{loading ? <><Loader2 aria-hidden className="faa-spinning" /> Requesting instructions...</> : <>Request reset instructions <ArrowRight aria-hidden /></>}</button>
    </form>}
  </AdminAuthShell>;
}
