"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { UserService } from "@/services/user-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserRound,
  Mail,
  MapPin,
  Shield,
  Trash2,
  Package,
  ArrowUpRight,
  CheckCircle2,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { requireSuccess } from "@/lib/query-result";
import { useMutation } from "@tanstack/react-query";
import { useTwoFactorModal } from "@/components/two-factor-modal";
import {
  createProfileDraft,
  profileHasChanges,
  syncProfileDraft,
  type ProfileFields,
} from "@/lib/account-profile";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  invalid,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  invalid?: boolean;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="forge-account-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="forge-account-password">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-invalid={invalid}
          aria-describedby={invalid ? "password-feedback" : undefined}
          disabled={disabled}
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
          disabled={disabled}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refetchUser, logout, isEmailVerified } = useAuth();
  const { requestTwoFactor, TwoFactorModal } = useTwoFactorModal();
  const profileForm = useRef<HTMLFormElement>(null);
  const passwordForm = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => createProfileDraft(user));
  const [profileFeedback, setProfileFeedback] = useState<{
    state: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    state: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  useEffect(() => {
    if (user) setDraft((current) => syncProfileDraft(current, user));
  }, [user]);
  const dirty = profileHasChanges(draft);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFields) => {
      const token = user?.twoFactorEnabled
        ? await requestTwoFactor(profileForm.current)
        : undefined;
      if (user?.twoFactorEnabled && !token)
        throw new Error(
          "Verification cancelled. Your changes have not been saved.",
        );
      return UserService.updateMe(data, token || undefined).then(
        requireSuccess,
      );
    },
    onSuccess: (response, submitted) => {
      // Prefer normalized server fields. A subsequent user refetch merges only
      // untouched values, so restored sessions never overwrite draft edits.
      if (response.data) setDraft(createProfileDraft(response.data));
      else
        setDraft((current) => ({
          ...current,
          baseline: submitted,
          values: submitted,
        }));
      refetchUser();
      setProfileFeedback({
        state: "success",
        message: "Your profile changes are saved.",
      });
      toast.success("Profile updated successfully");
    },
  });
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const token = user?.twoFactorEnabled
        ? await requestTwoFactor(passwordForm.current)
        : undefined;
      if (user?.twoFactorEnabled && !token)
        throw new Error(
          "Verification cancelled. Your password has not changed.",
        );
      return UserService.changePassword(
        {
          passwordCurrent: data.currentPassword,
          password: data.newPassword,
          passwordConfirm: data.confirmPassword,
        },
        token || undefined,
      ).then(requireSuccess);
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFeedback({
        state: "success",
        message: "Your password has been changed.",
      });
      toast.success("Password changed successfully");
    },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const token = user?.twoFactorEnabled
        ? await requestTwoFactor()
        : undefined;
      if (user?.twoFactorEnabled && !token)
        throw new Error(
          "Verification cancelled. Your account was not deleted.",
        );
      return UserService.deleteMe(token || undefined).then(requireSuccess);
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      void logout();
    },
    onError: (error) => toast.error(error.message),
  });

  const profileBusy = updateProfileMutation.isPending;
  const anyBusy =
    profileBusy ||
    changePasswordMutation.isPending ||
    deleteAccountMutation.isPending;
  function editProfile(field: keyof ProfileFields, value: string) {
    setDraft((current) => ({
      ...current,
      values: { ...current.values, [field]: value },
    }));
    setProfileFeedback(null);
  }
  function editPassword(field: keyof typeof passwordData, value: string) {
    setPasswordData((current) => ({ ...current, [field]: value }));
    setPasswordFeedback(null);
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (anyBusy || !dirty) return;
    setProfileFeedback(null);
    try {
      await updateProfileMutation.mutateAsync(draft.values);
    } catch (error) {
      setProfileFeedback({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save your profile. Please try again.",
      });
    }
  }
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (anyBusy) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordFeedback({
        state: "error",
        message: "The new passwords do not match.",
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordFeedback({
        state: "error",
        message: "Use at least 8 characters for the new password.",
      });
      return;
    }
    setPasswordFeedback(null);
    try {
      await changePasswordMutation.mutateAsync(passwordData);
    } catch (error) {
      setPasswordFeedback({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to change your password. Please try again.",
      });
    }
  }
  const passwordMismatch =
    passwordFeedback?.state === "error" &&
    passwordData.newPassword !== passwordData.confirmPassword;
  return (
    <div className="forge-profile-page">
      <header className="forge-account-page-heading">
        <p className="forge-eyebrow">YOUR DETAILS. YOUR CONTROL.</p>
        <h1>Make it your account.</h1>
        <p>
          Manage your profile, review account protection and keep your next
          upgrade within reach.
        </p>
      </header>
      <div className="forge-account-overview">
        <div>
          <Mail size={21} />
          <span>Email status</span>
          <strong>
            {isEmailVerified ? "Verified" : "Verification pending"}
          </strong>
          {!isEmailVerified && (
            <Link href="/verify-email" prefetch={false}>
              Verify email <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
        <div>
          <Shield size={21} />
          <span>Account protection</span>
          <strong>
            {user?.twoFactorEnabled ? "2FA enabled" : "2FA not enabled"}
          </strong>
          <Link href="/profile/security" prefetch={false}>
            Security settings <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="forge-account-shortcuts">
        <Link href="/orders" prefetch={false}>
          <Package size={18} />
          <span>
            <strong>Your orders</strong>
            <small>Track purchases and open invoices</small>
          </span>
          <ArrowUpRight size={16} />
        </Link>
        <Link href="/addresses" prefetch={false}>
          <MapPin size={18} />
          <span>
            <strong>Delivery details</strong>
            <small>Manage your shipping addresses</small>
          </span>
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <section
        className="forge-account-panel"
        aria-labelledby="profile-details-title"
      >
        <div className="forge-account-panel-heading">
          <UserRound size={20} />
          <div>
            <h2 id="profile-details-title">Profile information</h2>
            <p>The name and phone number associated with your account.</p>
          </div>
        </div>
        <form
          ref={profileForm}
          onSubmit={saveProfile}
          tabIndex={-1}
          aria-labelledby="profile-details-title"
          data-auth-challenge-return
        >
          <div className="forge-account-form-grid">
            <div className="forge-account-field">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                required
                value={draft.values.name}
                onChange={(event) => editProfile("name", event.target.value)}
                disabled={anyBusy}
              />
            </div>
            <div className="forge-account-field">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                value={draft.values.phone}
                onChange={(event) => editProfile("phone", event.target.value)}
                placeholder="Your phone number"
                disabled={anyBusy}
              />
            </div>
            <div className="forge-account-field forge-account-field-wide">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={user?.email || ""}
                readOnly
                aria-describedby="profile-email-note"
              />
              <p id="profile-email-note">
                Email changes are not available from this profile.
              </p>
            </div>
          </div>
          <p className="forge-account-verification-note">
            <Shield size={15} />
            {user?.twoFactorEnabled
              ? "Your authenticator code will be requested when you save."
              : "Two-factor authentication is not enabled. Manage it in Security settings."}
          </p>
          {profileFeedback && (
            <p
              className={`forge-account-feedback is-${profileFeedback.state}`}
              role={profileFeedback.state === "error" ? "alert" : "status"}
            >
              {profileFeedback.state === "success" && (
                <CheckCircle2 size={16} />
              )}
              {profileFeedback.message}
            </p>
          )}
          <div className="forge-account-form-footer">
            <span role="status">
              {profileBusy
                ? "Saving your profile…"
                : dirty
                  ? "You have unsaved changes"
                  : "Your profile is up to date"}
            </span>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={anyBusy || !dirty}
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    values: { ...current.baseline },
                  }));
                  setProfileFeedback(null);
                }}
              >
                <RotateCcw size={15} /> Reset
              </Button>
              <Button type="submit" disabled={anyBusy || !dirty}>
                <Save size={16} />
                {profileBusy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </section>
      <section className="forge-account-panel" aria-labelledby="password-title">
        <div className="forge-account-panel-heading">
          <Shield size={20} />
          <div>
            <h2 id="password-title">Change password</h2>
            <p>Use a unique password with at least 8 characters.</p>
          </div>
        </div>
        <form
          ref={passwordForm}
          onSubmit={changePassword}
          tabIndex={-1}
          aria-labelledby="password-title"
          data-auth-challenge-return
        >
          <div className="forge-account-form-grid">
            <div className="forge-account-field-wide">
              <PasswordField
                id="currentPassword"
                label="Current password"
                value={passwordData.currentPassword}
                onChange={(value) => editPassword("currentPassword", value)}
                autoComplete="current-password"
                disabled={anyBusy}
              />
            </div>
            <PasswordField
              id="newPassword"
              label="New password"
              value={passwordData.newPassword}
              onChange={(value) => editPassword("newPassword", value)}
              autoComplete="new-password"
              minLength={8}
              disabled={anyBusy}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={passwordData.confirmPassword}
              onChange={(value) => editPassword("confirmPassword", value)}
              autoComplete="new-password"
              minLength={8}
              invalid={!!passwordMismatch}
              disabled={anyBusy}
            />
          </div>
          <p className="forge-account-verification-note">
            <Shield size={15} />
            {user?.twoFactorEnabled
              ? "Your authenticator code will be requested to change your password."
              : "Your current password verifies this change. Two-factor authentication is not enabled."}
          </p>
          {passwordFeedback && (
            <p
              id="password-feedback"
              className={`forge-account-feedback is-${passwordFeedback.state}`}
              role={passwordFeedback.state === "error" ? "alert" : "status"}
            >
              {passwordFeedback.state === "success" && (
                <CheckCircle2 size={16} />
              )}
              {passwordFeedback.message}
            </p>
          )}
          <div className="forge-account-form-footer">
            <span>Passwords are never saved as a device preference.</span>
            <Button type="submit" disabled={anyBusy}>
              {changePasswordMutation.isPending
                ? "Changing…"
                : "Change password"}
            </Button>
          </div>
        </form>
      </section>
      <section
        className="forge-account-panel forge-account-danger"
        aria-labelledby="account-delete-title"
      >
        <div className="forge-account-panel-heading">
          <Trash2 size={20} />
          <div>
            <h2 id="account-delete-title">Account deletion</h2>
            <p>
              Deleting your account cannot be undone. Review this carefully
              before continuing.
            </p>
          </div>
        </div>
        <p>
          {user?.twoFactorEnabled
            ? "Your authenticator code is required after confirming deletion."
            : "Two-factor authentication is not enabled on this account."}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={anyBusy}>
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete your CustomForge account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and cannot be undone.{" "}
                {user?.twoFactorEnabled
                  ? "You will also be asked for your authenticator code."
                  : "Cancel to keep your account."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my account</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteAccountMutation.mutate()}
              >
                Delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
      <TwoFactorModal />
    </div>
  );
}
