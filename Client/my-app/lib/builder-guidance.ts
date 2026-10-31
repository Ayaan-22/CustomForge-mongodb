import { BUILD_SLOTS, type BuildSlot } from "./forge-store";
import type { CompatibilityCheck } from "./compatibility";

export const BUILDER_GUIDANCE: Record<
  BuildSlot,
  { title: string; detail: string }
> = {
  CPU: {
    title: "Start with the processor.",
    detail:
      "Check the socket, workload and published power needs. Your motherboard and cooler must support this processor.",
  },
  GPU: {
    title: "Choose your graphics card.",
    detail:
      "Compare published memory, power and dimensions. Check PSU connectors and clearance with your case and cooling installed.",
  },
  Motherboard: {
    title: "Connect your core components.",
    detail:
      "Match the CPU socket and memory generation. Verify CPU support, BIOS version, board size and storage slots with the manufacturer.",
  },
  RAM: {
    title: "Match your memory generation.",
    detail:
      "Choose DDR memory supported by your motherboard. Check capacity, kit layout and supported speeds; advertised speeds can require a profile.",
  },
  Storage: {
    title: "Make room for your library.",
    detail:
      "Compare capacity and interface. Verify an available M.2 or SATA connection, the drive size and any shared motherboard lanes.",
  },
  "Power Supply": {
    title: "Leave room for power headroom.",
    detail:
      "Check output, required GPU connectors and form factor. Our wattage estimate needs published CPU, GPU and PSU power specifications.",
  },
  Cooler: {
    title: "Keep the processor comfortable.",
    detail:
      "Choose a CPU cooler with the correct mounting kit. Verify socket support, cooler height or radiator fit and RAM clearance.",
  },
  Case: {
    title: "Give every component a home.",
    detail:
      "Check motherboard size, GPU clearance and cooler fit. Radiators, fans and cable routing can reduce the advertised space.",
  },
};

const catalogNames: Partial<Record<BuildSlot, readonly string[]>> = {
  "Power Supply": ["Power Supply", "PSU"],
  Cooler: ["Cooler", "Cooling"],
};

/** Catalog labels remain exact. The UI explicitly names any alternative catalog. */
export function builderCatalogs(
  slot: BuildSlot,
  available: string[],
): string[] {
  return (catalogNames[slot] ?? [slot]).filter((category) =>
    available.includes(category),
  );
}

export function categoryFitsSlot(slot: BuildSlot, category: string) {
  return (catalogNames[slot] ?? [slot]).includes(category);
}

export function nextMissingSlot(
  current: BuildSlot,
  selected: Partial<Record<BuildSlot, unknown>>,
): BuildSlot | undefined {
  const index = BUILD_SLOTS.indexOf(current);
  const after = [
    ...BUILD_SLOTS.slice(index + 1),
    ...BUILD_SLOTS.slice(0, index + 1),
  ];
  return after.find((item) => !selected[item]);
}

/** Empty means optional; reject scientific notation, negative values and partial invalid input. */
export function parseBuildBudget(value: string): {
  amount?: number;
  error?: string;
} {
  const input = value.trim();
  if (!input) return {};
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(input))
    return {
      error: "Enter a positive USD amount with up to two decimal places.",
    };
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Your budget must be greater than zero." };
  return { amount };
}

export function buildBudgetStatus(total: number, budget: number) {
  const difference = Math.round((budget - total) * 100) / 100;
  return {
    remaining: Math.max(0, difference),
    overage: Math.max(0, -difference),
    percent: Math.min(100, Math.max(0, (total / budget) * 100)),
  };
}

const checkSlots: Record<string, BuildSlot[]> = {
  "CPU / motherboard socket": ["CPU", "Motherboard"],
  "Memory generation": ["RAM", "Motherboard"],
  "Cooler socket support": ["Cooler", "CPU"],
  "Estimated power headroom": ["Power Supply", "GPU", "CPU"],
  "GPU / case clearance": ["Case", "GPU"],
};

export function guidanceForCheck(check: CompatibilityCheck): {
  detail: string;
  slots: BuildSlot[];
} {
  const slots = checkSlots[check.label] ?? [];
  if (check.state === "pass")
    return {
      detail:
        "Published specifications match for this check. Manufacturer and physical-fit checks still apply.",
      slots: [],
    };
  const actions: Record<string, string> = {
    "CPU / motherboard socket":
      "Compare the CPU and motherboard socket. For missing data, open both product specifications and manufacturer CPU-support lists.",
    "Memory generation":
      "Compare RAM generation with motherboard memory support. Missing DDR metadata requires checking the manufacturer specifications.",
    "Cooler socket support":
      "Confirm the exact CPU socket and included cooler mounting kit. Check the manufacturer's supported-socket list.",
    "Estimated power headroom":
      "Review the PSU output and published CPU/GPU power. Confirm the required connectors and the GPU manufacturer's PSU recommendation.",
    "GPU / case clearance":
      "Compare GPU length with usable case space. Confirm the clearance with your chosen radiator and fans installed.",
  };
  return {
    detail:
      actions[check.label] ??
      "Review the selected products and manufacturer specifications before buying.",
    slots,
  };
}
