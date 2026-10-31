"use client";

import type React from "react";
import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Loader2, CheckCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AdminAuthShell, getAdminAuthErrorMessage } from "@/components/admin-auth-shell";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { token } = use(params);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: "", passwordConfirm: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authClient.resetPassword(token, formData.password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(getAdminAuthErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return <AdminAuthShell eyebrow="A fresh start" title={success ? "Password updated" : "Set a new password"} description={success ? "Your account is ready for a new sign-in." : "Choose a strong password and confirm it below."} back={!success}>
    {success ? <div className="faa-result" role="status"><span className="faa-result-icon"><CheckCircle aria-hidden /></span><h2>You're ready to sign in</h2><p>Your password has been successfully updated. You will be redirected to sign in shortly.</p><Link href="/login" className="faa-submit">Go to sign in <ArrowRight aria-hidden /></Link></div> : <>
      {error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{error}</p></div> : null}
      <form onSubmit={handleSubmit} className="faa-form">
        <div className="faa-field"><label htmlFor="reset-password">New password</label><div className="faa-input-wrap"><Lock aria-hidden /><input id="reset-password" type={showPassword ? "text" : "password"} required aria-label="Password" autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a new password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="faa-password-toggle">{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button></div></div>
        <div className="faa-field"><label htmlFor="reset-confirm">Confirm password</label><div className="faa-input-wrap"><Lock aria-hidden /><input id="reset-confirm" type={showPassword ? "text" : "password"} required aria-label="Confirm password" autoComplete="new-password" value={formData.passwordConfirm} onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })} placeholder="Enter your new password again" /></div></div>
        <button type="submit" disabled={loading} className="faa-submit">{loading ? <><Loader2 aria-hidden className="faa-spinning" /> Updating password...</> : <>Update password <ArrowRight aria-hidden /></>}</button>
      </form>
    </>}
  </AdminAuthShell>;
}
