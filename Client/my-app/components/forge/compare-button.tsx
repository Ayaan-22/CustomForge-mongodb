"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompareArrows, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useForgeStore } from "@/lib/forge-store";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function CompareButton({
  product,
  label = false,
}: {
  product: Product;
  label?: boolean;
}) {
  const comparison = useForgeStore((s) => s.comparison);
  const toggle = useForgeStore((s) => s.toggleCompare);
  const selected = comparison.some((p) => p.id === product.id);
  return (
    <Button
      variant="outline"
      size={label ? "default" : "icon"}
      className={selected ? "border-primary text-primary" : ""}
      aria-label={`${selected ? "Remove" : "Compare"} ${product.name}${selected ? " from comparison" : ""}`}
      aria-pressed={selected}
      onClick={() => {
        if (!selected && comparison.length >= 4) {
          toast.info(
            "Your comparison is full. Remove a product to add another.",
          );
          return;
        }
        toggle(product);
      }}
    >
      <GitCompareArrows size={16} />
      {label && (selected ? "Added to compare" : "Compare")}
    </Button>
  );
}

export function ComparisonDock() {
  const pathname = usePathname();
  const comparison = useForgeStore((s) => s.comparison);
  const clear = useForgeStore((s) => s.clearComparison);
  // Keep purchase and authentication controls clear without changing saved comparisons.
  if (
    !comparison.length ||
    pathname === "/compare" ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/orders") ||
    ["/login", "/register", "/forgot-password"].includes(pathname) ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/verify-email")
  )
    return null;
  return (
    <div className="forge-compare-dock" aria-label="Product comparison">
      <GitCompareArrows size={20} className="text-primary" />
      <div>
        <strong>{comparison.length}/4 selected</strong>
        <span className="hidden sm:block text-xs text-muted-foreground">
          Find your perfect upgrade
        </span>
      </div>
      <Button asChild size="sm">
        <Link href="/compare" prefetch={false}>
          Compare <ArrowRight />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={clear}
        aria-label="Clear comparison"
      >
        <X />
      </Button>
    </div>
  );
}
