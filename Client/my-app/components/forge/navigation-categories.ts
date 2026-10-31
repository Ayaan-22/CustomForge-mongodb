"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Fan,
  Box,
  Zap,
  Keyboard,
  Mouse,
  Headphones,
  Monitor,
  Gamepad2,
  Wifi,
  Package,
  type LucideIcon,
} from "lucide-react";

export type CategoryEntry = {
  category: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};
export type CategoryGroup = {
  id: string;
  label: string;
  entries: CategoryEntry[];
};

const details: Record<string, Omit<CategoryEntry, "category">> = {
  GPU: { label: "Graphics cards", detail: "GPU", icon: CircuitBoard },
  CPU: { label: "Processors", detail: "CPU", icon: Cpu },
  Motherboard: {
    label: "Motherboards",
    detail: "Connect your build",
    icon: CircuitBoard,
  },
  RAM: { label: "Memory", detail: "RAM", icon: MemoryStick },
  Storage: { label: "Storage", detail: "Drives & SSDs", icon: HardDrive },
  "Power Supply": {
    label: "Power supplies",
    detail: "Power Supply catalog",
    icon: Zap,
  },
  PSU: { label: "PSU", detail: "PSU catalog", icon: Zap },
  Cooler: { label: "CPU coolers", detail: "Cooler catalog", icon: Fan },
  Cooling: { label: "Cooling", detail: "Cooling catalog", icon: Fan },
  Case: { label: "PC cases", detail: "House your hardware", icon: Box },
  Networking: { label: "Networking", detail: "Stay connected", icon: Wifi },
  Monitor: {
    label: "Monitors",
    detail: "Your view of the game",
    icon: Monitor,
  },
  Keyboard: { label: "Keyboards", detail: "Find your feel", icon: Keyboard },
  Mouse: { label: "Mice", detail: "Dial in your aim", icon: Mouse },
  Headset: { label: "Headsets", detail: "Hear the details", icon: Headphones },
  Peripherals: {
    label: "Peripherals",
    detail: "Complete your setup",
    icon: Gamepad2,
  },
  Controller: { label: "Controllers", detail: "Play your way", icon: Gamepad2 },
  Console: { label: "Consoles", detail: "Console gaming", icon: Gamepad2 },
  "Prebuilt PCs": {
    label: "Prebuilt PCs",
    detail: "Complete systems",
    icon: Monitor,
  },
};
const coreOrder = ["GPU", "CPU", "Motherboard", "RAM", "Storage"];
const supportOrder = [
  "Case",
  "Cooler",
  "Cooling",
  "Power Supply",
  "PSU",
  "Networking",
  "OS",
  "RGB",
  "CaptureCard",
  "SoundCard",
];
const gearOrder = [
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headset",
  "Peripherals",
  "Mousepad",
  "Speakers",
  "Microphone",
  "Webcam",
  "StreamingGear",
  "GamingChair",
  "GamingDesk",
  "Cables",
  "ExternalStorage",
];
const playOrder = [
  "Console",
  "Consoles",
  "Controller",
  "VR",
  "Games",
  "PCGames",
  "ConsoleGames",
  "VRGames",
  "GamingLaptop",
  "Prebuilt PCs",
];

export function categoryHref(category: string) {
  return `/products?category=${encodeURIComponent(category)}`;
}

export function categoryEntry(category: string): CategoryEntry {
  return {
    category,
    ...(details[category] || {
      label: category.replace(/([a-z])([A-Z])/g, "$1 $2"),
      detail: "Browse this category",
      icon: Package,
    }),
  };
}

/** Categories stay exact: aliases such as PSU/Power Supply remain separate filters. */
export function categoryGroups(
  categories: string[],
  section: "components" | "gear",
): CategoryGroup[] {
  const present = new Set(categories);
  const ordered = (order: string[]) =>
    order.filter((category) => present.has(category)).map(categoryEntry);
  if (section === "components")
    return [
      {
        id: "performance",
        label: "Core performance",
        entries: ordered(coreOrder),
      },
      {
        id: "foundation",
        label: "Build essentials",
        entries: ordered(supportOrder),
      },
    ].filter((group) => group.entries.length > 0);
  const known = new Set([
    ...coreOrder,
    ...supportOrder,
    ...gearOrder,
    ...playOrder,
  ]);
  return [
    { id: "setup", label: "Your gaming setup", entries: ordered(gearOrder) },
    { id: "play", label: "Systems & play", entries: ordered(playOrder) },
    {
      id: "more",
      label: "More to explore",
      entries: categories
        .filter((category) => !known.has(category))
        .sort()
        .map(categoryEntry),
    },
  ].filter((group) => group.entries.length > 0);
}

let cachedCategories: string[] | null = null;
let pendingCategories: Promise<string[]> | null = null;

// Import the transport only after a menu or search field is used. Share the
// public response between desktop menus, the mobile drawer and suggestions.
function loadCategories(): Promise<string[]> {
  if (cachedCategories) return Promise.resolve(cachedCategories);
  if (!pendingCategories)
    pendingCategories = import("@/services/product-service")
      .then(({ ProductService }) => ProductService.categories())
      .then((result) => {
        if (result.error) throw new Error(result.error.message);
        cachedCategories = [...new Set(result.data || [])];
        return cachedCategories;
      })
      .finally(() => {
        pendingCategories = null;
      });
  return pendingCategories;
}

export function useNavigationCategories(enabled: boolean) {
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");
    loadCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);
  return { categories, status, retry };
}
