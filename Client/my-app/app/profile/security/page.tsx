"use client";
import "@/app/forge-security.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Smartphone,
  Check,
  ArrowRight,
  LockKeyhole,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useAuthStore } from "@/lib/auth-store";
import { AuthService } from "@/services/auth-service";
import { UserService } from "@/services/user-service";
import { requireSuccess } from "@/lib/query-result";
import {
  changeAndConfirmSecurity,
  confirmedSecurityUser,
  confirmSecurityStatus,
  manualSetupKey,
  normalizeSecurityCode,
  securityAction,
  securityRequestData,
  validateSecurityInput,
  type SecuritySetupStage,
} from "@/lib/security-setup";

export default function SecurityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<SecuritySetupStage>("idle");
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState<string>();
  const [expectedEnabled, setExpectedEnabled] = useState<boolean>();
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    token?: string;
  }>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const actionLock = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ownerRef = useRef(user?.id);
  useEffect(() => {
    ownerRef.current = user?.id;
    setStage("idle");
    setPassword("");
    setToken("");
    setSecret(undefined);
    setExpectedEnabled(undefined);
    setFieldErrors({});
    setError("");
    setSuccess("");
  }, [user?.id]);
  useEffect(() => {
    if (stage === "password" || stage === "disable")
      passwordRef.current?.focus();
    else if (stage === "confirm") tokenRef.current?.focus();
    else if (stage === "key" || stage === "refresh")
      headingRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (pending || !error) return;
    if (stage === "password") passwordRef.current?.focus();
    else if (stage === "confirm" || stage === "disable")
      tokenRef.current?.focus();
    else if (stage === "refresh") headingRef.current?.focus();
  }, [error, pending, stage]);
  const enabled = user?.twoFactorEnabled === true;
  const statusKnown = typeof user?.twoFactorEnabled === "boolean";
  const sameAccount = (owner: string) =>
    ownerRef.current === owner && useAuthStore.getState().user?.id === owner;
  const message = (failure: unknown) =>
    failure instanceof Error
      ? failure.message
      : "The request couldn’t complete. Try again.";
  function reset() {
    setStage("idle");
    setPassword("");
    setToken("");
    setSecret(undefined);
    setFieldErrors({});
    setError("");
    setSuccess("");
    setExpectedEnabled(undefined);
  }
  function start(next: "password" | "disable") {
    reset();
    setStage(next);
  }
  async function refreshAccount(owner: string) {
    // The existing authenticated-user query updates the shared account context.
    // A direct result lets this page distinguish failures from confirmed status.
    return queryClient.fetchQuery({
      queryKey: ["me", owner],
      queryFn: () => UserService.me().then(requireSuccess),
      staleTime: 0,
    });
  }
  function acceptConfirmed(
    owner: string,
    confirmed: ReturnType<typeof confirmSecurityStatus>,
  ) {
    if (!sameAccount(owner)) return;
    useAuthStore.getState().updateUser(confirmed);
    setExpectedEnabled(undefined);
    setStage("idle");
    setSuccess(
      `Two-factor authentication ${confirmed.twoFactorEnabled ? "enabled" : "disabled"}. Your account status is confirmed.`,
    );
  }
  async function beginSetup(event: FormEvent) {
    event.preventDefault();
    const errors = validateSecurityInput(password);
    setFieldErrors(errors);
    setError("");
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }
    if (actionLock.current || !user) return;
    actionLock.current = true;
    const owner = user.id;
    try {
      await securityAction(setPending, async () => {
        const data = securityRequestData(
          await AuthService.enable2fa({ password }),
        );
        const key = manualSetupKey(data);
        if (!sameAccount(owner)) return;
        setSecret(key);
        setPassword("");
        setToken("");
        setStage("key");
      });
    } catch (failure) {
      if (sameAccount(owner)) {
        setError(message(failure));
        passwordRef.current?.focus();
      }
    } finally {
      actionLock.current = false;
    }
  }
  async function finishChange(event: FormEvent, disabling = false) {
    event.preventDefault();
    const errors = validateSecurityInput(
      disabling ? password : undefined,
      token,
    );
    setFieldErrors(errors);
    setError("");
    if (errors.password || errors.token) {
      (errors.password ? passwordRef : tokenRef).current?.focus();
      return;
    }
    if (actionLock.current || !user || (!disabling && !secret)) return;
    actionLock.current = true;
    const owner = user.id;
    const expected = !disabling;
    try {
      await securityAction(setPending, async () => {
        // Store no optimistic enabled flag. Only a fresh /users/me response
        // may confirm the actual account state after the mutation is accepted.
        const result = await changeAndConfirmSecurity(
          () =>
            disabling
              ? AuthService.disable2fa({
                  password,
                  token: normalizeSecurityCode(token),
                })
              : AuthService.verify2fa({ token: normalizeSecurityCode(token) }),
          async () => {
            if (sameAccount(owner)) {
              setSecret(undefined);
              setPassword("");
              setToken("");
              setExpectedEnabled(expected);
              setStage("refresh");
            }
            return refreshAccount(owner);
          },
          owner,
          expected,
        );
        if (!sameAccount(owner)) return;
        if (result.confirmed) acceptConfirmed(owner, result.user);
        else {
          setError(result.message);
          setStage("refresh");
        }
      });
    } catch (failure) {
      if (sameAccount(owner)) {
        setError(message(failure));
        tokenRef.current?.focus();
      }
    } finally {
      actionLock.current = false;
    }
  }
  async function retryStatus() {
    if (actionLock.current || !user) return;
    actionLock.current = true;
    const owner = user.id;
    setError("");
    try {
      await securityAction(setPending, async () => {
        const response = await refreshAccount(owner);
        const confirmed =
          expectedEnabled === undefined
            ? confirmedSecurityUser(response, owner)
            : confirmSecurityStatus(response, owner, expectedEnabled);
        acceptConfirmed(owner, confirmed);
      });
    } catch (failure) {
      if (sameAccount(owner)) setError(message(failure));
    } finally {
      actionLock.current = false;
    }
  }
  if (!user) return null;
  const setupStep =
    stage === "password"
      ? 0
      : stage === "key"
        ? 1
        : stage === "confirm"
          ? 2
          : -1;
  return (
    <div className="forge-security-page">
      <header className="forge-security-heading">
        <p className="forge-eyebrow">
          <ShieldCheck size={16} /> ACCOUNT DEFENSE
        </p>
        <h1>Protect your command center.</h1>
        <p>
          Manage your password and add an authenticator check to your sign-in.
        </p>
      </header>
      <section
        className="forge-security-panel"
        aria-labelledby="two-factor-heading"
      >
        <div className="forge-security-overview">
          <div className="forge-security-icon">
            <Shield size={25} />
          </div>
          <div>
            <h2 id="two-factor-heading">Two-factor authentication</h2>
            <p>
              Your password plus a time-based code from your authenticator app.
            </p>
          </div>
          <span
            className={`forge-security-status ${enabled ? "is-enabled" : ""}`}
          >
            <i />
            {stage === "refresh"
              ? "Status refresh pending"
              : !statusKnown
                ? "Status unconfirmed"
                : enabled
                  ? "Enabled"
                  : "Not enabled"}
          </span>
        </div>
        {stage === "idle" ? (
          <div className="forge-security-intro">
            <p>
              {!statusKnown
                ? "Your current account response did not include a two-factor status. Refresh it before starting a security change."
                : enabled
                  ? "Your account currently requires an authenticator code. Keep access to the app when changing your account settings."
                  : "Use an authenticator app to generate a fresh six-digit sign-in code. Setup is complete only after the server verifies your first code."}
            </p>
            {statusKnown ? (
              <Button
                onClick={() => start(enabled ? "disable" : "password")}
                variant={enabled ? "outline" : "default"}
              >
                {enabled
                  ? "Manage two-factor authentication"
                  : "Set up authenticator"}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={pending}
                onClick={retryStatus}
              >
                <RefreshCw
                  className={pending ? "forge-security-spinner" : ""}
                  size={16}
                />
                {pending ? "Refreshing account…" : "Refresh status"}
              </Button>
            )}
          </div>
        ) : (
          <div className="forge-security-flow">
            {setupStep >= 0 && (
              <ol
                className="forge-security-steps"
                aria-label="Authenticator setup progress"
              >
                {["Confirm password", "Add your key", "Verify code"].map(
                  (label, index) => (
                    <li
                      key={label}
                      className={index <= setupStep ? "is-reached" : ""}
                      aria-current={index === setupStep ? "step" : undefined}
                    >
                      <span>
                        {index < setupStep ? <Check size={14} /> : index + 1}
                      </span>
                      {label}
                    </li>
                  ),
                )}
              </ol>
            )}
            {stage === "password" && (
              <form onSubmit={beginSetup} noValidate aria-busy={pending}>
                <h3>First, confirm it’s you.</h3>
                <p>
                  Enter your current password to request a new authenticator
                  setup key.
                </p>
                <div className="forge-security-field">
                  <Label htmlFor="security-password">Current password</Label>
                  <Input
                    ref={passwordRef}
                    id="security-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors({});
                    }}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password
                        ? "security-password-error"
                        : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <p
                      id="security-password-error"
                      className="forge-security-field-error"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                <div className="forge-security-actions">
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <RefreshCw
                          className="forge-security-spinner"
                          size={16}
                        />
                        Requesting key…
                      </>
                    ) : (
                      <>
                        Continue to setup
                        <KeyRound size={16} />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={reset}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {stage === "key" && (
              <div>
                <h3 ref={headingRef} tabIndex={-1}>
                  Add this account to your app.
                </h3>
                <p>
                  In your authenticator app, choose manual entry. Use{" "}
                  <strong>CustomForge</strong> as the account name, choose a{" "}
                  <strong>time-based</strong> key, and enter the setup key
                  below.
                </p>
                <div className="forge-security-key">
                  <span>MANUAL SETUP KEY</span>
                  <code>{secret}</code>
                  <small>
                    This key is only displayed during this setup. Keep it
                    private.
                  </small>
                </div>
                <div className="forge-security-actions">
                  <Button
                    onClick={() => {
                      setToken("");
                      setFieldErrors({});
                      setError("");
                      setStage("confirm");
                    }}
                  >
                    I’ve added the key
                    <ArrowRight size={16} />
                  </Button>
                  <Button type="button" variant="ghost" onClick={reset}>
                    Cancel setup
                  </Button>
                </div>
                <p className="forge-security-footnote">
                  Canceling closes this setup screen. It does not enable
                  two-factor authentication; request a new key when you start
                  again.
                </p>
              </div>
            )}
            {stage === "confirm" && (
              <form
                onSubmit={(event) => finishChange(event)}
                noValidate
                aria-busy={pending}
              >
                <h3>Confirm your first code.</h3>
                <p>
                  Enter the current six-digit code from the CustomForge entry in
                  your authenticator app.
                </p>
                <div className="forge-security-field">
                  <Label htmlFor="security-code">Authenticator code</Label>
                  <Input
                    ref={tokenRef}
                    id="security-code"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={12}
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value);
                      setFieldErrors({});
                    }}
                    disabled={pending}
                    placeholder="000000"
                    className="forge-security-code"
                    aria-invalid={Boolean(fieldErrors.token)}
                    aria-describedby={`security-code-hint${fieldErrors.token ? " security-code-error" : ""}`}
                  />
                  <p id="security-code-hint">
                    Use a fresh code if the current one is about to expire.
                  </p>
                  {fieldErrors.token && (
                    <p
                      id="security-code-error"
                      className="forge-security-field-error"
                    >
                      {fieldErrors.token}
                    </p>
                  )}
                </div>
                <div className="forge-security-actions">
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <RefreshCw
                          className="forge-security-spinner"
                          size={16}
                        />
                        Verifying code…
                      </>
                    ) : (
                      <>
                        Verify and enable
                        <ShieldCheck size={16} />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFieldErrors({});
                      setError("");
                      setStage("key");
                    }}
                    disabled={pending}
                  >
                    Back to key
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={reset}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {stage === "disable" && (
              <form
                onSubmit={(event) => finishChange(event, true)}
                noValidate
                aria-busy={pending}
              >
                <h3>Turn off authenticator checks?</h3>
                <p>
                  Your password and current authenticator code confirm this
                  change. Your account will then use password sign-in without
                  the extra code.
                </p>
                <div className="forge-security-field">
                  <Label htmlFor="security-password">Current password</Label>
                  <Input
                    ref={passwordRef}
                    id="security-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors({});
                    }}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password
                        ? "security-password-error"
                        : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <p
                      id="security-password-error"
                      className="forge-security-field-error"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                <div className="forge-security-field">
                  <Label htmlFor="security-code">Authenticator code</Label>
                  <Input
                    ref={tokenRef}
                    id="security-code"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={12}
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value);
                      setFieldErrors({});
                    }}
                    disabled={pending}
                    placeholder="000000"
                    className="forge-security-code"
                    aria-invalid={Boolean(fieldErrors.token)}
                    aria-describedby={
                      fieldErrors.token ? "security-code-error" : undefined
                    }
                  />
                  {fieldErrors.token && (
                    <p
                      id="security-code-error"
                      className="forge-security-field-error"
                    >
                      {fieldErrors.token}
                    </p>
                  )}
                </div>
                <div className="forge-security-actions">
                  <Button type="submit" variant="outline" disabled={pending}>
                    {pending ? (
                      <>
                        <RefreshCw
                          className="forge-security-spinner"
                          size={16}
                        />
                        Confirming change…
                      </>
                    ) : (
                      "Disable two-factor authentication"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={reset}
                    disabled={pending}
                  >
                    Keep enabled
                  </Button>
                </div>
              </form>
            )}
            {stage === "refresh" && (
              <div aria-busy={pending}>
                <h3 ref={headingRef} tabIndex={-1}>
                  Confirming your account status.
                </h3>
                <p>
                  The server accepted your request. We’re refreshing your
                  account to confirm its current two-factor authentication
                  state.
                </p>
                <div className="forge-security-actions">
                  <Button
                    variant="outline"
                    onClick={retryStatus}
                    disabled={pending}
                  >
                    <RefreshCw
                      className={pending ? "forge-security-spinner" : ""}
                      size={16}
                    />
                    {pending ? "Refreshing account…" : "Refresh status"}
                  </Button>
                </div>
                <p className="forge-security-footnote">
                  Another security change is paused until the status can be
                  confirmed. Your setup key and entered credentials have been
                  cleared.
                </p>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="forge-security-feedback is-error" role="alert">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="forge-security-feedback" role="status">
            <ShieldCheck size={18} />
            <p>{success}</p>
          </div>
        )}
      </section>
      <section
        className="forge-security-password-panel"
        aria-labelledby="password-heading"
      >
        <LockKeyhole size={24} />
        <div>
          <h2 id="password-heading">Your password. Your first defense.</h2>
          <p>
            Update your account password through the existing secure
            password-change flow.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/profile/change-password" prefetch={false}>
            Change password
            <ArrowRight size={15} />
          </Link>
        </Button>
      </section>
      <aside className="forge-security-guidance">
        <Smartphone size={21} />
        <div>
          <h2>Keep your authenticator within reach.</h2>
          <p>
            Codes are generated by your app and change regularly. Setup and
            status confirmation require a current account session. No backup
            codes are issued by this flow.
          </p>
        </div>
      </aside>
    </div>
  );
}
