"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionBarProps = {
  children: ReactNode;
  className?: string;
};

/** Horizontal toolbar for filters, view toggles, or primary actions. */
export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}
