"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeAuthenticationCode,
  validAuthenticationCode,
} from "@/lib/email-verification";
import {
  captureChallengeReturnFocus,
  restoreChallengeReturnFocus,
  type ChallengeReturnFocus,
} from "@/lib/challenge-focus";
import "@/app/forge-auth.css";

type TwoFactorModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onRestoreFocus?: (closingDialog: HTMLElement | null) => void;
  title?: string;
  description?: string;
};

export function TwoFactorModal({
  open,
  onClose,
  onSuccess,
  onRestoreFocus,
  title = "Confirm it's you.",
  description = "Enter your authenticator code to continue with this protected action.",
}: TwoFactorModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const codeId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const dialogElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      submitting.current = false;
    }
  }, [open]);

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!validAuthenticationCode(code)) {
      setError("Enter the six-digit code from your authenticator app.");
      codeRef.current?.focus();
      return;
    }
    submitting.current = true;
    setError(null);
    try {
      // The protected operation validates the code. Enrollment is not a challenge API.
      onSuccess(code);
      setCode("");
    } catch {
      setError("Unable to continue. Please try again.");
      codeRef.current?.focus();
    } finally {
      submitting.current = false;
    }
  };

  const handleClose = () => {
    setCode("");
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent
        ref={(element) => {
          // Keep the closing element available after Radix removes its focus scope.
          if (element) dialogElement.current = element;
        }}
        className="forge-auth-modal sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          codeRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!onRestoreFocus) return;
          event.preventDefault();
          onRestoreFocus(dialogElement.current);
        }}
      >
        <DialogHeader>
          <div className="forge-auth-modal-icon">
            <ShieldCheck aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="forge-auth-form" onSubmit={handleContinue} noValidate>
          <div className="forge-auth-field">
            <Label htmlFor={codeId}>Authenticator code</Label>
            <Input
              ref={codeRef}
              id={codeId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(event) => {
                setCode(normalizeAuthenticationCode(event.target.value));
                setError(null);
              }}
              className="forge-auth-otp"
              aria-invalid={Boolean(error)}
              aria-describedby={
                codeId + "-help" + (error ? " " + codeId + "-error" : "")
              }
            />
            <p id={codeId + "-help"} className="forge-auth-field-help">
              Use the current six-digit code from your authenticator app. The
              protected action confirms it when you continue.
            </p>
            {error && (
              <p
                id={codeId + "-error"}
                role="alert"
                className="forge-auth-field-error"
              >
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="forge-auth-submit"
              disabled={!validAuthenticationCode(code)}
            >
              Continue <ArrowRight aria-hidden="true" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Keep the bound component stable during a parent rerender so typing is preserved.
// Only the open/closed boundary remounts the challenge and clears its credentials.
export function useTwoFactorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const resolveCallback = useRef<((token: string | null) => void) | null>(null);
  const returnFocus = useRef<ChallengeReturnFocus | null>(null);

  const requestTwoFactor = useCallback(
    (fallback?: HTMLElement | null): Promise<string | null> => {
      if (resolveCallback.current) return Promise.resolve(null);
      returnFocus.current =
        typeof document === "undefined"
          ? null
          : captureChallengeReturnFocus(document, fallback);
      return new Promise((resolve) => {
        resolveCallback.current = resolve;
        setIsOpen(true);
      });
    },
    [],
  );

  const handleSuccess = useCallback((token: string) => {
    const resolve = resolveCallback.current;
    resolveCallback.current = null;
    setIsOpen(false);
    resolve?.(token);
  }, []);

  const handleClose = useCallback(() => {
    const resolve = resolveCallback.current;
    resolveCallback.current = null;
    setIsOpen(false);
    resolve?.(null);
  }, []);

  useEffect(
    () => () => {
      resolveCallback.current?.(null);
      resolveCallback.current = null;
      returnFocus.current = null;
    },
    [],
  );

  const BoundTwoFactorModal = useCallback(() => {
    // Bind this opening's target; an older close cannot consume a newer challenge.
    const snapshot = returnFocus.current;
    return (
      <TwoFactorModal
        open={isOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onRestoreFocus={(closingDialog) => {
          if (returnFocus.current === snapshot) returnFocus.current = null;
          if (snapshot) restoreChallengeReturnFocus(snapshot, closingDialog);
        }}
      />
    );
  }, [isOpen, handleClose, handleSuccess]);

  return { isOpen, requestTwoFactor, TwoFactorModal: BoundTwoFactorModal };
}
