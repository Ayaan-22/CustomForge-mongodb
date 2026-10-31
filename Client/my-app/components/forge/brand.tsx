import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("forge-brand", className)}>
      <svg
        className="forge-mark"
        width="35"
        height="35"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9 5h25l-5 8H16l-4 7h12l-5 8H8l-4 7H0L9 5Z"
          fill="currentColor"
        />
        <path
          d="m27 19 8-14h5L25 35H13l5-8h5l4-8Z"
          fill="currentColor"
          opacity=".55"
        />
      </svg>
      {!compact && (
        <span>
          Custom<span className="text-primary">Forge</span>
          <span className="forge-wordmark-dot">.</span>
        </span>
      )}
    </span>
  );
}
