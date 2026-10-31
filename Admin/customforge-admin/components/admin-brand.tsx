import { cn } from "@/lib/utils";

/** Inline vector keeps the admin wordmark sharp without an image request. */
export function AdminBrand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <span className={cn("fa-brand", className)}>
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M11 5H33L29 12H15L10 20H21L17 27H7L4 32H0L11 5Z" fill="currentColor"/><path d="M27 14H34L23 32H15L19 25H23L27 14Z" fill="currentColor" opacity=".5"/></svg>
    {!compact && <span>Custom<span>Forge</span><small>ADMIN WORKSPACE</small></span>}
  </span>;
}
