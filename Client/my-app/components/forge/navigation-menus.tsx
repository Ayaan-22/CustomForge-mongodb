"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Cpu,
  Keyboard,
  Loader2,
  Wrench,
  GitCompareArrows,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  categoryGroups,
  categoryHref,
  type CategoryGroup,
  useNavigationCategories,
} from "./navigation-categories";

function CategoryLinks({
  groups,
  onSelect,
}: {
  groups: CategoryGroup[];
  onSelect: () => void;
}) {
  return groups.map((group) => (
    <section
      className="forge-mega-group"
      key={group.id}
      aria-label={group.label}
    >
      <h3>{group.label}</h3>
      <div className="forge-mega-links">
        {group.entries.map(({ category, label, detail, icon: Icon }) => (
          <Link
            href={categoryHref(category)}
            prefetch={false}
            onClick={onSelect}
            className="forge-mega-category"
            key={category}
          >
            <span className="forge-mega-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  ));
}

function CategoryStatus({
  status,
  retry,
}: {
  status: string;
  retry: () => void;
}) {
  if (status === "loading" || status === "idle")
    return (
      <div className="forge-navigation-status" role="status">
        <Loader2
          className="forge-search-spinner"
          size={19}
          aria-hidden="true"
        />{" "}
        Loading categories…
      </div>
    );
  if (status === "error")
    return (
      <div className="forge-navigation-status" role="status">
        <p>Categories couldn’t load.</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
        <Link href="/products" prefetch={false}>
          Browse all products
        </Link>
      </div>
    );
  return null;
}

export function NavigationMenus({
  routeKey,
  onOpen,
}: {
  routeKey: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState<"components" | "gear" | null>(null);
  const { categories, status, retry } = useNavigationCategories(open !== null);
  useEffect(() => setOpen(null), [routeKey]);
  return (
    <>
      {(["components", "gear"] as const).map((section) => {
        const isComponents = section === "components";
        const Icon = isComponents ? Cpu : Keyboard;
        const groups = categoryGroups(categories, section);
        return (
          <Popover
            key={section}
            open={open === section}
            onOpenChange={(next) => {
              setOpen(next ? section : null);
              if (next) onOpen?.();
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="forge-nav-link forge-mega-trigger"
              >
                <Icon size={15} aria-hidden="true" />
                {isComponents ? "PC components" : "Gaming gear"}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              aria-label={isComponents ? "PC components" : "Gaming gear"}
              align="start"
              sideOffset={1}
              collisionPadding={20}
              className="forge-mega-panel"
            >
              <div className="forge-mega-heading">
                <div>
                  <span className="forge-mega-kicker">
                    {isComponents
                      ? "ENGINEER YOUR ADVANTAGE"
                      : "MAKE THE SETUP YOURS"}
                  </span>
                  <h2>
                    {isComponents
                      ? "Every part. Your build."
                      : "Your next level of play."}
                  </h2>
                </div>
                <Link
                  href="/products"
                  prefetch={false}
                  onClick={() => setOpen(null)}
                >
                  Shop all <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <CategoryStatus status={status} retry={retry} />
              {status === "ready" && (
                <div className="forge-mega-layout">
                  <div className="forge-mega-columns">
                    <CategoryLinks
                      groups={groups}
                      onSelect={() => setOpen(null)}
                    />
                    {groups.length === 0 && (
                      <p className="forge-navigation-status">
                        Explore the full catalog for available categories.
                      </p>
                    )}
                  </div>
                  <Link
                    href={isComponents ? "/pc-builder" : "/compare"}
                    prefetch={false}
                    className="forge-mega-feature"
                    onClick={() => setOpen(null)}
                  >
                    {isComponents ? (
                      <Wrench size={35} aria-hidden="true" />
                    ) : (
                      <GitCompareArrows size={35} aria-hidden="true" />
                    )}
                    <span className="forge-mega-kicker">
                      {isComponents
                        ? "YOUR BUILD STARTS HERE"
                        : "CHOOSE WITH CONFIDENCE"}
                    </span>
                    <strong>
                      {isComponents
                        ? "Build it your way."
                        : "Find your better fit."}
                    </strong>
                    <p>
                      {isComponents
                        ? "Plan your parts, check compatibility and track your budget."
                        : "Put the specs side by side before your next upgrade."}
                    </p>
                    <span className="forge-mega-feature-action">
                      {isComponents ? "Open PC builder" : "Compare products"}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </span>
                  </Link>
                </div>
              )}
              <div className="forge-mega-footnote">
                Categories reflect the current catalog. Stock varies by product.
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}

export function MobileCategoryGroups({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: () => void;
}) {
  const { categories, status, retry } = useNavigationCategories(open);
  return (
    <Accordion type="single" collapsible className="forge-mobile-categories">
      {(["components", "gear"] as const).map((section) => (
        <AccordionItem value={section} key={section}>
          <AccordionTrigger className="forge-mobile-category-trigger">
            <span>
              {section === "components" ? (
                <Cpu size={18} aria-hidden="true" />
              ) : (
                <Keyboard size={18} aria-hidden="true" />
              )}
              {section === "components"
                ? "PC components"
                : "Gaming gear & play"}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CategoryStatus status={status} retry={retry} />
            {status === "ready" && (
              <CategoryLinks
                groups={categoryGroups(categories, section)}
                onSelect={onSelect}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
