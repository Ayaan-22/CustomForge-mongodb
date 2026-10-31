import { toast } from "@/hooks/use-toast";
import type { ApiError } from "./apiClient";

/**
 * Display an error message using toast notifications
 */
export function showError(error: ApiError | Error | string) {
  let message: string;

  if (typeof error === "string") {
    message = error;
  } else if ("message" in error) {
    message = error.message;
  } else {
    message = "An unexpected error occurred";
  }

  toast({
    variant: "destructive",
    title: "Error",
    description: message,
  });
}

/**
 * Display a success message using toast notifications
 */
export function showSuccess(message: string, _description?: string) {
  toast({
    title: "Success",
    description: message,
  });
}

/**
 * Display an info message using toast notifications
 */
export function showInfo(message: string, _description?: string) {
  toast({
    title: "Info",
    description: message,
  });
}

/**
 * Display a warning message using toast notifications
 */
export function showWarning(message: string, _description?: string) {
  toast({
    variant: "destructive",
    title: "Warning",
    description: message,
  });
}
