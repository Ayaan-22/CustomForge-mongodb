"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, RotateCw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "fa-state is-error",
        className
      )}
    >
      <div className="fa-state-icon"><AlertCircle className="size-6" aria-hidden /></div>
      <h2 className="fa-state-title">{title}</h2>
      <p>{message}</p>
      {children}
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-6" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
