"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "fa-state",
        className
      )}
    >
      {icon ? <div className="fa-state-icon" aria-hidden>{icon}</div> : null}
      <h2 className="fa-state-title">{title}</h2>
      {description ? (
        <p>{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
