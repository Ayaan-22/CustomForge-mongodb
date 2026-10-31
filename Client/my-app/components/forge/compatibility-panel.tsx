"use client";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { useForgeStore, BUILD_SLOTS } from "@/lib/forge-store";
import {
  checkCompatibility,
  type CompatibilityCheck,
} from "@/lib/compatibility";
import type { Product } from "@/lib/types";
import { categoryFitsSlot } from "@/lib/builder-guidance";
import { cn } from "@/lib/utils";

export function CompatibilityResults({
  checks,
}: {
  checks: CompatibilityCheck[];
}) {
  return (
    <>
      {checks.map((check) => (
        <p className={cn("forge-check", `is-${check.state}`)} key={check.label}>
          {check.state === "pass" ? (
            <CheckCircle2 size={14} />
          ) : check.state === "conflict" ? (
            <AlertTriangle size={14} />
          ) : (
            <HelpCircle size={14} />
          )}
          <span>
            <strong>
              {check.label}:{" "}
              {check.state === "pass"
                ? "specifications match"
                : check.state === "conflict"
                  ? "conflict"
                  : "check required"}
            </strong>
            <br />
            {check.detail}
          </span>
        </p>
      ))}
    </>
  );
}
export function CompatibilityPanel({ product }: { product: Product }) {
  const build = useForgeStore((s) => s.build);
  const slot = BUILD_SLOTS.find((item) =>
    categoryFitsSlot(item, product.category),
  );
  if (!slot) return null;
  const checks = checkCompatibility({ ...build, [slot]: product });
  return (
    <section className="forge-compatibility">
      <h3>
        <Wrench size={17} />
        Will it fit your build?
      </h3>
      <p>
        {Object.values(build).filter(Boolean).length
          ? "Checking this part against your saved PC builder selections."
          : "Choose components in the PC builder to check them against this part."}
      </p>
      <CompatibilityResults checks={checks} />
      <p>
        BIOS support, connectors and physical clearances need manufacturer
        verification. These checks cover published specs only.
      </p>
      <Link href="/pc-builder" className="forge-text-link">
        Open your PC builder <ArrowRight size={15} />
      </Link>
    </section>
  );
}
