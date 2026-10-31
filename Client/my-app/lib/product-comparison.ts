import type { Product } from "./types";
import { finalPrice, formatPrice } from "./format";

export type ComparisonCell = {
  text: string;
  kind: "value" | "missing" | "conflict";
  comparable: string | null;
};
export type ComparisonRow = {
  key: string;
  label: string;
  section: "overview" | "specifications";
  cells: ComparisonCell[];
  different: boolean;
};
type AliasRule = { key: string; label: string; aliases: string[] };
const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const normalizedValue = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*(gb|tb|mb|ghz|mhz|khz|hz|w|mt\/s)\b/gi, "$1 $2")
    .toLowerCase();
const rule = (key: string, label: string, ...aliases: string[]): AliasRule => ({
  key,
  label,
  aliases: [label, ...aliases].map(normalizeKey),
});
const profiles: Record<string, AliasRule[]> = {
  gpu: [
    rule(
      "memory",
      "Graphics memory",
      "VRAM",
      "Video Memory",
      "Memory",
      "Memory Size",
      "Memory Capacity",
    ),
    rule("boost", "Boost clock", "GPU Boost Clock", "Boost Frequency"),
    rule("resolution", "Target resolution", "Recommended Resolution"),
    rule("cooling", "Cooling", "Cooling System", "Cooler"),
  ],
  cpu: [
    rule("socket", "Socket", "CPU Socket", "Processor Socket"),
    rule("cores", "Cores", "CPU Cores", "Core Count", "Number of Cores"),
    rule("threads", "Threads", "Thread Count"),
    rule(
      "boost",
      "Boost clock",
      "Max Boost Clock",
      "Turbo Frequency",
      "Max Turbo Frequency",
    ),
    rule("base", "Base clock", "Base Frequency"),
  ],
  ram: [
    rule(
      "capacity",
      "Capacity",
      "Memory Capacity",
      "Total Capacity",
      "Memory Size",
    ),
    rule("type", "Memory type", "RAM Type", "DDR Generation"),
    rule("speed", "Memory speed", "Data Rate", "Speed"),
    rule("latency", "CAS latency"),
  ],
  motherboard: [
    rule("socket", "Socket", "CPU Socket", "Processor Socket"),
    rule("type", "Memory type", "RAM Type"),
    rule("form", "Form factor"),
    rule("chipset", "Chipset", "Motherboard Chipset"),
  ],
  storage: [
    rule("capacity", "Capacity", "Storage Capacity", "Drive Capacity"),
    rule("interface", "Interface", "Connection Interface", "Bus Interface"),
    rule("form", "Form factor"),
    rule("read", "Read speed", "Sequential Read Speed", "Sequential Read"),
  ],
  monitor: [
    rule(
      "resolution",
      "Resolution",
      "Native Resolution",
      "Screen Resolution",
      "Display Resolution",
    ),
    rule("refresh", "Refresh rate", "Max Refresh Rate", "Refresh Frequency"),
    rule("size", "Screen size", "Display Size"),
    rule("panel", "Panel", "Panel Type", "Display Technology"),
  ],
  keyboard: [
    rule("switch", "Switches", "Switch Type", "Key Switches", "Switch"),
    rule("layout", "Layout", "Keyboard Layout", "Form Factor"),
    rule(
      "connection",
      "Connection",
      "Connectivity",
      "Connection Type",
      "Interface",
    ),
  ],
  mouse: [
    rule("sensor", "Sensor", "Sensor Type", "Mouse Sensor"),
    rule("dpi", "DPI", "Max DPI"),
    rule(
      "connection",
      "Connection",
      "Connectivity",
      "Connection Type",
      "Interface",
    ),
  ],
  headset: [
    rule("driver_size", "Driver size", "Driver Diameter"),
    rule(
      "connection",
      "Connection",
      "Connectivity",
      "Connection Type",
      "Interface",
    ),
    rule("mic", "Microphone", "Mic Type", "Microphone Type"),
  ],
  psu: [
    rule("power", "Power output", "Wattage", "Output Power", "Output", "Power"),
    rule("efficiency", "Efficiency", "Efficiency Rating", "80 Plus Rating"),
    rule("cables", "Modularity", "Modular"),
  ],
  cooler: [
    rule("type", "Cooling type", "Cooler Type", "Type"),
    rule("radiator", "Radiator", "Radiator Size"),
    rule(
      "socket",
      "Supported sockets",
      "Socket Compatibility",
      "Sockets",
      "Socket",
    ),
    rule("noise", "Noise level", "Noise"),
  ],
  case: [
    rule("form", "Form factor"),
    rule("clearance", "GPU clearance", "Max GPU Length", "Maximum GPU Length"),
    rule(
      "included_fans",
      "Included fans",
      "Preinstalled Fans",
      "Supplied Fans",
    ),
    rule("fan_support", "Fan support", "Fan Mounts", "Fan Mounting Capacity"),
  ],
};
const categoryAliases: Record<string, string> = {
  gpus: "gpu",
  graphicscard: "gpu",
  graphicscards: "gpu",
  videocard: "gpu",
  videocards: "gpu",
  cpus: "cpu",
  processor: "cpu",
  processors: "cpu",
  memory: "ram",
  memorymodule: "ram",
  memorymodules: "ram",
  motherboards: "motherboard",
  ssds: "storage",
  ssd: "storage",
  hdd: "storage",
  externalstorage: "storage",
  monitors: "monitor",
  display: "monitor",
  displays: "monitor",
  keyboards: "keyboard",
  gamingkeyboard: "keyboard",
  mice: "mouse",
  gamingmouse: "mouse",
  headsets: "headset",
  headphones: "headset",
  powersupply: "psu",
  powersupplies: "psu",
  psus: "psu",
  coolers: "cooler",
  cooling: "cooler",
  cpucooler: "cooler",
  cases: "case",
  pccase: "case",
  pccases: "case",
};
function familyFor(category: string) {
  const key = normalizeKey(category);
  return Object.hasOwn(categoryAliases, key) ? categoryAliases[key] : key;
}
const missing = (): ComparisonCell => ({
  text: "Not listed",
  kind: "missing",
  comparable: null,
});
function cell(value: unknown): ComparisonCell {
  if (typeof value !== "string" && typeof value !== "number") return missing();
  if (typeof value === "number" && !Number.isFinite(value)) return missing();
  const text = String(value).trim();
  if (
    !text ||
    /^(?:n\/?a|unknown|unspecified|not specified|not available|tbd|[-–—]+)$/i.test(
      text,
    )
  )
    return missing();
  return { text, kind: "value", comparable: normalizedValue(text) };
}

/** Normalize only documented same-category aliases. Never derive values from names. */
export function comparisonSpecifications(
  product: Pick<Product, "category" | "specifications">,
) {
  const family = familyFor(product.category);
  const rules = Object.hasOwn(profiles, family) ? profiles[family] : [];
  const result = new Map<string, { label: string; cell: ComparisonCell }>();
  for (const spec of product.specifications || []) {
    if (typeof spec.key !== "string" || !normalizeKey(spec.key)) continue;
    const value = cell(spec.value);
    if (value.kind === "missing") continue;
    const matching = rules.find((rule) =>
      rule.aliases.includes(normalizeKey(spec.key)),
    );
    const key = `${family}:${matching?.key || `raw:${normalizeKey(spec.key)}`}`;
    const label = matching?.label || spec.key.trim().replace(/_/g, " ");
    const previous = result.get(key);
    if (!previous) result.set(key, { label, cell: value });
    else if (previous.cell.comparable !== value.comparable) {
      // Conflicting aliases remain visible; do not arbitrarily pick a winner.
      result.set(key, {
        label,
        cell: {
          text: `${previous.cell.text} / ${value.text}`,
          kind: "conflict",
          comparable: null,
        },
      });
    }
  }
  return result;
}

export function comparisonRows(
  products: (Product | undefined)[],
): ComparisonRow[] {
  const loaded = products.flatMap((product, index) => (product ? [index] : []));
  const differs = (cells: ComparisonCell[]) =>
    loaded.length >= 2 &&
    (loaded.some((index) => cells[index].kind === "conflict") ||
      new Set(loaded.map((index) => cells[index].comparable)).size > 1);
  const row = (
    key: string,
    label: string,
    values: ComparisonCell[],
    section: ComparisonRow["section"] = "overview",
  ) => ({ key, label, section, cells: values, different: differs(values) });
  const overview: [string, string, (p: Product) => ComparisonCell][] = [
    [
      "price",
      "Price",
      (p) => {
        const price =
          p.finalPrice ?? finalPrice(p.originalPrice, p.discountPercentage);
        return Number.isFinite(price) && price >= 0
          ? { ...cell(price), text: formatPrice(price) }
          : missing();
      },
    ],
    ["brand", "Brand", (p) => cell(p.brand)],
    ["category", "Category", (p) => cell(p.category)],
    ["stock", "Availability", (p) => cell(p.availability)],
    [
      "rating",
      "Customer rating",
      (p) =>
        p.ratings?.totalReviews > 0 && Number.isFinite(p.ratings.average)
          ? cell(
              `${p.ratings.average.toFixed(1)} / 5 (${p.ratings.totalReviews} reviews)`,
            )
          : { text: "No reviews yet", kind: "missing", comparable: null },
    ],
    ["warranty", "Published warranty", (p) => cell(p.warranty)],
  ];
  const rows = overview.map(([key, label, get]) =>
    row(
      key,
      label,
      products.map((p) => (p ? get(p) : missing())),
    ),
  );
  const normalized = products.map((p) =>
    p ? comparisonSpecifications(p) : new Map(),
  );
  const keys = [...new Set(normalized.flatMap((values) => [...values.keys()]))];
  const mixed =
    new Set(products.filter(Boolean).map((p) => familyFor(p!.category))).size >
    1;
  for (const key of keys) {
    const index = normalized.findIndex((values) => values.has(key));
    const label = normalized[index].get(key)!.label;
    rows.push(
      row(
        key,
        mixed ? `${products[index]!.category} · ${label}` : label,
        normalized.map((values) => values.get(key)?.cell || missing()),
        "specifications",
      ),
    );
  }
  return rows;
}
