"use client";

import { useEffect, useRef, useState } from "react";

/** Mount shopping widgets just before they enter view, keeping hero startup light. */
export function DeferredSection({
  children,
  fallback,
  className,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!target.current) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(target.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={target}
      className={className}
      data-forge-deferred={ready ? undefined : "pending"}
    >
      {ready ? children : fallback}
    </div>
  );
}
