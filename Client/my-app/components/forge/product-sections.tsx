"use client";
import "@/app/forge-detail.css";

import { useEffect, useRef, useState } from "react";

type Section = { id: string; label: string };

/** Anchors stay usable without JavaScript; observers only enhance the active state. */
export function ProductSections({ sections }: { sections: Section[] }) {
  const nav = useRef<HTMLElement>(null);
  const [active, setActive] = useState("overview");
  const signature = sections.map(({ id }) => id).join(",");
  useEffect(() => {
    const wrapper = nav.current?.closest<HTMLElement>(".forge-product-detail");
    const header = document.querySelector<HTMLElement>(".forge-header");
    if (!wrapper || !header) return;
    const measure = () =>
      wrapper.style.setProperty(
        "--forge-header-size",
        `${header.getBoundingClientRect().height}px`,
      );
    measure();
    const size = new ResizeObserver(measure);
    size.observe(header);
    return () => size.disconnect();
  }, []);
  useEffect(() => {
    const elements = signature
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => !!element);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Overview encloses the detail layout, so a visible child section takes priority.
        const current = elements
          .filter((element) => visible.has(element.id))
          .at(-1);
        if (current) setActive(current.id);
      },
      { rootMargin: "-25% 0px -50% 0px", threshold: 0 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [signature]);
  return (
    <nav
      ref={nav}
      className="forge-product-sections"
      aria-label="Product sections"
    >
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "location" : undefined}
          onClick={() => setActive(id)}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
