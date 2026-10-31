"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, Wrench } from "lucide-react";
import type { CompatibilityCheck } from "@/lib/compatibility";
import type { BuildSlot } from "@/lib/forge-store";
import { guidanceForCheck } from "@/lib/builder-guidance";

export function BuilderCompatibility({
  checks,
  onEdit,
  disabled,
}: {
  checks: CompatibilityCheck[];
  onEdit: (slot: BuildSlot) => void;
  disabled: boolean;
}) {
  const conflicts = checks.filter((check) => check.state === "conflict").length;
  const unknown = checks.filter((check) => check.state === "unknown").length;
  const matched = checks.length - conflicts - unknown;
  return (
    <section
      className="forge-builder-checks"
      aria-labelledby="builder-checks-title"
    >
      <h3 id="builder-checks-title">
        <Wrench size={16} /> Compatibility review
      </h3>
      <p className="forge-builder-check-counts" aria-live="polite">
        {checks.length
          ? `${matched} spec matches · ${conflicts} conflicts · ${unknown} checks need data`
          : "Choose related parts to begin the checks."}
      </p>
      {checks.map((check) => {
        const guidance = guidanceForCheck(check);
        const Icon =
          check.state === "pass"
            ? CheckCircle2
            : check.state === "conflict"
              ? AlertTriangle
              : HelpCircle;
        return (
          <details
            key={check.label}
            className={`forge-builder-check is-${check.state}`}
            open={check.state === "conflict" ? true : undefined}
          >
            <summary>
              <Icon size={16} />
              <span>
                <strong>{check.label}</strong>
                <small>
                  {check.state === "pass"
                    ? "Published specs match"
                    : check.state === "conflict"
                      ? "Conflict — review parts"
                      : "Missing data — verify manually"}
                </small>
              </span>
            </summary>
            <p>{check.detail}</p>
            <p>{guidance.detail}</p>
            {guidance.slots.length > 0 && (
              <div className="forge-builder-check-actions">
                {guidance.slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(slot)}
                  >
                    Review {slot}
                  </button>
                ))}
              </div>
            )}
          </details>
        );
      })}
      <p className="forge-builder-manual-note">
        This tool cannot certify a build. BIOS / CPU support, board and radiator
        fit, storage lanes, PSU connectors and mounting hardware need
        manufacturer verification.
      </p>
    </section>
  );
}
