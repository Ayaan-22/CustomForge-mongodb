import { describe, expect, it } from "vitest";
import {
  builderCatalogs,
  categoryFitsSlot,
  nextMissingSlot,
  parseBuildBudget,
  buildBudgetStatus,
  guidanceForCheck,
} from "@/lib/builder-guidance";

describe("guided builder planning", () => {
  it("keeps catalog aliases explicit and rejects unrelated categories", () => {
    expect(
      builderCatalogs("Power Supply", ["GPU", "PSU", "Power Supply"]),
    ).toEqual(["Power Supply", "PSU"]);
    expect(builderCatalogs("Cooler", ["Cooling"])).toEqual(["Cooling"]);
    expect(builderCatalogs("CPU", ["Processors"])).toEqual([]);
    expect(categoryFitsSlot("Power Supply", "PSU")).toBe(true);
    expect(categoryFitsSlot("Cooler", "Cooling")).toBe(true);
    expect(categoryFitsSlot("CPU", "GPU")).toBe(false);
  });
  it("guides to missing slots in order, wraps and stops when complete", () => {
    expect(nextMissingSlot("CPU", { CPU: true, GPU: true })).toBe(
      "Motherboard",
    );
    expect(nextMissingSlot("Case", { CPU: true })).toBe("GPU");
    expect(
      nextMissingSlot("CPU", {
        CPU: true,
        GPU: true,
        Motherboard: true,
        RAM: true,
        Storage: true,
        "Power Supply": true,
        Cooler: true,
        Case: true,
      }),
    ).toBeUndefined();
  });
  it("accepts optional budgets and USD cents without a catalog price cap", () => {
    expect(parseBuildBudget(" ")).toEqual({});
    expect(parseBuildBudget("12000.50")).toEqual({ amount: 12000.5 });
    expect(parseBuildBudget(".50")).toEqual({ amount: 0.5 });
  });
  it("rejects negative, zero, nonfinite and malformed budgets", () => {
    for (const input of [
      "-1",
      "0",
      "1e3",
      "Infinity",
      "abc",
      "500.123",
      "1,000",
      "9".repeat(400),
    ])
      expect(parseBuildBudget(input).error).toBeTruthy();
  });
  it("distinguishes money remaining from an overage and caps the meter", () => {
    expect(buildBudgetStatus(250.25, 1000)).toMatchObject({
      remaining: 749.75,
      overage: 0,
    });
    expect(buildBudgetStatus(250.25, 1000).percent).toBeCloseTo(25.025);
    expect(buildBudgetStatus(1200.5, 1000)).toEqual({
      remaining: 0,
      overage: 200.5,
      percent: 100,
    });
    expect(buildBudgetStatus(0, 1000)).toEqual({
      remaining: 1000,
      overage: 0,
      percent: 0,
    });
  });
  it("does not present missing metadata as a successful compatibility check", () => {
    const guidance = guidanceForCheck({
      label: "CPU / motherboard socket",
      state: "unknown",
      detail: "Missing socket",
    });
    expect(guidance.slots).toEqual(["CPU", "Motherboard"]);
    expect(guidance.detail).toContain("manufacturer CPU-support");
    expect(
      guidanceForCheck({
        label: "Memory generation",
        state: "pass",
        detail: "DDR5",
      }).slots,
    ).toEqual([]);
  });
});
