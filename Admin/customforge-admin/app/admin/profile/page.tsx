"use client"

import "../forge-operations.css"
import type React from "react"

import { useState } from "react"
import { useAuth } from "@/app/components/auth-provider"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Key, User, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { SectionHeader } from "@/components/patterns/section-header"
import { PageShell } from "@/components/patterns/page-shell"

export default function ProfilePage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 2FA State
  const [isEnabling2FA, setIsEnabling2FA] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await authClient.updatePassword({ passwordCurrent: currentPassword, password: newPassword, passwordConfirm: confirmPassword })
      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: unknown) {
      toast.error(((error instanceof Error && error.message) || "Failed to update password"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnable2FA = async () => {
    setIsLoading(true)
    try {
      const { data } = await authClient.enableTwoFactor(currentPassword)
      setQrCode(data.secret)
      setIsEnabling2FA(true)
    } catch {
      toast.error("Failed to start 2FA setup")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    setIsLoading(true)
    try {
      await authClient.verifyTwoFactor(verificationCode)
      toast.success("2FA enabled successfully")
      setIsEnabling2FA(false)
      setQrCode(null)
      // Ideally update user context here to reflect 2FA status
      window.location.reload() // Simple reload to refresh auth state
    } catch {
      toast.error("Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setIsLoading(true)
    try {
      await authClient.disableTwoFactor(verificationCode, currentPassword)
      toast.success("2FA disabled successfully")
      setShowDisableConfirm(false)
      setVerificationCode("")
      window.location.reload()
    } catch {
      toast.error("Failed to disable 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageShell className="fo-page">
      <SectionHeader eyebrow="Administrator account" title="Profile & security" description="View your profile and manage the security of your CustomForge account." icon={<Shield />} />

      <Tabs defaultValue="security" className="fo-profile-tabs w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-muted text-muted-foreground data-[state=active]:text-foreground"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-muted text-muted-foreground data-[state=active]:text-foreground"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="fa-panel">
            <CardHeader>
              <CardTitle className="text-foreground">Personal Information</CardTitle>
              <CardDescription className="text-muted-foreground">Your basic account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="fo-profile-identity">
                <div className="fo-profile-avatar">
                  {user?.name?.charAt(0) || "A"}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-foreground break-words">{user?.name}</h3>
                  <p className="text-muted-foreground break-all">{user?.email}</p>
                  <div className="fo-profile-role">
                    {user?.role}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 fo-profile-layout">
          {/* Two-Factor Authentication */}
          <Card className="fa-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="fo-security-icon" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.twoFactorEnabled ? (
                <div className="space-y-6">
                  <div className="fo-security-state">
                    <CheckCircle2 className="w-5 h-5 text-[var(--fa-success)]" />
                    <div>
                      <p className="font-medium text-[var(--fa-success)]">2FA is enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is protected with two-factor authentication.
                      </p>
                    </div>
                  </div>

                  {!showDisableConfirm ? (
                    <Button variant="destructive" onClick={() => setShowDisableConfirm(true)}>
                      Disable 2FA
                    </Button>
                  ) : (
                    <div className="fo-security-form">
                      <div className="space-y-2">
                        <Label htmlFor="disable-2fa-password">Current password</Label>
                        <Input id="disable-2fa-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Confirm your current password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="disable-2fa-code">Authenticator code</Label>
                        <Input
                          id="disable-2fa-code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Enter current 2FA code"
                          aria-label="Authenticator code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleDisable2FA}
                          disabled={isLoading || verificationCode.length !== 6 || !currentPassword}
                        >
                          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Confirm Disable
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowDisableConfirm(false)
                            setVerificationCode("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {!isEnabling2FA ? (
                    <div className="fo-security-form">
                      <div>
                        <p className="text-foreground font-medium">Protect your account</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Secure your account with TOTP (Google Authenticator, Authy, etc.)
                        </p>
                      </div>
                      <div className="fa-field">
                        <Label htmlFor="enable-2fa-password">Current password</Label>
                        <Input id="enable-2fa-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Confirm your current password" />
                        <p className="text-xs text-muted-foreground">Confirm your password to begin authenticator setup.</p>
                      </div>
                      <Button onClick={handleEnable2FA} disabled={isLoading || !currentPassword}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Enable 2FA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="fo-detail-cell space-y-4">
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="fo-setup-key">
                            {/* Display the server-supplied secret for manual authenticator enrollment. */}
                            <code className="break-all">{qrCode}</code>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Enter this setup key in your authenticator</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                              Keep this key private. Add it manually to your authenticator, then enter the generated code
                              below.
                            </p>
                          </div>
                        </div>

                        <div className="max-w-xs mx-auto space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="enable-2fa-code">Verification code</Label>
                            <Input
                              id="enable-2fa-code"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder="000 000"
                              aria-label="Authenticator code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              className="bg-card border-border text-foreground text-center tracking-widest text-lg"
                              maxLength={6}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="w-full"
                              onClick={handleVerify2FA}
                              disabled={isLoading || verificationCode.length !== 6}
                            >
                              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Verify & Enable
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setIsEnabling2FA(false)
                                setQrCode(null)
                                setVerificationCode("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="fa-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Key className="fo-security-icon" />
                Change Password
              </CardTitle>
              <CardDescription className="text-muted-foreground">Update your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="fo-security-form">
                <div className="space-y-2">
                  <Label htmlFor="profile-current-password">Current Password</Label>
                  <Input
                    id="profile-current-password"
                    type="password"
                    autoComplete="current-password"
                    aria-label="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-new-password">New Password</Label>
                  <Input
                    id="profile-new-password"
                    type="password"
                    autoComplete="new-password"
                    aria-label="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-confirm-password">Confirm New Password</Label>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    aria-label="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
