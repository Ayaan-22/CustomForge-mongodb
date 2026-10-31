"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AdminAuthShell, getAdminAuthErrorMessage } from "@/components/admin-auth-shell";

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const activeToken = useRef(token);

  useEffect(() => {
    activeToken.current = token;
    setSuccess(false);
    setLoading(false);
    pending.current = false;
    setError(token ? '' : 'This verification link is incomplete.');
    return () => { activeToken.current = ''; };
  }, [token]);

  async function confirmVerification() {
    if (!token || pending.current || success) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      await authClient.verifyEmail(token);
      if (activeToken.current === token) setSuccess(true);
    } catch (err: unknown) {
      if (activeToken.current === token) setError(getAdminAuthErrorMessage(err, 'Failed to verify email'));
    } finally {
      if (activeToken.current === token) { pending.current = false; setLoading(false); }
    }
  }

  return <AdminAuthShell eyebrow="Email confirmation" title={loading ? "Confirming your email" : success ? "Email verified" : error ? "Verification unsuccessful" : "Confirm your email"} description={loading ? "Please wait while we confirm your email address." : success ? "Your email address has been confirmed." : "Select confirm to verify your email address. Opening this link alone does not verify it."}>
    {loading ? <div className="faa-result" role="status"><span className="faa-result-icon"><Loader2 aria-hidden className="faa-spinning" /></span><h2>Checking your verification link</h2><p>This should only take a moment.</p></div> : success ? <div className="faa-result" role="status"><span className="faa-result-icon"><CheckCircle aria-hidden /></span><h2>One step complete</h2><p>You can now sign in to your CustomForge account. Access to the admin workspace requires separately assigned administrator permissions.</p><Link href="/login" className="faa-submit">Continue to sign in <ArrowRight aria-hidden /></Link></div> : error ? <div className="faa-result"><span className="faa-result-icon is-error"><XCircle aria-hidden /></span><h2>This link couldn't be verified</h2><p role="alert">{error}</p><p>The link may be invalid or expired. Sign in and request a new verification link.</p><Link href="/login" className="faa-submit">Back to sign in <ArrowRight aria-hidden /></Link></div> : <button type="button" className="faa-submit" onClick={confirmVerification}>Confirm email address <ArrowRight aria-hidden /></button>}
  </AdminAuthShell>;
}
