import type { Product } from "./types";
import type { BuildSlot } from "./forge-store";

export type CompatibilityCheck = {
  label: string;
  state: "pass" | "conflict" | "unknown";
  detail: string;
};
type Build = Partial<Record<BuildSlot, Product>>;
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
function spec(product: Product | undefined, aliases: string[]) {
  const found = product?.specifications?.find((item) =>
    aliases.map(key).includes(key(item.key)),
  );
  const value = found?.value?.trim() || "";
  return /^(?:n\/?a|unknown|unspecified|not specified|not available|tbd|[-–—]+)$/i.test(
    value,
  )
    ? ""
    : value;
}
const socket = (value: string) => value.toUpperCase().replace(/[\s-]/g, "");
const ddr = (value: string) =>
  value
    .toUpperCase()
    .match(/DDR\s*([345])/g)
    ?.map((v) => v.replace(/\s/g, "")) ?? [];
const watts = (value: string) =>
  Number(value.match(/(\d+(?:\.\d+)?)\s*W\b/i)?.[1]) || 0;
const millimeters = (value: string) => {
  // Only a single published dimension is usable; do not read a fractional
  // suffix or infer length from a multi-dimensional description.
  const amount = Number(value.trim().match(/^(\d+(?:\.\d+)?)\s*mm$/i)?.[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

// Deliberately conservative: missing catalog metadata is "unknown", never a pass.
// This checks advertised specifications, not BIOS support or mechanical assembly.
export function checkCompatibility(build: Build): CompatibilityCheck[] {
  const checks: CompatibilityCheck[] = [];
  if (build.CPU && build.Motherboard) {
    const cpu = spec(build.CPU, ["socket", "cpu socket"]),
      board = spec(build.Motherboard, ["socket", "cpu socket"]);
    checks.push({
      label: "CPU / motherboard socket",
      state:
        !cpu || !board
          ? "unknown"
          : socket(cpu) === socket(board)
            ? "pass"
            : "conflict",
      detail:
        !cpu || !board
          ? "Socket metadata is missing. Check manufacturer support."
          : `${cpu} CPU / ${board} motherboard`,
    });
  }
  if (build.RAM && build.Motherboard) {
    const memory = ddr(spec(build.RAM, ["type", "memory type", "generation"])),
      board = ddr(
        spec(build.Motherboard, ["memory", "memory type", "ram type"]),
      );
    checks.push({
      label: "Memory generation",
      state:
        !memory.length || !board.length
          ? "unknown"
          : memory.some((v) => board.includes(v))
            ? "pass"
            : "conflict",
      detail:
        !memory.length || !board.length
          ? "DDR generation is not specified for both parts."
          : `${memory.join(" / ")} RAM / ${board.join(" / ")} motherboard`,
    });
  }
  if (build.Cooler && build.CPU) {
    const cpu = socket(spec(build.CPU, ["socket", "cpu socket"]));
    const supported = spec(build.Cooler, [
      "sockets",
      "supported sockets",
      "socket compatibility",
      "socket",
    ])
      .split(/[,/;|]/)
      .map(socket);
    const known = cpu && supported.some(Boolean);
    checks.push({
      label: "Cooler socket support",
      state: !known ? "unknown" : supported.includes(cpu) ? "pass" : "conflict",
      detail: !known
        ? "Confirm cooler mounting hardware and CPU socket."
        : `${cpu} CPU / cooler supports ${supported.filter(Boolean).join(", ")}`,
    });
  }
  if (build.CPU && build.GPU && build["Power Supply"]) {
    const cpu = watts(spec(build.CPU, ["power", "tdp", "power consumption"])),
      gpu = watts(
        spec(build.GPU, ["power", "tdp", "power consumption", "board power"]),
      ),
      psu = watts(spec(build["Power Supply"], ["output", "wattage", "power"]));
    const estimate = Math.ceil((cpu + gpu + 100) * 1.25);
    checks.push({
      label: "Estimated power headroom",
      state:
        !cpu || !gpu || !psu
          ? "unknown"
          : psu >= estimate
            ? "pass"
            : "conflict",
      detail:
        !cpu || !gpu || !psu
          ? "CPU, GPU and PSU wattage are needed. Confirm PSU connectors and manufacturer recommendations."
          : `${psu} W PSU / estimated minimum ${estimate} W including 100 W for other parts and 25% headroom. Check connectors separately.`,
    });
  }
  if (build.Case && build.GPU) {
    const length = millimeters(spec(build.GPU, ["length", "gpu length"]));
    const clearance = millimeters(
      spec(build.Case, [
        "max gpu length",
        "gpu clearance",
        "maximum gpu length",
      ]),
    );
    checks.push({
      label: "GPU / case clearance",
      state:
        !length || !clearance
          ? "unknown"
          : length <= clearance
            ? "pass"
            : "conflict",
      detail:
        !length || !clearance
          ? "GPU length and case clearance are missing. Confirm space with cooling installed."
          : `${length} mm GPU / ${clearance} mm case clearance; radiator clearance is a separate check.`,
    });
  }
  return checks;
}
