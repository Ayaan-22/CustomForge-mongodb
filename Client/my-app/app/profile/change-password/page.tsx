"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/services/auth-service";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function ChangePasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const currentPassword = (
      form.querySelector("#currentPassword") as HTMLInputElement
    ).value;
    const newPassword = (form.querySelector("#newPassword") as HTMLInputElement)
      .value;
    const confirmPassword = (
      form.querySelector("#confirmPassword") as HTMLInputElement
    ).value;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const res = await AuthService.updatePassword(
      {
        passwordCurrent: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      },
      twoFactorToken || undefined,
    );
    setLoading(false);

    if (res.error) {
      toast({
        title: "Error",
        description: res.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Password changed successfully" });
    router.push("/profile");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-heading mb-6 text-2xl">Change password</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-md border bg-card/60 p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {user?.twoFactorEnabled && (
          <div className="space-y-2">
            <Label htmlFor="twoFactorToken">Authenticator code</Label>
            <Input
              id="twoFactorToken"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={twoFactorToken}
              onChange={(e) =>
                setTwoFactorToken(e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change password"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
