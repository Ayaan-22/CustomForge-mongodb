import type { Product } from "./types";

export type ProductHighlight = { label: string; value: string };
type HighlightRule = { label: string; aliases: string[] };
type HighlightSource = Pick<Product, "category" | "specifications">;

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const rule = (label: string, ...aliases: string[]): HighlightRule => ({
  label,
  aliases: aliases.map(normalize),
});

// The order is deliberate: buying decisions come before secondary details.
// Values always come from published metadata, never a product name or SKU.
const profiles: Record<string, HighlightRule[]> = {
  gpu: [
    rule(
      "Memory",
      "VRAM",
      "Video Memory",
      "Memory Size",
      "Memory Capacity",
      "Memory",
    ),
    rule("Chipset", "GPU Chipset", "Graphics Processor", "Chipset", "GPU"),
    rule("Boost clock", "Boost Clock", "GPU Boost Clock", "Boost Frequency"),
    rule("Cores", "CUDA Cores", "Stream Processors", "Cores"),
    rule("Power", "Board Power", "Power Consumption", "TDP", "Power"),
    rule("Resolution", "Target Resolution", "Recommended Resolution"),
    rule("Cooling", "Cooling", "Cooling System", "Cooler"),
  ],
  cpu: [
    rule("Cores", "CPU Cores", "Core Count", "Number of Cores", "Cores"),
    rule("Socket", "CPU Socket", "Processor Socket", "Socket"),
    rule(
      "Boost clock",
      "Max Boost Clock",
      "Boost Clock",
      "Turbo Frequency",
      "Max Turbo Frequency",
    ),
    rule("Threads", "Thread Count", "Threads"),
    rule("Base clock", "Base Clock", "Base Frequency", "Clock Speed"),
  ],
  ram: [
    rule(
      "Capacity",
      "Memory Capacity",
      "Total Capacity",
      "Capacity",
      "Memory Size",
    ),
    rule(
      "Generation",
      "Memory Type",
      "RAM Type",
      "DDR Generation",
      "Generation",
      "Type",
    ),
    rule("Speed", "Memory Speed", "Data Rate", "Speed", "Frequency"),
    rule("Latency", "CAS Latency", "Latency", "Timings"),
  ],
  motherboard: [
    rule("Socket", "CPU Socket", "Processor Socket", "Socket"),
    rule("Memory", "Memory Type", "RAM Type", "Memory", "RAM Slots"),
    rule("Form factor", "Form Factor", "Board Size", "Size"),
    rule("Chipset", "Chipset", "Motherboard Chipset"),
  ],
  monitor: [
    rule("Resolution", "Native Resolution", "Screen Resolution", "Resolution"),
    rule("Refresh", "Refresh Rate", "Max Refresh Rate", "Refresh Frequency"),
    rule("Screen", "Screen Size", "Display Size", "Size"),
    rule("Panel", "Panel Type", "Panel", "Display Technology"),
  ],
  storage: [
    rule("Capacity", "Storage Capacity", "Capacity", "Drive Capacity"),
    rule("Interface", "Interface", "Connection Interface", "Bus Interface"),
    rule(
      "Read speed",
      "Sequential Read Speed",
      "Read Speed",
      "Sequential Read",
    ),
    rule("Form factor", "Form Factor", "Drive Size"),
  ],
  keyboard: [
    rule("Switches", "Switch Type", "Switches", "Key Switches", "Switch"),
    rule("Layout", "Keyboard Layout", "Layout", "Form Factor"),
    rule(
      "Connection",
      "Connectivity",
      "Connection",
      "Connection Type",
      "Interface",
    ),
    rule("Polling", "Polling Rate", "Report Rate"),
  ],
  mouse: [
    rule("Sensor", "Sensor", "Sensor Type", "Mouse Sensor"),
    rule(
      "Connection",
      "Connectivity",
      "Connection",
      "Connection Type",
      "Interface",
    ),
    rule("Weight", "Weight", "Product Weight"),
    rule("Sensitivity", "Max DPI", "DPI", "Sensitivity"),
  ],
  headset: [
    rule("Drivers", "Driver Size", "Drivers", "Driver", "Driver Diameter"),
    rule(
      "Connection",
      "Connectivity",
      "Connection",
      "Connection Type",
      "Interface",
    ),
    rule("Microphone", "Microphone", "Mic Type", "Microphone Type"),
  ],
  psu: [
    rule(
      "Output",
      "Wattage",
      "Output Power",
      "Power Output",
      "Output",
      "Power",
    ),
    rule(
      "Efficiency",
      "Efficiency Rating",
      "80 Plus Rating",
      "Efficiency",
      "Certification",
    ),
    rule("Cables", "Modularity", "Modular", "Cable Type"),
  ],
  cooler: [
    rule("Cooling", "Cooling Type", "Cooler Type", "Type"),
    rule("Radiator", "Radiator Size", "Radiator"),
    rule(
      "Sockets",
      "Supported Sockets",
      "Socket Compatibility",
      "Sockets",
      "Socket",
    ),
    rule("Fan speed", "Fan Speed", "Fan RPM"),
    rule("Noise", "Noise Level", "Noise"),
  ],
  case: [
    rule("Format", "Form Factor", "Case Type", "Type"),
    rule("GPU space", "GPU Clearance", "Max GPU Length", "Maximum GPU Length"),
    rule("Fans", "Fan Support", "Included Fans", "Fans"),
    rule("Material", "Material", "Materials"),
  ],
  pc: [
    rule("Processor", "Processor", "CPU"),
    rule("Graphics", "Graphics Card", "Graphics", "GPU"),
    rule("Memory", "RAM", "Memory", "Memory Capacity"),
    rule("Storage", "Storage", "Storage Capacity"),
  ],
  networking: [
    rule("Interface", "Interface", "Connection"),
    rule("Speed", "Ethernet", "Ethernet Speed", "Transfer Rate", "Speed"),
    rule("Wireless", "Wireless", "WiFi Standard", "Wireless Standard"),
    rule("Bands", "Bands", "Frequency Bands"),
    rule("Ports", "Ports", "Port Count"),
  ],
};

const categoryAliases: Record<string, string> = {
  gpu: "gpu",
  gpus: "gpu",
  graphicscard: "gpu",
  graphicscards: "gpu",
  videocard: "gpu",
  videocards: "gpu",
  cpu: "cpu",
  cpus: "cpu",
  processor: "cpu",
  processors: "cpu",
  ram: "ram",
  memory: "ram",
  memorymodule: "ram",
  memorymodules: "ram",
  motherboard: "motherboard",
  motherboards: "motherboard",
  monitor: "monitor",
  monitors: "monitor",
  display: "monitor",
  displays: "monitor",
  storage: "storage",
  ssd: "storage",
  ssds: "storage",
  hdd: "storage",
  harddrive: "storage",
  harddrives: "storage",
  keyboard: "keyboard",
  keyboards: "keyboard",
  gamingkeyboard: "keyboard",
  mouse: "mouse",
  mice: "mouse",
  gamingmouse: "mouse",
  headset: "headset",
  headsets: "headset",
  headphone: "headset",
  headphones: "headset",
  psu: "psu",
  psus: "psu",
  powersupply: "psu",
  powersupplies: "psu",
  cooler: "cooler",
  coolers: "cooler",
  cooling: "cooler",
  cpucooler: "cooler",
  liquidcooling: "cooler",
  case: "case",
  cases: "case",
  pccase: "case",
  pccases: "case",
  pc: "pc",
  prebuiltpc: "pc",
  prebuiltpcs: "pc",
  prebuilt: "pc",
  prebuilts: "pc",
  gamingpc: "pc",
  desktop: "pc",
  networking: "networking",
  network: "networking",
};

function profileFor(category: string, keys: Set<string>) {
  const normalized = normalize(category);
  const explicit = categoryAliases[normalized];
  if (explicit) return profiles[explicit];

  // Older records use broad categories. Identify their metadata shape without
  // guessing any technical value from the model name.
  if (normalized === "peripherals" || normalized === "peripheral") {
    if (["switchtype", "switches", "keyswitches"].some((key) => keys.has(key)))
      return profiles.keyboard;
    if (["sensor", "mousesensor", "dpi"].some((key) => keys.has(key)))
      return profiles.mouse;
    if (
      ["driver", "drivers", "driversize", "microphone"].some((key) =>
        keys.has(key),
      )
    )
      return profiles.headset;
  }
  return undefined;
}

/** Return useful, distinct, published facts; cards default to three highlights. */
export function getProductHighlights(
  product: HighlightSource,
  limit = 3,
): ProductHighlight[] {
  const maxHighlights = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 3;
  if (maxHighlights === 0) return [];
  const specs = (product.specifications ?? [])
    .filter(
      (spec) =>
        typeof spec.key === "string" &&
        typeof spec.value === "string" &&
        spec.key.trim() &&
        spec.value.trim() &&
        !/^(?:n\/?a|unknown|unspecified|not specified|not available|tbd|[-–—])$/i.test(
          spec.value.trim(),
        ),
    )
    .map((spec) => ({
      key: normalize(spec.key),
      label: spec.key.trim(),
      value: spec.value.trim(),
    }));

  const profile = profileFor(
    product.category,
    new Set(specs.map((spec) => spec.key)),
  );
  const highlights: ProductHighlight[] = [];
  const usedKeys = new Set<string>();
  const usedValues = new Set<string>();

  const add = (label: string, spec: (typeof specs)[number]) => {
    const normalizedValue = spec.value.toLowerCase().replace(/\s+/g, " ");
    if (usedKeys.has(spec.key) || usedValues.has(normalizedValue)) return;
    usedKeys.add(spec.key);
    usedValues.add(normalizedValue);
    highlights.push({ label, value: spec.value });
  };

  if (profile) {
    for (const { label, aliases } of profile) {
      // Alias priority beats API field order, e.g. prefer VRAM to generic Memory.
      const spec = aliases
        .map((alias) => specs.find((entry) => entry.key === alias))
        .find(Boolean);
      if (spec) add(label, spec);
      if (highlights.length === maxHighlights) break;
    }
  } else {
    for (const spec of specs) {
      add(spec.label, spec);
      if (highlights.length === maxHighlights) break;
    }
  }
  return highlights;
}
