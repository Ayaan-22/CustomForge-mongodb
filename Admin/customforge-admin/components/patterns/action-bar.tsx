"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionBarProps = {
  children: ReactNode;
  className?: string;
  layout?: "filters" | "split";
};

export function ActionBar({ children, className, layout = "split" }: ActionBarProps) {
  return (
    <div
      className={cn(
        "fa-toolbar",
        layout === "filters" && "fa-toolbar-filters",
        className
      )}
    >
      {children}
    </div>
  );
}
