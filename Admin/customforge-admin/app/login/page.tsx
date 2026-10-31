"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/app/components/auth-provider";
import { AdminAuthShell, getAdminAuthErrorMessage } from "@/components/admin-auth-shell";

export default function LoginPage() {
  const { login, submitTwoFactor, requiresTwoFactor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(requiresTwoFactor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await login(formData);
      setLoading(false);
    } catch (err: unknown) {
      const message = getAdminAuthErrorMessage(err, "Something went wrong");
      if (message === "2FA required") setShowTwoFactorModal(true);
      else setError(message);
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !/^\d{6}$/.test(twoFactorCode)) return;
    setLoading(true);
    setError("");
    try {
      await submitTwoFactor(twoFactorCode, formData.email, formData.password);
    } catch (err: unknown) {
      setError(getAdminAuthErrorMessage(err, "2FA verification failed"));
      setLoading(false);
    }
  };

  if (requiresTwoFactor || showTwoFactorModal) {
    return <AdminAuthShell eyebrow="One more checkpoint" title="Verify it's you" description="Enter the six-digit code from your authenticator app to continue to the admin workspace.">
      <div className="faa-notice"><ShieldCheck aria-hidden /><p>Your account uses two-factor authentication.</p></div>
      {error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{error}</p></div> : null}
      <form onSubmit={handleTwoFactorSubmit} className="faa-form">
        <div className="faa-field">
          <label htmlFor="authenticator-code">Authenticator code</label>
          <div className="faa-input-wrap faa-code-input">
            <input id="authenticator-code" type="text" aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
          </div>
          <p className="faa-field-help">Use the current code displayed in your authenticator app.</p>
        </div>
        <button type="submit" disabled={loading || twoFactorCode.length !== 6} className="faa-submit">
          {loading ? <><Loader2 aria-hidden className="faa-spinning" /> Verifying...</> : <>Verify and continue <ArrowRight aria-hidden /></>}
        </button>
      </form>
    </AdminAuthShell>;
  }

  return <AdminAuthShell eyebrow="Welcome to your workspace" title="Sign in to CustomForge" description="Your store operations start here. Sign in with an authorized administrator account." footer={<>Need an account? <Link href="/register">Create an account</Link></>}>
    {error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{error}</p></div> : null}
    <form onSubmit={handleSubmit} className="faa-form">
      <div className="faa-field">
        <label htmlFor="login-email">Email address</label>
        <div className="faa-input-wrap"><Mail aria-hidden />
          <input id="login-email" type="email" required aria-label="Email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" />
        </div>
      </div>
      <div className="faa-field">
        <div className="faa-label-row"><label htmlFor="login-password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
        <div className="faa-input-wrap"><Lock aria-hidden />
          <input id="login-password" type={showPassword ? "text" : "password"} required aria-label="Password" autoComplete="current-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter your password" />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="faa-password-toggle">{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button>
        </div>
      </div>
      <button type="submit" disabled={loading} className="faa-submit">
        {loading ? <><Loader2 aria-hidden className="faa-spinning" /> Signing in...</> : <>Sign in <ArrowRight aria-hidden /></>}
      </button>
    </form>
  </AdminAuthShell>;
}
