"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Info, Lock, Mail, User, Loader2 } from "lucide-react";
import { useAuth } from "@/app/components/auth-provider";
import { AdminAuthShell, getAdminAuthErrorMessage } from "@/components/admin-auth-shell";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", password: "", passwordConfirm: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({ name: formData.name, email: formData.email, password: formData.password, passwordConfirm: formData.passwordConfirm });
      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(getAdminAuthErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return <AdminAuthShell variant="register" eyebrow="Start with an account" title="Join CustomForge" description="Create your CustomForge account to get started." footer={<>Already have an account? <Link href="/login">Sign in</Link></>}>
    <div className="faa-notice"><Info aria-hidden /><p>Creates a standard account. Admin access is assigned separately.</p></div>
    {error ? <div role="alert" className="faa-error"><AlertCircle aria-hidden /><p>{error}</p></div> : null}
    <form onSubmit={handleSubmit} className="faa-form">
      <div className="faa-field"><label htmlFor="register-name">Full name</label><div className="faa-input-wrap"><User aria-hidden /><input id="register-name" type="text" required aria-label="Name" autoComplete="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your full name" /></div></div>
      <div className="faa-field"><label htmlFor="register-email">Email address</label><div className="faa-input-wrap"><Mail aria-hidden /><input id="register-email" type="email" required aria-label="Email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" /></div></div>
      <div className="faa-field"><label htmlFor="register-password">Password</label><div className="faa-input-wrap"><Lock aria-hidden /><input id="register-password" type={showPassword ? "text" : "password"} required aria-label="Password" autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="faa-password-toggle">{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button></div></div>
      <div className="faa-field"><label htmlFor="register-confirm">Confirm password</label><div className="faa-input-wrap"><Lock aria-hidden /><input id="register-confirm" type={showConfirmPassword ? "text" : "password"} required aria-label="Confirm password" autoComplete="new-password" value={formData.passwordConfirm} onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })} placeholder="Repeat password" /><button type="button" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="faa-password-toggle">{showConfirmPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button></div></div>
      <button type="submit" disabled={loading} className="faa-submit">{loading ? <><Loader2 aria-hidden className="faa-spinning" /> Creating account...</> : <>Create account <ArrowRight aria-hidden /></>}</button>
    </form>
  </AdminAuthShell>;
}
