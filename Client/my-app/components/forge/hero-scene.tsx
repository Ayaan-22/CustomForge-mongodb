"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/** Decorative effects use native observers so the hero never waits for animation code. */
function useShowcaseMotion(
  target: React.RefObject<HTMLDivElement | null>,
  mode: "hero" | "build",
) {
  useEffect(() => {
    const element = target.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 768px)");
    let visible = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!visible || preference.matches || !desktop.matches) return;
      if (mode === "hero") {
        element.style.setProperty(
          "--forge-hero-offset",
          `${Math.min(window.scrollY, 700) * 0.1}px`,
        );
      } else {
        const rect = element.getBoundingClientRect();
        const progress = Math.max(
          0,
          Math.min(
            1,
            (window.innerHeight - rect.top) /
              (window.innerHeight + rect.height),
          ),
        );
        element.style.setProperty("--forge-build-progress", String(progress));
      }
    };
    const schedule = () => {
      if (!frame && visible && !preference.matches && desktop.matches)
        frame = requestAnimationFrame(update);
    };
    const reset = () => {
      element.style.removeProperty("--forge-hero-offset");
      element.style.removeProperty("--forge-build-progress");
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", reset);
    desktop.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", reset);
      desktop.removeEventListener("change", reset);
      element.style.removeProperty("--forge-hero-offset");
      element.style.removeProperty("--forge-build-progress");
    };
  }, [target, mode]);
}

export function HeroScene() {
  const target = useRef<HTMLDivElement>(null);
  useShowcaseMotion(target, "hero");
  const [reduced, setReduced] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const source = process.env.NEXT_PUBLIC_HERO_VIDEO;
  useEffect(() => {
    if (!source) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, [source]);
  useEffect(() => {
    if (!video.current) return;
    const element = video.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [source, reduced, failed]);
  return (
    <div ref={target} className="forge-hero-media">
      <div className="forge-hero-art absolute inset-0">
        <Image
          src="/custom-gaming-pc-hero-image.jpg"
          alt="RGB gaming PC lit in cyan and violet"
          fill
          priority
          fetchPriority="high"
          decoding="sync"
          quality={60}
          sizes="(max-width: 768px) 100vw, 65vw"
          className="object-cover"
        />
        {source && reduced === false && !failed && (
          <video
            ref={video}
            src={source}
            poster="/custom-gaming-pc-hero-image.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="forge-hero-image-shade" />
    </div>
  );
}

export function BuildStory({ children }: { children: React.ReactNode }) {
  const target = useRef<HTMLDivElement>(null);
  useShowcaseMotion(target, "build");
  return (
    <div ref={target} className="forge-build-story">
      <div className="forge-build-banner">
        {children}
        <i className="forge-build-scrub" aria-hidden="true" />
      </div>
    </div>
  );
}
