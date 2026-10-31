"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { buildBudgetStatus, parseBuildBudget } from "@/lib/builder-guidance";
import { formatPrice } from "@/lib/format";

const BUDGET_KEY = "customforge-build-budget-usd-v1";

export function BuilderBudget({ total }: { total: number }) {
  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BUDGET_KEY) || "";
      if (!parseBuildBudget(saved).error) setValue(saved);
    } catch {
      // Planning remains usable if this browser blocks storage.
    }
    setReady(true);
  }, []);
  const parsed = parseBuildBudget(value);
  useEffect(() => {
    if (!ready || parsed.error) return;
    try {
      if (value.trim()) localStorage.setItem(BUDGET_KEY, value.trim());
      else localStorage.removeItem(BUDGET_KEY);
    } catch {
      // Saving a preference is optional; the budget calculation is local.
    }
  }, [ready, value, parsed.error]);
  const status = parsed.amount
    ? buildBudgetStatus(total, parsed.amount)
    : undefined;
  const error = touched ? parsed.error : undefined;
  return (
    <section
      className="forge-builder-budget"
      aria-label="Build budget planning"
    >
      <label htmlFor="builder-budget">
        <Wallet size={16} /> Your parts budget <span>Optional / USD</span>
      </label>
      <div className="forge-builder-budget-input">
        <span aria-hidden="true">$</span>
        <input
          id="builder-budget"
          inputMode="decimal"
          placeholder="Set an amount"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? "builder-budget-error builder-budget-note"
              : "builder-budget-note"
          }
        />
        {value && (
          <button
            type="button"
            aria-label="Clear build budget"
            onClick={() => {
              setValue("");
              setTouched(false);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p
          id="builder-budget-error"
          className="forge-builder-budget-error"
          role="alert"
        >
          {error}
        </p>
      )}
      {status && parsed.amount && (
        <div className={status.overage > 0 ? "is-over-budget" : ""}>
          <div
            className="forge-builder-budget-meter"
            role="progressbar"
            aria-label="Selected parts against budget"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(status.percent)}
            aria-valuetext={`${formatPrice(total)} selected parts against ${formatPrice(parsed.amount)} budget`}
          >
            <i style={{ width: `${status.percent}%` }} />
          </div>
          <p className="forge-builder-budget-status" role="status">
            <strong>{formatPrice(status.overage || status.remaining)}</strong>{" "}
            {status.overage > 0
              ? "over budget"
              : status.remaining > 0
                ? "remaining for your parts"
                : "budget fully allocated"}
          </p>
        </div>
      )}
      <p id="builder-budget-note">
        Selected parts only; missing components, shipping and tax are not
        included. Saved on this device when storage is available.
      </p>
    </section>
  );
}
