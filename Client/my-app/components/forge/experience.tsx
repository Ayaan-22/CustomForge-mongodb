"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Brand } from "./brand";
import { useForgeStore } from "@/lib/forge-store";
import RouteLoading from "./route-loading";

export function StoreExperience({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [initialPath] = useState(pathname);
  const [boot, setBoot] = useState(false);
  useEffect(() => {
    void useForgeStore.persist.rehydrate();
    try {
      if (!sessionStorage.getItem("customforge-boot")) {
        sessionStorage.setItem("customforge-boot", "1");
        setBoot(true);
        const timer = setTimeout(() => setBoot(false), 1100);
        return () => clearTimeout(timer);
      }
    } catch {
      /* Shopping works when storage is unavailable. */
    }
  }, []);
  return (
    <>
      {boot && (
        <div className="forge-boot" role="status">
          <Brand compact />
          <div>
            <span>FORGE SYSTEMS ONLINE</span>
            <div className="forge-boot-track">
              <i />
            </div>
          </div>
          <button
            onClick={() => setBoot(false)}
            aria-label="Dismiss welcome animation"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div
        key={pathname}
        className={pathname === initialPath ? undefined : "forge-route-entry"}
      >
        {pathname === "/" ? (
          children
        ) : (
          <Suspense fallback={<RouteLoading />}>{children}</Suspense>
        )}
      </div>
    </>
  );
}

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = target.current;
    if (!element || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    let initialEntry = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Leave every section untouched during startup. Only a later viewport
        // entry adds motion, avoiding both synchronous rect reads and off-screen
        // style changes while the hero paints.
        if (initialEntry) {
          initialEntry = false;
          if (
            entry.isIntersecting ||
            entry.boundingClientRect.top < window.innerHeight
          )
            observer.disconnect();
          return;
        }
        if (entry.isIntersecting) {
          element.classList.add("forge-reveal-enter");
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={target} className={className}>
      {children}
    </div>
  );
}
