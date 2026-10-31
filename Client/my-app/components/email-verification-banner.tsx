"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AuthService } from "@/services/auth-service";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export function EmailVerificationBanner() {
  const { isAuthenticated, isEmailVerified, user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Don't show banner if not authenticated or already verified
  if (!isAuthenticated || isEmailVerified) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      const response = await AuthService.sendVerificationEmail();
      if (response.error) {
        setMessage({
          type: "error",
          text: response.error.message || "Failed to send verification email",
        });
      } else {
        setMessage({
          type: "success",
          text: "Verification email sent! Please check your inbox.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Please verify your email address
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                We sent a verification email to{" "}
                <span className="font-semibold">{user?.email}</span>. Verify
                your email to start shopping.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isResending}
            className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900/40"
          >
            {isResending ? "Sending..." : "Resend Email"}
          </Button>
        </div>

        {message && (
          <Alert
            className={`mt-3 ${
              message.type === "success"
                ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                : "bg-red-50 border-red-200 dark:bg-red-900/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                message.type === "success" ? "text-green-800" : "text-red-800"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
