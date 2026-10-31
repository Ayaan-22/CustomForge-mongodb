"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
  className?: string;
  variant?: "default" | "narrow";
};

export function PageShell({ children, className, variant = "default", ...props }: PageShellProps) {
  return (
    <div
      data-slot="admin-page"
      className={cn(
        "fa-page-shell",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "fa-page-shell-inner",
          variant === "narrow" && "is-narrow"
        )}
      >
        {children}
      </div>
    </div>
  );
}
