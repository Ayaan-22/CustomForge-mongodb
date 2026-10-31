"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /** Narrower reading width for forms / legal */
  variant?: "default" | "narrow";
};

export function PageShell({ children, className, variant = "default" }: PageShellProps) {
  return (
    <div
      className={cn(
        "w-full py-6 md:py-10",
        "min-h-[var(--cf-page-min-h,48vh)]",
        className
      )}
    >
      <div
        className={cn(
          "container mx-auto px-4 md:px-6",
          variant === "narrow" && "max-w-2xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}
