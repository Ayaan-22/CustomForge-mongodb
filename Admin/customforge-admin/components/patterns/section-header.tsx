"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  actions,
  eyebrow = "CustomForge workspace",
  icon,
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "fa-page-header",
        className
      )}
    >
      <div className="fa-page-header-copy">
        {eyebrow ? <span className="fa-kicker">{eyebrow}</span> : null}
        <h1 className="flex items-center gap-3">
          {icon ? <span className="fa-page-heading-icon" aria-hidden>{icon}</span> : null}
          {title}
        </h1>
        {description ? (
          <p>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="fa-page-header-actions">{actions}</div>
      ) : null}
    </header>
  );
}
