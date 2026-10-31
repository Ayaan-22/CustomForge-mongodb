import type { Product } from "./types";
import { checkCompatibility } from "./compatibility";
import type { BuildSlot } from "./forge-store";

export type ProductProfile =
  | "gpu"
  | "cpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "psu"
  | "cooler"
  | "case"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "headset"
  | "pc";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases: Record<ProductProfile, string[]> = {
  gpu: ["GPU", "GPUs", "Graphics Card", "Graphics Cards", "Video Card"],
  cpu: ["CPU", "CPUs", "Processor", "Processors"],
  motherboard: ["Motherboard", "Motherboards"],
  ram: ["RAM", "Memory", "Memory Modules"],
  storage: ["Storage", "SSD", "SSDs", "HDD", "Hard Drives"],
  psu: ["Power Supply", "Power Supplies", "PSU", "PSUs"],
  cooler: ["Cooler", "Coolers", "Cooling", "CPU Cooler", "Liquid Cooling"],
  case: ["Case", "Cases", "PC Case", "PC Cases"],
  monitor: ["Monitor", "Monitors", "Display", "Displays"],
  keyboard: ["Keyboard", "Keyboards", "Gaming Keyboard"],
  mouse: ["Mouse", "Mice", "Gaming Mouse"],
  headset: ["Headset", "Headsets", "Headphones"],
  pc: ["PC", "Prebuilt", "Prebuilt PC", "Prebuilt PCs", "Gaming PC", "Desktop"],
};

export function getProductProfile(
  product: Pick<Product, "category" | "specifications">,
): ProductProfile | undefined {
  const category = normalize(product.category);
  const direct = (Object.entries(aliases) as [ProductProfile, string[]][]).find(
    ([, names]) => names.some((name) => normalize(name) === category),
  )?.[0];
  if (direct) return direct;
  if (category === "peripherals" || category === "peripheral") {
    const keys = new Set(
      product.specifications?.map((spec) => normalize(spec.key)),
    );
    if (["switches", "switchtype", "keyswitches"].some((key) => keys.has(key)))
      return "keyboard";
    if (["sensor", "mousesensor", "dpi"].some((key) => keys.has(key)))
      return "mouse";
    if (["microphone", "driversize", "drivers"].some((key) => keys.has(key)))
      return "headset";
  }
  return undefined;
}

const stories: Record<
  ProductProfile,
  { title: string; intro: string; setup: string }
> = {
  gpu: {
    title: "Make every pixel count.",
    intro:
      "Read the graphics specifications in context: your display, games and existing build shape the right upgrade.",
    setup:
      "Check your power supply, GPU connectors, case clearance and display inputs before upgrading.",
  },
  cpu: {
    title: "Start at the core.",
    intro:
      "Choose your processor around the platform you want to build. Socket, cooling and motherboard support matter together.",
    setup:
      "Confirm the motherboard socket and CPU support list, required BIOS version and cooler mounting hardware.",
  },
  motherboard: {
    title: "Your build. Connected.",
    intro:
      "The board defines your platform. Plan the processor, memory, storage and expansion you want to connect.",
    setup:
      "Verify CPU and BIOS support, memory generation, case form factor and expansion slot availability.",
  },
  ram: {
    title: "Give your setup room.",
    intro:
      "Capacity, memory generation and rated speed are different decisions. Match the kit to the platform before choosing the numbers.",
    setup:
      "Confirm memory generation, supported capacity, slot layout and the motherboard memory support list.",
  },
  storage: {
    title: "Space for your next world.",
    intro:
      "Match capacity to your library and the interface to your system. Published speeds depend on the connected platform and workload.",
    setup:
      "Check the storage interface, connector or M.2 slot, supported drive length and any shared motherboard lanes.",
  },
  psu: {
    title: "Power the whole loadout.",
    intro:
      "Choose power for the complete system. Rated output, connectors and physical fit deserve equal attention.",
    setup:
      "Review the component manufacturers’ power recommendations, required connectors and case PSU clearance.",
  },
  cooler: {
    title: "Keep the build in balance.",
    intro:
      "Cooling is a fit decision as well as a specification. Plan the socket, case space and airflow together.",
    setup:
      "Check socket brackets, cooler height or radiator mounting space, RAM clearance and fan connections.",
  },
  case: {
    title: "A home for every upgrade.",
    intro:
      "Start with the layout. Board size, graphics clearance and cooling mounts determine what your enclosure can hold.",
    setup:
      "Verify motherboard form factor, GPU and PSU clearance, cooler space and radiator or fan mounting positions.",
  },
  monitor: {
    title: "See the full picture.",
    intro:
      "Match resolution, screen size and refresh rate to your desk and graphics hardware. Check the inputs that deliver your intended mode.",
    setup:
      "Confirm graphics output ports, cable requirements, resolution and refresh support for your chosen connection.",
  },
  keyboard: {
    title: "Find your rhythm.",
    intro:
      "Switch feel, layout and connection shape everyday play. Choose the controls that work for your desk and preferences.",
    setup:
      "Check keyboard layout, operating system support, connection type and available USB or wireless connectivity.",
  },
  mouse: {
    title: "Make every move yours.",
    intro:
      "Sensor, weight and connection help define the feel. Pair the published specifications with the grip and desk setup you prefer.",
    setup:
      "Confirm the connection, operating system support and available ports. Shape and grip comfort need a personal assessment.",
  },
  headset: {
    title: "Tune into your world.",
    intro:
      "Start with connection and platform support, then compare the published audio and microphone details.",
    setup:
      "Verify your platform’s audio connection, microphone support and any adapter or software requirements.",
  },
  pc: {
    title: "Your next setup starts here.",
    intro:
      "See the complete configuration, then plan the display and peripherals around the hardware inside.",
    setup:
      "Check the full component configuration, operating system, available ports and the connections needed by your display and peripherals.",
  },
};

export function getProductStory(
  product: Pick<Product, "category" | "specifications">,
) {
  const profile = getProductProfile(product);
  return profile
    ? stories[profile]
    : {
        title: "Make it part of your setup.",
        intro:
          "Explore the published product details and check the requirements for your equipment before choosing your next upgrade.",
        setup:
          "Confirm platform support, connection requirements and physical fit using the product manufacturer’s documentation.",
      };
}

const decisionNotes: Record<string, string> = {
  Memory:
    "Graphics memory capacity is one factor. Compare the full GPU specification and the requirements of your games.",
  Chipset:
    "Use the graphics processor specification to compare models and check manufacturer support.",
  "Boost clock":
    "A published boost figure depends on operating conditions; it is not an FPS guarantee.",
  Cores:
    "Core count helps describe the processor. Application performance also depends on architecture and workload.",
  Socket:
    "Match the socket, then verify the board’s CPU support list and required BIOS version.",
  Threads:
    "Thread count describes parallel execution capacity; compare it with the workloads you use.",
  Capacity:
    "Choose capacity around your workload, game library and planned upgrades.",
  Generation:
    "Memory generations require a matching motherboard and processor platform.",
  Speed:
    "Rated speed needs platform support. Check the manufacturer’s requirements and configuration guidance.",
  Latency:
    "Read latency together with the memory speed and the platform’s supported settings.",
  Resolution:
    "Check the resolution against your graphics hardware, display inputs and preferred viewing distance.",
  Refresh:
    "Refresh rate is a display capability. Confirm the cable and input support for your intended mode.",
  Screen:
    "Check the dimensions against your desk, viewing distance and mounting space.",
  Panel:
    "Panel type is one part of the display specification. Compare the published display details together.",
  Interface:
    "Confirm that your system has the matching interface and a suitable available connection.",
  "Read speed":
    "Published read speed depends on the drive connection, system and test conditions.",
  "Form factor":
    "Compare the dimensions and mounting format with the available space in your system.",
  Switches:
    "Switch type affects typing feel. Check the published switch details against your preferences.",
  Layout: "Check the key layout, desk footprint and keys you use most.",
  Connection:
    "Confirm the connection type, platform support and any required ports or adapters.",
  Polling:
    "Check the platform and connection requirements for the published polling setting.",
  Sensor:
    "Read sensor information together with tracking settings and software support.",
  Weight:
    "Consider the published weight alongside shape, grip style and desk setup.",
  Sensitivity:
    "Sensitivity settings are adjustable where supported. Higher figures do not guarantee better aim.",
  Drivers:
    "Driver size describes the hardware; it does not establish overall sound quality on its own.",
  Microphone:
    "Check microphone connection and platform support for the calls and games you use.",
  Output:
    "Check the power requirement of the complete build and the connectors it needs.",
  Efficiency:
    "Efficiency certification and rated output describe different properties of a power supply.",
  Cables:
    "Confirm the required connectors. Use only cables approved for the exact power supply model.",
  Cooling:
    "Check the mounting hardware, case space and the cooling requirements of your build.",
  Radiator:
    "Match the radiator dimensions to a supported mounting location with clearance for fans.",
  Sockets:
    "Verify that the required mounting kit is included or available for your processor socket.",
  Format:
    "Check the enclosure format against motherboard size and your available desk space.",
  "GPU space":
    "Compare GPU length with the remaining clearance after fans or radiators are installed.",
  Processor:
    "Check the complete processor specification and the software you plan to run.",
  Graphics:
    "Match the graphics configuration to your display connections and software requirements.",
  Storage:
    "Review drive capacity and interface against your game library and upgrade plans.",
};

export function getDecisionNote(label: string, profile?: ProductProfile) {
  if (label === "Memory" && profile !== "gpu")
    return "Check memory capacity and generation against the processor and motherboard support lists.";
  return (
    decisionNotes[label] ??
    "Use the published specification to check your setup and compare alternatives. Confirm any missing requirements with the manufacturer."
  );
}

const slots: Partial<Record<ProductProfile, BuildSlot>> = {
  gpu: "GPU",
  cpu: "CPU",
  motherboard: "Motherboard",
  ram: "RAM",
  storage: "Storage",
  psu: "Power Supply",
  cooler: "Cooler",
  case: "Case",
};
const complements: Record<ProductProfile, ProductProfile[]> = {
  gpu: ["monitor", "case"],
  cpu: ["motherboard", "cooler"],
  motherboard: ["cpu", "ram"],
  ram: ["motherboard", "storage"],
  storage: ["motherboard", "case"],
  psu: ["gpu", "case"],
  cooler: ["cpu", "case"],
  case: ["gpu", "cooler"],
  monitor: ["gpu", "keyboard"],
  keyboard: ["mouse", "headset"],
  mouse: ["keyboard", "headset"],
  headset: ["keyboard", "mouse"],
  pc: ["monitor", "keyboard"],
};

export function getComplementCategories(
  product: Product,
  categories: string[],
) {
  const profile = getProductProfile(product);
  if (!profile) return [];
  return complements[profile].flatMap((target) => {
    // Resolve real catalog names, preserving distinct categories such as PSU / Power Supply.
    const category = categories.find((name) =>
      aliases[target].some((alias) => normalize(name) === normalize(alias)),
    );
    return category ? [{ category, profile: target }] : [];
  });
}

const complementReasons: Partial<Record<ProductProfile, string>> = {
  monitor:
    "Complete the display side of your setup. Verify ports, resolution and refresh support.",
  case: "Plan your component space. Verify dimensions, mounting support and cooling clearance.",
  motherboard:
    "Plan the platform connection. Verify socket, BIOS support, memory and available slots.",
  cooler:
    "Plan the cooling. Verify socket hardware, cooling requirements and case clearance.",
  cpu: "Plan the processor platform. Verify socket, BIOS support and cooling requirements.",
  ram: "Plan your memory. Verify generation, capacity and motherboard support.",
  storage:
    "Expand your library space. Verify the drive interface and available slots or connectors.",
  gpu: "Plan the graphics upgrade. Verify power, case clearance and display connections.",
  keyboard:
    "Complete your desk controls. Verify layout, connection and platform support.",
  mouse:
    "Complete your desk controls. Verify connection, platform support and your preferred grip.",
  headset:
    "Add your audio connection. Verify platform, microphone and connector support.",
};

/** A category complement is not a compatibility certificate. Known conflicts are excluded. */
export function describeComplement(source: Product, candidate: Product) {
  const sourceProfile = getProductProfile(source),
    targetProfile = getProductProfile(candidate);
  if (
    !sourceProfile ||
    !targetProfile ||
    !complements[sourceProfile].includes(targetProfile) ||
    candidate.id === source.id ||
    candidate.availability !== "In Stock" ||
    candidate.stock === 0
  )
    return null;
  const sourceSlot = slots[sourceProfile],
    targetSlot = slots[targetProfile];
  const checks =
    sourceSlot && targetSlot
      ? checkCompatibility({ [sourceSlot]: source, [targetSlot]: candidate })
      : [];
  if (checks.some((check) => check.state === "conflict")) return null;
  const verified = checks.filter((check) => check.state === "pass");
  return {
    product: candidate,
    status: verified.length ? "Published specs match" : "Verify your setup",
    reason: verified.length
      ? verified.map((check) => check.detail).join(". ")
      : complementReasons[targetProfile]!,
    needsVerification:
      checks.length === 0 || checks.some((check) => check.state === "unknown"),
  };
}
